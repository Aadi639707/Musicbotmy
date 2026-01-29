const { 
    Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, 
    ButtonBuilder, ButtonStyle, ActivityType 
} = require("discord.js");
const { Manager } = require("erela.js");
const express = require("express");
require("dotenv").config();

// --- WEB SERVER FOR 24/7 UPTIME ---
const app = express();
app.get("/", (req, res) => res.send("Bot Status: Online & Stable"));
app.listen(process.env.PORT || 7860);

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates,
    ],
});

// --- MUSIC MANAGER (LAVALINK) ---
client.manager = new Manager({
    nodes: [
        {
            host: "lava.link", // High-speed node
            port: 80,
            password: "youshallnotpass",
            secure: false,
        },
    ],
    send(id, payload) {
        const guild = client.guilds.cache.get(id);
        if (guild) guild.shard.send(payload);
    },
})
.on("nodeConnect", node => console.log(`[NODE] Connected to ${node.options.identifier}`))
.on("trackStart", (player, track) => {
    const channel = client.channels.cache.get(player.textChannel);
    
    const playEmbed = new EmbedBuilder()
        .setColor("#5865F2")
        .setAuthor({ name: "Now Playing", iconURL: "https://i.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHJtZzR4ZzR4ZzR4ZzR4ZzR4ZzR4ZzR4ZzR4ZzR4ZzR4JmVwPXYxX2ludGVybmFsX2dpZl9ieV9pZCZjdD1n/3o7TKMGpxxSGBDvxv2/giphy.gif" })
        .setTitle(track.title)
        .setURL(track.uri)
        .setThumbnail(track.thumbnail)
        .addFields(
            { name: "Duration", value: `\`${Math.floor(track.duration / 60000)}m\``, inline: true },
            { name: "Author", value: `\`${track.author}\``, inline: true }
        )
        .setFooter({ text: `Requested by ${track.requester.tag}`, iconURL: track.requester.displayAvatarURL() });

    const buttons = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("pause").setEmoji("⏸️").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("skip").setEmoji("⏭️").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("stop").setEmoji("⏹️").setStyle(ButtonStyle.Danger)
    );

    channel.send({ embeds: [playEmbed], components: [buttons] });
});

// --- WELCOME MESSAGE ON JOIN ---
client.on("guildCreate", (guild) => {
    const channel = guild.channels.cache.find(c => c.type === 0 && c.permissionsFor(guild.members.me).has("SendMessages"));
    if (!channel) return;

    const welcomeEmbed = new EmbedBuilder()
        .setColor("#00FF00")
        .setTitle("Thanks for inviting me! 🎶")
        .setDescription("I am a **High-Performance** Music Bot designed for the best audio experience.\n\n**Quick Start:**\n- Use `!play [song]` to start music.\n- Use `!help` for more info.")
        .setImage("https://img.freepik.com/free-vector/music-event-poster-template-with-abstract-shapes_1361-1316.jpg") // Replace with your own image URL
        .setFooter({ text: "Professional Music System v2.0" });

    const links = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setLabel("Support Server").setURL("https://discord.gg/your-link").setStyle(ButtonStyle.Link),
        new ButtonBuilder().setLabel("Developer").setURL("https://github.com/your-profile").setStyle(ButtonStyle.Link)
    );

    channel.send({ embeds: [welcomeEmbed], components: [links] });
});

// --- COMMANDS ---
client.on("messageCreate", async (message) => {
    if (!message.content.startsWith("!") || message.author.bot) return;
    const args = message.content.slice(1).trim().split(/ +/g);
    const command = args.shift().toLowerCase();

    // Help Command
    if (command === "help") {
        const helpEmbed = new EmbedBuilder()
            .setColor("#FFFFFF")
            .setAuthor({ name: "Music Bot Help Menu", iconURL: client.user.displayAvatarURL() })
            .setDescription("Here are my available commands:")
            .addFields(
                { name: "🎵 Music", value: "`!play`, `!skip`, `!stop`, `!pause`, `!queue`" },
                { name: "🛠️ Utility", value: "`!ping`, `!help`, `!invite`" }
            )
            .setImage("https://i.imgur.com/your-help-image.png"); // Optional Help Image

        return message.reply({ embeds: [helpEmbed] });
    }

    // Play Command
    if (command === "play") {
        const { channel } = message.member.voice;
        if (!channel) return message.reply("❌ You must be in a voice channel!");

        const query = args.join(" ");
        if (!query) return message.reply("❌ Please provide a song name or URL.");

        const res = await client.manager.search(query, message.author);
        const player = client.manager.create({
            guild: message.guild.id,
            voiceChannel: channel.id,
            textChannel: message.channel.id,
        });

        if (player.state !== "CONNECTED") player.connect();
        player.queue.add(res.tracks[0]);

        if (!player.playing && !player.paused && !player.queue.size) player.play();
        return message.reply(`✅ Added to queue: **${res.tracks[0].title}**`);
    }
});

// --- BUTTON INTERACTION LOGIC ---
client.on("interactionCreate", async (i) => {
    if (!i.isButton()) return;
    const player = client.manager.get(i.guildId);
    if (!player) return i.reply({ content: "No music is playing.", ephemeral: true });

    if (i.customId === "pause") {
        player.pause(!player.paused);
        await i.reply({ content: player.paused ? "Paused ⏸️" : "Resumed ▶️", ephemeral: true });
    } else if (i.customId === "skip") {
        player.stop();
        await i.reply({ content: "Skipped ⏭️", ephemeral: true });
    } else if (i.customId === "stop") {
        player.destroy();
        await i.reply({ content: "Playback stopped. Left the channel.", ephemeral: true });
    }
});

client.once("ready", () => {
    client.manager.init(client.user.id);
    client.user.setActivity("!play | High Quality Music", { type: ActivityType.Listening });
    console.log(`[READY] ${client.user.tag} is now online.`);
});

client.on("raw", (d) => client.manager.updateVoiceState(d));
client.login(process.env.TOKEN);
