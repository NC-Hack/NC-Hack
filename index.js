const express = require("express");
const app = express();
const port = process.env.PORT || 8080;
const mongoose = require("mongoose");
const passport = require("passport");
const signale = require('signale');
const flash = require("connect-flash");
const morgan = require("morgan");
var cors = require('cors');
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const session = require("express-session");
const path = require("path");
require('dotenv').config();

// Configuration
mongoose.connect(process.env.MONGO, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});
require("./config/passport.config")(passport);

// Express setup
app.use(morgan("dev"));
app.use(cookieParser());
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(cors());
app.use(bodyParser.json());
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(__dirname + "/public"));
app.use(express.static(__dirname + "/scripts"));



// Passport setup
app.use(session({
  secret: "margherita",
  resave: false,
  saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(passport.authenticate('remember-me'));
app.use(flash());

// Routes
require("./routes/routes")(app, passport);

// Launch server
app.listen(port, () => signale.success(`Server Started on Port ${port}`));

const Discord = require("discord.js");
const client = new Discord.Client();
client.login(process.env.DISCORD_AUTH_TOKEN);
client.on("ready", () => {
  signale.success(`${client.user.tag} Started`);

  global.discord = { client: client };
  global.discord.connect = function(user) {
    client.guilds.cache.get("726440966327631933").members.fetch(user).catch(e => console.log("Could not fetch a member"));
    let member = client.guilds.cache.get("726440966327631933").members.cache.get(user);
    if (member) member.roles.add("737326939546583052", "Connected account");
    return true;
  };
  global.discord.disconnect = function(user) {
    client.guilds.cache.get("726440966327631933").members.fetch(user).catch(e => console.log("Could not fetch a member"));
    let member = client.guilds.cache.get("726440966327631933").members.cache.get(user);
    if (member) member.roles.remove("737326939546583052", "Disconnected account");
    return true;
  };
  global.discord.participant = function(user) {
    client.guilds.cache.get("726440966327631933").members.fetch(user).catch(e => console.log("Could not fetch a member"));
    let member = client.guilds.cache.get("726440966327631933").members.cache.get(user);
    if (member) member.roles.add("737327030022176818", "Participant");
    return true;
  };
  global.discord.roles = function(user, flags) {
    let flagsToRoles = {
      admin: "726441017355534417",
      organizer: "726442065226891296",
      mentor: "727172206236270682",
      host: "726447723196317796",
      judge: "726449337827196929",
      sponsor: "728226322433703986",
      verified: "745002844259614830",
      winner: "746110403733618772"
    };
    client.guilds.cache.get("726440966327631933").members.fetch(user).catch(e => console.log("Could not fetch a member"));
    let member = client.guilds.cache.get("726440966327631933").members.cache.get(ruser);
    if (member) {
      Object.keys(flagsToRoles).forEach(f => {
        if (flagsToRoles[f] && flags[f] && !member.roles.cache.has(flagsToRoles[f])) member.roles.add(flagsToRoles[f]);
        else if (flagsToRoles[f] && !flags[f] && member.roles.cache.has(flagsToRoles[f])) member.roles.remove(flagsToRoles[f]);
      });
    }
    return true;
  };
});

client.on("message", async (message) => {
  if (message.content.toLowerCase().startsWith("?user") || message.content.toLowerCase().startsWith("?profile")) {
    const UserModel = require("./models/user.model.js");
    let args = message.content.split(" ");
    let user;
    if (!args[1]) {
      user = message.author;
    } else {
      let userMatch = args[1].match(/(?:<@!?(\d+)>|(\d+))/);
      if (!userMatch) return message.channel.send(":x: Invalid user");
      function fetchUnknownUser(uid) {
        return client.users.fetch(uid, true)
            .then(() => {
              return client.users.cache.get(uid);
            })
            .catch(() => {
              return client.user.unknown;
            });
      }

      user = client.users.cache.get(userMatch)
          || fetchUnknownUser(userMatch)
          || null;
    }
    if (!user) return message.channel.send(":x: Invalid user");
    let u = await UserModel.findOne({ discord_id: user.id });
    console.log(u);
    if (!u || !u.discord_id) return message.channel.send(":x: No connected NC Hack account");
    let flagsEmoteMap = {
      "winner": "<:winner:746347903177588796>",
      "verified": "<:veriied:746348159059361942>",
      "sponsor": "<:sponsor:746348092802203700>",
      "organizer": "<:organizer:746347827726254100>",
      "mentor": "<:mentor:746348027136180284>",
      "judge": "<:judge:746347974275235973>",
      "host": "<:host:746348217465045072>",
      "admin": "<:admin:746347769316376656>"
    };
    message.channel.send(new Discord.MessageEmbed()
        .setAuthor(`${u.name} (@${u.username})`, u.avatar || "", `https://nchack.org/profile/${u.username}`)
        .setDescription(`${Object.keys(u.flags).filter(f => u.flags[f]).map(f => flagsEmoteMap[f] || "").join(" ")}\n${u.bio}`));
  }
});
