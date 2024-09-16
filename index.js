const {Client, Collection, Events, GatewayIntentBits, EmbedBuilder, Embed } = require("discord.js");
require("dotenv").config();
const fs = require("node:fs");
const path = require("node:path");
const {update} = require("./data/data");

const client = new Client({intents: [GatewayIntentBits.Guilds]});

client.commands = new Collection();
client.cooldowns = new Collection();



const foldersPath = path.join(__dirname, "commands");
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
  const commandsPath = path.join(foldersPath, folder);
  const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith(".js"));
  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    if ("data" in command && "execute" in command) {
      client.commands.set(command.data.name, command);
    } else {
      console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execite" property.`);
    }
  }
}

const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
	const filePath = path.join(eventsPath, file);
	const event = require(filePath);
	if (event.once) {
		client.once(event.name, (...args) => event.execute(...args));
	} else {
		client.on(event.name, (...args) => event.execute(...args));
	}
}

const main = async () => {
  let runs = await update();
  if (runs) {
    const ch = client.channels.cache.get("1190585680011743357");
    for (const run of runs) {
      const embed = {
        title: `${run.game}`,
        url: run.url,
        author: {
          name: `${run.players.join(", ")}`,
          url: run.url
        },
        description: `**${run.category}**`,
        thumbnail: {
          url: run.thumbUrl
        },
        fields: [
          {
            name: "",
            value: `(${run.values.join(", ")})`,
            inline: true
          },
          {
            name: `${run.place} place`,
            value: `**${run.time}**`,
            inline: true
          },
          {
            name: "",
            value: `*${run.comment}*`,
            inline: false
          }
        ]
      }
      ch.send({embeds: [embed]});
    }
  }
}

main();
setInterval(main, 9000000);

if (process.env.NODE_ENV === "dev") {
  client.login(process.env.DEV_TOKEN);
} else {
  client.login(process.env.TOKEN);
}
