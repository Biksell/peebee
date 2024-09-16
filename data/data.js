const fs = require("fs");

let lastUpdate = 0;
let series = [];
let users = [];
const baseUrl = "https://www.speedrun.com/api/v2";

const sleep = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const toRunTime = (seconds) => {
  let total_secs = parseInt(Math.floor(seconds))
  let ms = parseInt(Math.floor(seconds * 1000 - total_secs * 1000))
  let mins = parseInt(Math.floor(total_secs / 60))
  let hours = parseInt(Math.floor(mins / 60))

  const check = (value) => {
    if (value == 0) {
      return ""
    } else if (value >= 10) {
      return `${value}:`
    }
    return `0${value}:`
  }

  let msStr = `.${ms}`
  if (ms === 0) msStr = ""
  else if (ms < 100) msStr = `.0${ms}`

  const hStr = check(hours);
  const mStr = check(mins - hours*60);
  const sStr = check(total_secs - hours * 60 * 60 - (mins - hours * 60) * 60);
  if (sStr === "") sStr = "00:";

  return (`${hStr}${mStr}${sStr.substring(0, sStr.length - 1)}${msStr}`)

}

const ord_suffix = (i) => {
  let j = i % 10, k = i % 100
  if (j === 1 && k !== 11) return i + "st";
  if (j === 2 && k !== 12) return i + "nd";
  if (j === 3 && k !== 13) return i + "rd";
  return i + "th";
}

const readSettings = async () => {
  fs.readFile("./config.json", "utf8", (err, data) => {
    if (err) {
      console.error(`Error reading file: ${err}`);
    }
    if (data.length == 0) return;
    const config = JSON.parse(data);
    lastUpdate = config.lastUpdate;
    series = config.series;
    users = config.users;
  });
}

const updateSettings = async (key, value) => {
  let newData = {lastUpdate, series, users};
  newData[key] = value;
  fs.writeFile("./config.json", JSON.stringify(newData, null, 2), (err) => {
    if (err) {
      console.error(`Error writing file: ${err}`);
      return;
    }
    readSettings();
  })
}

const handleRuns = async (runs, data) => {
  let fgCategories = data.categories.filter(cat => !cat.isPerLevel);
  fgCategories = fgCategories.map(c => c.id);
  const noLevels = runs.filter(run => fgCategories.includes(run.categoryId))
  let fixedRuns = []
  for (const run of noLevels) {
    const players = data.players.filter(p => run.playerIds.includes(p.id));
    const game = data.games.find(g => g.id === run.gameId);
    const category = data.categories.find(c => c.id === run.categoryId);
    let vals = []
    for (const val of run.valueIds) {
      console.log(val);
      const foundValue = data.values.find(v => v.id === val)
      const varId = foundValue.variableId;
      if (data.variables.find(v => v.id === varId).isSubcategory) {
        vals = vals.concat(foundValue.name);
      }
    }
    const time = toRunTime(run.timeWithLoads ?? run.time);
    const video = run.video;
    if (run.place === 1) rank = "1st"
    const runObj = {
      players: players.map(p => p.name),
      game: game.name,
      category: category.name,
      time: time,
      video: video,
      url: `https://speedrun.com/${game.url}/runs/${run.id}`,
      values: vals,
      place: ord_suffix(run.place),
      comment: run.comment ?? "",
      thumbUrl: `https://www.speedrun.com/static/game/${game.id}/cover.png`
    }
    //const runStr = `New PB by ${players.map(p => p.name).join(", ")} in ${game.name}: ${category.name} (${values.join(", ")}) in ${time}\\n${video}`;
    //console.log(runStr);
    fixedRuns = fixedRuns.concat(runObj);
  }
  return fixedRuns;
}

const getFromSeries = async (seriesUrl) => {
  const now = Math.floor(Date.now() / 1000);
  let newRuns = [];
  try {
    const response = await fetch(`${baseUrl}/GetSeriesSummary?seriesUrl=${seriesUrl}`);
    if (!response.ok) {
      throw new Error(`Response status: ${response.status}`);
    }
    const seriesData = await response.json();
    const gameIds = seriesData.gameList.map(g => g.id);
    for (const gameId of gameIds) {
      const response = await fetch(`${baseUrl}/GetLatestLeaderboard?gameId=${gameId}`);
      console.log(`GET: ${baseUrl}/GetLatestLeaderboard?gameId=${gameId} STATUS: ${response.status}`)
      if (!response.ok) {
        throw new Error(`Response status: ${response.status}`)
      }
      const gameData = await response.json();
      const gameRuns = gameData.runs.filter(run => run.dateVerified > lastUpdate)
      lastUpdate = now;
      await updateSettings("lastUpdate", now);
      if (gameRuns.length > 0) {
        newRuns = newRuns.concat(handleRuns(gameRuns, gameData))
      }
      await sleep(600)
    }
  } catch (error) {
    console.error(error.message);
  }
  return newRuns;
}

const getFromUsers = async (userIds) => {
  const now = Math.floor(Date.now() / 1000);
  let newRuns = [];
  try {
    for (const userId of userIds) {
      const response = await fetch(`${baseUrl}/GetUserLeaderboard?userId=${userId}`);
      const userData = await response.json();
      const userRuns = userData.runs.filter(run => run.dateVerified > lastUpdate);
      lastUpdate = now;
      await updateSettings("lastUpdate", now);
      if (userRuns.length > 0) {
        newRuns = newRuns.concat(handleRuns(userRuns, userData))
      }
    }
  } catch (error) {
    console.error(error.message);
  }
  return newRuns;
}

const addUser = async (userUrl) => {
  console.log(userUrl)
  let userId = undefined
  try {
    const response = await fetch(`${baseUrl}/GetUserSummary?Url=${userUrl}`)
    const userData = await response.json()
    console.log(userData.user)
    userId = userData.user.id;
    if (!userId) return "User not found";
    users = users.concat(userId);
    await updateSettings("users", users);
  } catch (error) {
    return error.message;
  }
  return `User ${userUrl} (${userId}) has been added`
}

const update = async () => {
  await readSettings();
  let total = [];
  const seriesData = await getFromSeries("lego");
  const usersData = await getFromUsers(users);
  total = total.concat(seriesData);
  total = total.concat(usersData);
  console.log(`Last updated at ${new Date(lastUpdate * 1000).toISOString()}`);
  console.log(`${total.length} new runs`);
  return total;
}

module.exports = {update, addUser};
