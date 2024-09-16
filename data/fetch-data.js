const axios = require("axios");
const fs = require("fs");
const head = require("./head");

const baseUrl = "https://www.speedrun.com/api/v2";

const getFromSeries = async (seriesId) => {
  const now = Date.now();
  try {
    const response = await fetch(`${baseUrl}/GetLatestLeaderboard?seriesId=${seriesId}`);
    if (!response.ok) {
      throw new Error(`Response status: ${response.status}`);
    }

    const data = await response.json();
    console.log(data.runs.length);
    const newRuns = data.runs.filter(run => run.dateVerified > now - 10000);
    console.log(newRuns.length);
  } catch (error) {
    console.error(error.message);
  }
  await head.updateSettings("lastUpdate", now);
  return undefined;
}

module.exports = {getFromSeries};
