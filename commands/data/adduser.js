const {SlashCommandBuilder} = require("discord.js");
const {addUser} = require("../../data/data");

module.exports = {
  cooldown: 3,
  data: new SlashCommandBuilder()
    .setName("adduser")
    .setDescription("Adds user to the database")
    .addStringOption(option =>
        option.setName("username")
          .setDescription("SRC Username")
          .setRequired(true)),
  async execute(interaction) {
    const response = await addUser(interaction.options.getString("username"))
    await interaction.reply(response);
  }
}
