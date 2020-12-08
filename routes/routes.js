const UserModel = require("../models/user.model");
const TokenModel = require("../models/verification.model");
const InfractionModel = require("../models/infraction.model");
const ChallengeModel = require("../models/challenge.model");
const SubmissionModel = require("../models/submission.model");
const EventModel = require("../models/event.model");
const mailer = require("nodemailer");
const smtp = require("nodemailer-smtp-transport");
const crypto = require("crypto");
const { issueToken } = require("../scripts/tokenMethods");
const mongoose = require("mongoose");
const axios = require("axios");

module.exports = (app, passport) => {
  require('dotenv').config();
  // -- PUBLIC --
  // Home Page
  app.get("/", (req, res) => res.render("home", {
    isAuth: req.isAuthenticated(),
    user: req.user
  }));

  // Terms
  app.get("/terms", (req, res) => res.render("terms", {
    isAuth: req.isAuthenticated(),
    user: req.user
  }));

  // About Page
  app.get("/about", (req, res) => {
    res.render("about", {
      isAuth: req.isAuthenticated(),
      user: req.user,
    });
  });

  // Profile
  app.get("/profile/:username?", (req, res) => {
    let username = req.params.username || (req.user ? req.user.username : null) || null;
    UserModel.findOne({ username: username }, async (err, doc) => {
      if (err) {
        res.render("404", {
          isAuth: req.isAuthenticated(),
          user: req.user,
          profile: null
        });
        throw err;
      }
      if (!doc)
        res.render("404", {
          isAuth: req.isAuthenticated(),
          user: req.user,
          profile: null
        });
      else {
        let infs = await InfractionModel.find({ user_id: doc._id });
        let objArr = [];
        for await (const i of infs) {
          let baseObj = {};
          Object.keys(i._doc).forEach(k => {
            baseObj[k] = i._doc[k];
          });
          baseObj["mod"] = await UserModel.findOne({ _id: i.moderator_id});

          objArr.push(baseObj);
        }
        res.render("profile", {
          isAuth: req.isAuthenticated(),
          user: req.user,
          profile: doc,
          isRoot: req.isAuthenticated() ? doc.username === req.user.username : false,
          infs: objArr
        });
      }
    });
  });

  app.get("/team", (req, res) => {
    if (!req.user) return res.redirect("/403");
    UserModel.findOne({ token: req.user.token }, async (err, user) => {
      if (!user) return res.redirect("/403");
      let members = [{
        username: user.username,
        avatar: user.avatar,
        name: user.name
      }];
      if (user.team) {
        await UserModel.find({ team: user.team }, async (allerr, tmembers) => {
          tmembers.forEach(m => {
            if (m._id.toString() !== user._id.toString()) members.push({
              username: m.username,
              avatar: m.avatar,
              name: m.name
            })
          });
        });
      }

      res.render("team", {
        isAuth: req.isAuthenticated(),
        user: req.user,
        team_members: members,
        tried: !!req.query.none
      });
    });
  });

  app.get("/github", (req, res) => {
    if (!req.user) return res.redirect("/403");
    UserModel.findOne({token: req.user.token}, async (err, user) => {
      if (!user) return res.redirect("/403");

      let repos = null;
      let ghuser = null;
      let authErr = false;
      if (user.github) {
        const { Octokit } = require("@octokit/rest");

        const octokit = new Octokit({
          auth: user.github,
        });

        try {
          const { data: r } = await octokit.repos.listForAuthenticatedUser();
          repos = r;
          const { data: u } = await octokit.users.getAuthenticated();
          ghuser = u;
        } catch (e) {
          authErr = "Your GitHub token appears to have been revoked, you'll need to reauthorize";
          user.github = null;
          user.save();
        }
      }

      res.render("github", {
        isAuth: req.isAuthenticated(),
        user: req.user,
        error: !!req.query.error,
        repos,
        ghuser,
        authErr
      });
    });
  });

  app.get("/api/github/auth", (req, res) => {
    if (!req.user) return res.redirect("/403");
    UserModel.findOne({token: req.user.token}, async (err, user) => {
      if (!user) return res.redirect("/403");
      axios.post('https://github.com/login/oauth/access_token', {
        client_id: process.env.GH_CLIENT_ID,
        client_secret: process.env.GH_CLIENT_SECRET,
        code: req.query.code,
        state: 1
      }, { headers: {'Accept': 'application/json'} })
          .then(function (r) {
            if (!r.data.access_token) return res.status(503).redirect("/github?error=true");
            user.github = r.data.access_token;
            user.save();
            res.status(200).redirect("/github");
          })
          .catch(function (error) {
            res.status(503).redirect("/github?error=true");
          });
    });
  });

  app.get("/connectdiscord", (req, res) => {
    if (!req.user) return res.redirect("/403");
    UserModel.findOne({token: req.user.token}, async (err, user) => {
      if (!user) return res.redirect("/403");

      let discordInfo = {
        name: "",
        avatar: ""
      };
      let authErr = "";
      if (user.discord_token) {
        await axios.get("https://discordapp.com/api/users/@me", {
          headers: {
            authorization: `Bearer ${user.discord_token}`
          }
        }).then(({ data }) => {
          discordInfo.name = `${data.username}#${data.discriminator}`;
          discordInfo.avatar = `https://cdn.discordapp.com/avatars/${data.id}/${data.avatar}.png`;
        }).catch(() => {
          authErr = "There was an error connecting to your Discord account, please try re-authorizing!";
          user.discord_token = "";
          user.save();
        });
      }

      res.render("discord", {
        isAuth: req.isAuthenticated(),
        user: req.user,
        error: !!req.query.error,
        authErr,
        discordInfo
      });
    });
  });

  app.get("/api/discord/auth", (req, res) => {
    if (!req.user) return res.redirect("/403");
    UserModel.findOne({token: req.user.token}, async (err, user) => {
      if (!user) return res.redirect("/403");
      let postData = {
        client_id: process.env.DISCORD_AUTH_ID,
        client_secret: process.env.DISCORD_AUTH_SECRET,
        grant_type: 'authorization_code',
        redirect_uri: 'https://nchack.org/api/discord/auth',
        code: req.query.code,
        scope: 'identify,guilds.json',
      };
      axios.post('https://discordapp.com/api/oauth2/token', new URLSearchParams(postData), { headers: {'Content-Type': 'application/x-www-form-urlencoded'} })
          .then(async function (r) {
            if (!r.data.access_token) return res.status(503).redirect("/connectdiscord?error=true");
            user.discord_token = r.data.access_token;
            let { data: udata } = await axios.get("https://discordapp.com/api/users/@me", {
              headers: {
                authorization: `Bearer ${user.discord_token}`
              }
            });
            console.log(udata);
            user.discord_id = udata.id;
            user.save();
            let addReq = await axios.put(`https://discordapp.com/api/v7/guilds/726440966327631933/members/${udata.id}`, {
              access_token: user.discord_token,
              roles: ["738814276504125461", "737326939546583052"]
            }, {
              headers: {
                'Authorization': `Bot ${process.env.DISCORD_AUTH_TOKEN}`
              }
            });
            if (addReq.status === 204) {
              axios.post(`https://nchack.org:8443/user/${user.discord_id}/connect`, {}, { headers: {
                "Authorization": process.env.DISCORD_AUTH_TOKEN
                } }).then(a => console.log(a));
            }
            axios.post(`https://nchack.org:8443/user/${user.discord_id}/roles`, {}, { headers: {
                "Authorization": process.env.DISCORD_AUTH_TOKEN,
                flags: JSON.stringify(user.flags)
              } });
            res.status(200).redirect("/connectdiscord");
          })
          .catch(function (error) {
            console.log(error);
            res.status(503).redirect("/connectdiscord?error=true");
          });
    });
  });

  app.post("/api/team/create", (req, res) => {
    if (!req.user) return res.redirect("/403");
    UserModel.findOne({ token: req.user.token }, async (err, user) => {
      if (!user || user.team) return res.redirect("/403");
      let team = await new UserModel();
      team.name = `team${team._id}`;
      team.username = `team${team._id}`;
      team.password = 1;
      team.flags.team = true;
      team.save();
      user.team = team._id;
      user.save();
      res.status(200).redirect("/team");
    });
  });

  app.post("/api/team/join", (req, res) => {
    if (!req.user) return res.redirect("/403");
    if (!req.body.code) return res.redirect("/400");
    UserModel.findOne({ token: req.user.token }, async (err, user) => {
      if (!user || user.team) return res.redirect("/403");
      let team = await UserModel.findOne({ _id: req.body.code });
      if (!team) res.status(404).redirect("/team?none=true");
      user.team = team._id;
      console.log(user);
      user.save();
      res.status(200).redirect("/team");
    });
  });

  app.post("/api/team/leave", (req, res) => {
    if (!req.user) return res.redirect("/403");
    UserModel.findOne({ token: req.user.token }, async (err, user) => {
      if (!user || !user.team) return res.redirect("/403");
      let oldTeam = user.team;
      user.team = null;
      await user.save();
      await UserModel.find({ team: oldTeam }, async (allerr, tmembers) => {
        if (tmembers.length === 0) await UserModel.deleteOne({ _id: oldTeam });
      });

      res.status(200).redirect("/team");
    });
  });

  app.post("/api/github/disconnect", (req, res) => {
    if (!req.user) return res.redirect("/403");
    UserModel.findOne({ token: req.user.token }, async (err, user) => {
      if (!user || !user.github) return res.redirect("/403");
      user.github = null;
      await user.save();

      res.status(200).redirect("/github");
    });
  });

  app.post("/api/discord/disconnect", (req, res) => {
    if (!req.user) return res.redirect("/403");
    UserModel.findOne({ token: req.user.token }, async (err, user) => {
      if (!user || !user.discord_token) return res.redirect("/403");
      axios.post(`https://nchack.org:8443/user/${user.discord_id}/disconnect`, {}, { headers: {
          "Authorization": process.env.DISCORD_AUTH_TOKEN
        } });
      user.discord_token = null;
      user.discord_id = null;
      await user.save();
      res.status(200).redirect("/connectdiscord");
    });
  });

  // -- UNVERIFIED USERS ONLY --
  // Verification Landing, Shows Instructions
  app.get("/verification", (req, res) => {
    isVerified(req, res, true, function() {
      res.render("verification", {
        isAuth: req.isAuthenticated(),
        user: req.user,
        resent: !!req.query.resent
      })
    });
  });

  // -- GUESTS ONLY --
  // Login
  app.get("/login", (req, res) => {
    isLoggedIn(req, res, true, function() {
      res.render("login", {
        message: req.flash("loginMessage"),
        isAuth: req.isAuthenticated(),
        user: req.user
      })
    });
  });

  // Signup
  app.get("/signup", (req, res) => {
    isLoggedIn(req, res, true, function() {
      res.render("signup", {
        isAuth: req.isAuthenticated(),
        user: req.user
      })
    });
  });

  app.get("/forgot", (req, res) => {
    isLoggedIn(req, res, true, function() {
      res.render("forgot", {
        message: req.query.no ? "No user was found with this email" : "",
        sent: {
          yes: !!req.query.sent,
          email: req.query.sent
        },
        isAuth: req.isAuthenticated(),
        user: req.user
      })
    });
  });

  app.get("/announcements", async (req, res) => {
    InfractionModel.find({ type: "announcement" }, async (err, infs) => {
      let objArr = [];
      for await (const i of infs) {
        let baseObj = {};
        Object.keys(i._doc).forEach(k => {
          baseObj[k] = i._doc[k];
        });
        if (!i.anonymous) {
          let {name, username, avatar, flags} = await UserModel.findOne({_id: i.moderator_id});
          baseObj["mod"] = {name, username, avatar, flags};
        } else delete baseObj.moderator_id;

        objArr.push(baseObj);
      }
      res.render("announcements", {
        isAuth: req.isAuthenticated(),
        user: req.user,
        announcements: objArr
      })
    });
  });

  app.get("/schedule", async (req, res) => {
    EventModel.find({}, async (err, edocs) => {
      ChallengeModel.find({}, async (err, cdocs) => {
        let docs = edocs.concat(cdocs);
        let objArr = [];
        for await (const e of docs) {
          let baseObj = {};
          Object.keys(e._doc).forEach(k => {
            baseObj[k] = e._doc[k];
          });
          if (!e.anonymous) {
            let {name, username, avatar, flags} = await UserModel.findOne({_id: e.creator_id});
            baseObj["creator"] = {name, username, avatar, flags};
          } else delete baseObj.creator_id;

          objArr.push(baseObj);
        }
        res.render("schedule", {
          isAuth: req.isAuthenticated(),
          user: req.user,
          events: objArr,
          _: require("underscore")
        })
      });
    });
  });

  // Message Viewing
  app.get("/message/:message", async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.message) || !req.user) return res.redirect("/400");
    InfractionModel.findOne({ _id: req.params.message }, async (err, i) => {
      if (err) throw err;
      if (!i) return res.redirect("/404");
      if (i.type !== "announcement") UserModel.findOne({ token: req.user.token }, async (err, user) => {
        if (!user) return res.redirect("/403");
        if (i.user_id.toString() !== user._id.toString() && !user.flags.admin && !user.flags.organizer) return res.redirect("/403");
      });
      let baseObj = {};

      Object.keys(i._doc).forEach(k => {
        baseObj[k] = i._doc[k];
      });
      if (!i.anonymous) {
        let {name, username, avatar, flags} = await UserModel.findOne({_id: i.moderator_id});
        baseObj["mod"] = {name, username, avatar, flags};
      } else delete baseObj.moderator_id;

      if (i.user_id) {
        let {name, username, avatar, flags} = await UserModel.findOne({_id: i.user_id});
        baseObj["user"] = {name, username, avatar, flags};
      }

      res.render("message", {
        isAuth: req.isAuthenticated(),
        user: req.user,
        message: baseObj
      });
    });
  });

  // Challenge Viewing
  app.get("/challenge/:challenge", async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.challenge)) return res.redirect("/400");
    ChallengeModel.findOne({ _id: req.params.challenge }, async (err, i) => {
      if (err) throw err;
      if (!i) return res.redirect("/404");
      if (i.hidden && (!req.user || (!req.user.flags.admin && !req.user.flags.organizer))) return res.redirect("/403");
      let baseObj = {};

      Object.keys(i._doc).forEach(k => {
        baseObj[k] = i._doc[k];
      });
      if (!i.anonymous) {
        let {name, username, avatar, flags} = await UserModel.findOne({_id: i.creator_id});
        baseObj["creator"] = {name, username, avatar, flags};
      } else delete baseObj.creator_id;

      let repos = [];
      let preSub = null;
      if (req.user && req.user.github) {
        const { Octokit } = require("@octokit/rest");

        const octokit = new Octokit({
          auth: req.user.github,
        });

        try {
          const { data: r } = await octokit.repos.listForAuthenticatedUser();
          repos = r;
        } catch (e) {
          let user = await UserModel.findOne({ _id: req.user._id });
          user.github = null;
          user.save();
        }
      }

      if (req.user) {
        let submission = await SubmissionModel.findOne({ $or: [{ author: req.user._id }, { team: req.user.team }], challenge: req.params.challenge });
        if (submission) preSub = submission;
      }

      let submissions = await SubmissionModel.find({ challenge: i._id });
      let subArr = [];
      for await (const e of submissions) {
        let baseObj = {};
        Object.keys(e._doc).forEach(k => {
          baseObj[k] = e._doc[k];
        });
        subArr.push(baseObj);
      }

      res.render("challenge", {
        isAuth: req.isAuthenticated(),
        user: req.user,
        challenge: baseObj,
        repos,
        preSub,
        submissions: subArr
      });
    });
  });

  // Challenge Judging Panel
  app.get("/challenge/:challenge/judging", async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.challenge)) return res.redirect("/400");
    ChallengeModel.findOne({ _id: req.params.challenge }, async (err, i) => {
      if (err) throw err;
      if (!i) return res.redirect("/404");
      if (!req.user || (!req.user.flags.organizer && !req.user.flags.admin && !i.judges.includes(req.user._id))) return res.redirect("/403");
      let baseObj = {};

      Object.keys(i._doc).forEach(k => {
        baseObj[k] = i._doc[k];
      });

      let judges = await UserModel.find({ "flags.judge": true });
      let judgeObj = judges.map(j => [{ name: j.name, username: j.username, _id: j._id }]);

        let submissions = await SubmissionModel.find({ challenge: i._id });
        let subArr = [];
        for await (const e of submissions) {
          let baseObj = {};
          Object.keys(e._doc).forEach(k => {
            baseObj[k] = e._doc[k];
          });
          subArr.push(baseObj);
        }

      res.render("judging", {
        isAuth: req.isAuthenticated(),
        user: req.user,
        challenge: baseObj,
        judges: judgeObj,
        submissions: subArr
      });
    });
  });

  app.post("/challenge/:challenge/enter", async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.challenge)) return res.redirect("/400");
    ChallengeModel.findOne({ _id: req.params.challenge }, async (err, i) => {
      if (err) throw err;
      if (!i) return res.redirect("/404");
      let s = await new SubmissionModel({
        submittedAt: new Date(),
        github: req.body.repo,
        description: req.body.desc,
        author: req.user._id,
        team: req.user.team,
        challenge: i._id
      }).save();

        const { Octokit } = require("@octokit/rest");

        const octokit = new Octokit();

        let [owner, repo] = req.body.repo.split("/");
        const { data: r } = await octokit.repos.get({
            owner,
            repo
        });
        if (!r) return res.redirect("/400");

        if (new Date(r.created_at).getTime() < i.start) {
            s.disqualified = true;
            s.notes = "Automatically disqualified due to repository creation date.";
            s.save();
        }

      if (req.user.discord_id) axios.post(`https://nchack.org:8443/user/${req.user.discord_id}/participant`, {}, { headers: {
          "Authorization": process.env.DISCORD_AUTH_TOKEN
        } });

      res.redirect(`/challenge/${i._id}`);
    });
  });

  app.get("/challenge/:challenge/publish", async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.challenge)) return res.redirect("/400");
    ChallengeModel.findOne({ _id: req.params.challenge }, async (err, i) => {
      if (err) throw err;
      if (!i) return res.redirect("/404");
      if (!req.user || (!req.user.flags.organizer && !req.user.flags.admin)) return res.redirect("/403");
      let submissions = await SubmissionModel.find({ challenge: i._id });
      let subArr = [];
      for await (const e of submissions) {
        let baseObj = {};
        Object.keys(e._doc).forEach(k => {
          baseObj[k] = e._doc[k];
        });
        subArr.push(baseObj);
      }

      if (subArr.filter(s => s.judging.length !== i.criteria.length && !s.disqualified).length !== 0) return res.redirect("/400");

      let topScore = i.criteria.map(j => j.worth).reduce((p, n) => p + n);
      function pct (s) {
        let score = s.judging.length !== i.criteria.length ? 0 : s.judging.map(j => j.score).reduce((p, n) => p + n);
        return score/topScore;
      };
      let top3 = subArr.filter(s => !s.disqualified).sort((a, b) => pct(b) - pct(a)).splice(0, 3);
      for await (let s of top3) {
        if (s.team) {
          let teamMembers = await UserModel.find({ team: s.team });
          teamMembers.forEach(m => {
            m.flags.winner = true;
            m.save();
            if (m.discord_id) axios.post(`https://nchack.org:8443/user/${m.discord_id}/roles`, {}, { headers: {
                "Authorization": process.env.DISCORD_AUTH_TOKEN,
                flags: JSON.stringify(m.flags)
              } });
          })
        } else {
          let user = await UserModel.findOne({ _id: s.author });
          if (user) {
            user.save();
            if (user.discord_id) axios.post(`https://nchack.org:8443/user/${user.discord_id}/roles`, {}, { headers: {
                "Authorization": process.env.DISCORD_AUTH_TOKEN,
                flags: JSON.stringify(user.flags)
              } });
          }
        }
      }


      i.resultsPublished = true;
      i.save();

      res.redirect(`/challenge/${req.params.challenge}`);
    });
  });

  app.post("/challenge/:challenge/criteria", async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.challenge)) return res.redirect("/400");
    ChallengeModel.findOne({ _id: req.params.challenge }, async (err, i) => {
      if (err) throw err;
      if (!i) return res.redirect("/404");
      if (!req.user || (!req.user.flags.organizer && !req.user.flags.admin && !i.judges.includes(req.user._id))) return res.redirect("/403");
      let criteriaArr = [];
      if (req.body.criteria) {
        if (typeof req.body.criteria.criteria === "string") {
          criteriaArr.push({
            name: req.body.criteria.criteria,
            worth: req.body.criteria.worth
          });
        } else for (let i = 0; i < req.body.criteria.criteria.length; i++) {
          criteriaArr.push({
            name: req.body.criteria.criteria[i],
            worth: req.body.criteria.worth[i]
          })
        }
      }

      i.criteria = criteriaArr;
      i.save();

      res.redirect(`/challenge/${req.params.challenge}/judging`);
    });
  });

  app.post("/challenge/:challenge/submission/:submission/judge", async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.challenge) || !mongoose.Types.ObjectId.isValid(req.params.submission)) return res.redirect("/400");
    ChallengeModel.findOne({ _id: req.params.challenge }, async (err, i) => {
      if (err) throw err;
      if (!i) return res.redirect("/404");
      if (!req.user || (!req.user.flags.organizer && !req.user.flags.admin && !i.judges.includes(req.user._id))) return res.redirect("/403");
      SubmissionModel.findOne({ _id: req.params.submission }, async (e, s) => {
        if (e) throw e;
        if (!s) return res.redirect("/404");
        let criteriaArr = [];
        if (req.body.judging) {
          if (typeof req.body.judging.criteria === "string") {
            criteriaArr.push({
              name: req.body.judging.criteria,
              score: req.body.judging.score
            });
          } else for (let i = 0; i < req.body.judging.criteria.length; i++) {
            criteriaArr.push({
              name: req.body.judging.criteria[i],
              score: req.body.judging.score[i]
            })
          }
        }

        s.judging = criteriaArr;
        s.notes = req.body.notes || "";
        s.disqualified = !!req.body.dq;
        s.save();

        res.redirect(`/challenge/${req.params.challenge}/judging`);
      });
    });
  });

  // -- API --
  // Login
  app.post("/api/login", passport.authenticate("local-login", { failureRedirect: "/login", failureFlash: true }), function (req, res, next) {
    if (req.user) {
      issueToken(req.user, function (err, token) {
        if (err) return next();
        res.cookie('remember_me', token, {path: '/', httpOnly: true, maxAge: 604800000});
        return next();
      });
    }
  }, (req, res) => {
    res.redirect("/profile");
  });
  /*app.post("/api/login", passport.authenticate("local-login", {
    successRedirect: "/profile", // redirect to the secure profile section
    failureRedirect: "/login", // redirect back to the login page if there is an error
    failureFlash: true // allow flash messages
  }));*/

  // Signup
  app.post("/api/signup", passport.authenticate("local-signup", {
    successRedirect: "/verification",
    failureRedirect: "/signup"
  }));

  // Logout
  app.get("/logout", (req, res) => {
    req.logout();
    res.clearCookie("remember_me");
    res.redirect("/");
  });

  // Check if a username/email is available
  app.get("/api/check-user-availability/:type/:search", (req, res) => {
    if (!["email", "username"].includes(req.params.type)) return res.redirect("/400");
    let criteria = {};
    criteria[req.params.type] = req.params.search;
    UserModel.findOne(criteria, (err, doc) => {
      if (err) throw err;
      return res.sendStatus(!doc ? 404 : 303);
    });
  });

  // Check user notifications
  app.get("/api/fetch-notifications", (req, res) => {
    if (!req.user) return res.redirect("/400");
    UserModel.findOne({ token: req.user.token }, (err, doc) => {
      if (err) throw err;
      InfractionModel.find({ $or: [{user_id: req.user._id}, { type: "announcement" }] }, async (err, infs) => {
        if (err) throw err;
        let objArr = [];
        for await (const i of infs) {
          let baseObj = {};
          Object.keys(i._doc).forEach(k => {
            baseObj[k] = i._doc[k];
          });
          if (!i.anonymous) {
            let {name, username, avatar} = await UserModel.findOne({_id: i.moderator_id});
            baseObj["mod"] = {name, username, avatar};
          } else delete baseObj.moderator_id;

          if (i.type === "announcement" && doc.noticed_announcements.includes(i._id)) baseObj.noticed = true;

          objArr.push(baseObj);
        }
        return res.status(200).json({body:objArr});
      });
    });
  });

  // Clear user notifications
  app.post("/api/clear-notifications", (req, res) => {
    if (!req.user) return res.redirect("/400");
    UserModel.findOne({ token: req.user.token }, async (err, doc) => {
      if (err) throw err;
      await InfractionModel.update({user_id: req.user._id, noticed: false}, { noticed: true });
      let unreadAnnouncements = await InfractionModel.find({type: "announcement", _id: { $nin: doc.noticed_announcements }});
      unreadAnnouncements.forEach(d => doc.noticed_announcements.push(d._id));
      doc.save();
      return res.sendStatus(200);
    });
  });

  // Handle a forgotten password
  app.post("/api/forgot", (req, res) => {
    UserModel.findOne({email: req.body.email}, (err, user) => {
      if (err) throw err;
      if (!user) return res.redirect("/forgot?no=true");
      let raw = crypto.randomBytes(16).toString("hex");
      user.password = user.generateHash(raw);
      user.save();
      const transport = mailer.createTransport(
          smtp({
            host: 'smtp.sendgrid.net',
            port: 465,
            auth: {
              user: "apikey",
              pass: process.env.SENDGRID_KEY,
            },
          })
      );

      let message = {
        from: '"NC Hack" no-reply@nchack.org',
        to: `"${user.name}" ${user.email}`,
        subject: "Your account password was reset",
        text: "**********************************\n" +
            "Account Password Reset\n" +
            "**********************************\n" +
            "\n" +
            `You can now log in to your account with this password: ${raw}\n\n` +
            "Do not reply to this email. Replies sent to this address are not monitored. If you did not request this password reset, contact team@nchack.org immediately.",
        html: "<div width=\"95%\" style=\"background:#E6E6E6;padding:10px;border-radius:10px;\">\n" +
            "<img class=\"max-width\" border=\"0\" style=\"border-radius:10px;display:block; color:#000000; text-decoration:none; font-family:Helvetica, arial, sans-serif; font-size:16px; max-width:100% !important; width:100%; height:auto !important;\" width=\"600\" alt=\"\" data-proportionally-constrained=\"true\" data-responsive=\"true\" src=\"http://cdn.mcauto-images-production.sendgrid.net/9df10bd9f9c67c4c/24163e16-60d1-4bdb-b0a6-35af17c4217f/944x156.png\">\n" +
            `        <h1 style=\"text-align: center\"><span style=\"color: #0072ff\">Your NC Hack password was reset</span></h1><div style=\"font-family: inherit; text-align: inherit\">You can now <a href="https://nchack.org/login">log in</a> to your account using this password: <strong>${raw}</strong></div>\n` +
            "                 <br>\n" +
            "                <div style=\"font-family: inherit; text-align: inherit\"><em>Do not reply to this email. Replies sent to this address are not monitored. If you did not request this password reset, contact </em><a href=\"mailto:team@nchack.org?subject=&amp;body=\"><em>team@nchack.org</em></a><em> immediately.</em></div>\n" +
            "                </div>"
      };

      transport.sendMail(message, (err) => {
        if (err) console.log(err);
      });
      res.status(200).redirect(`/forgot?sent=${user.email}`);
    });
  });

  // Profile Editing
  app.post("/api/profile/edit", async (req, res) => {
    UserModel.findOne({ token: req.user.token }, async (err, user) => {
      if (user._id.toString() !== req.body.uid.toString() && !user.flags.admin && !user.flags.organizer) return res.redirect("/403");
    });
    UserModel.findOne({ _id: req.body.uid }, async (err, user) => {
      if (err) throw new Error(err);
      if (!user) return res.redirect("/400");
      user.name = req.body.name;
      user.username = req.body.username;
      user.bio = req.body.bio;
      user.avatar = req.body.avatar;
      if (req.body.password) {
        user.password = user.generateHash(req.body.password);
      }
      if (user.email !== req.body.email) {
        user.email = req.body.email;
        if (!req.body['email-verification-exempt']) {
          user.emailValidated = false;
          const transport = mailer.createTransport(
              smtp({
                host: 'smtp.sendgrid.net',
                port: 465,
                auth: {
                  user: "apikey",
                  pass: process.env.SENDGRID_KEY,
                },
              })
          );

          const {token} = await new TokenModel({
            _userId: user._id,
            token: crypto.randomBytes(16).toString('hex'),
            createdAt: Date.now(),
            type: "verify"
          }).save();
          let link = `https://nchack.org/api/verify/${token}`;

          let message = {
            from: '"NC Hack" no-reply@nchack.org',
            to: `"${user.name}" ${user.email}`,
            subject: "Verify your new email!",
            text: "**********************************\n" +
                "Your NC Hack email was changed\n" +
                "**********************************\n" +
                "\n" +
                `Use this link to verify your new email: ${link}\n\n` +
                "Do not reply to this email. Replies sent to this address are not monitored. Contact team@nchack.org if you need assistance.",
            html: "<div width=\"95%\" style=\"background:#E6E6E6;padding:10px;border-radius:10px;\">\n" +
                "<img class=\"max-width\" border=\"0\" style=\"border-radius:10px;display:block; color:#000000; text-decoration:none; font-family:Helvetica, arial, sans-serif; font-size:16px; max-width:100% !important; width:100%; height:auto !important;\" width=\"600\" alt=\"\" data-proportionally-constrained=\"true\" data-responsive=\"true\" src=\"http://cdn.mcauto-images-production.sendgrid.net/9df10bd9f9c67c4c/24163e16-60d1-4bdb-b0a6-35af17c4217f/944x156.png\">\n" +
                `        <h1 style=\"text-align: center\"><span style=\"color: #0072ff\">Your NC Hack email was changed!</span></h1><div style=\"font-family: inherit; text-align: inherit\">You need to verify your new email. Click the button below to do that, or if that doesn't work use this link: ${link}</div>\n` +
                "                 <br>\n" +
                `                 <a href=\"${link}\" style=\"background-color:#0072ff;border-radius:9px;border:0; color:#ffffff; display:inline-block; font-size:14px; font-weight:normal; letter-spacing:0px; line-height:normal; padding:12px 18px 12px 18px; text-align:center; text-decoration:none; border-style:solid;\" target=\"_blank\">Verify Email</a>\n` +
                "                 <br>\n" +
                "                <div style=\"font-family: inherit; text-align: inherit\"><em>Do not reply to this email. Replies sent to this address are not monitored. Contact </em><a href=\"mailto:team@nchack.org?subject=&amp;body=\"><em>team@nchack.org</em></a><em> if you need assistance.</em></div>\n" +
                "                </div>"
          };

          transport.sendMail(message, (err, info) => {
            if (err) console.log(err);
          });
        }
      } else if (req.body['email-verification-exempt']) user.emailValidated = true;

      if (req.user.flags.admin || req.user.flags.organizer) {
        let selected = Object.keys(req.body).filter(k => k.startsWith("form-flag"));
        for await (let flag of Object.keys(user.flags).filter(f => !["winner", "team"].includes(f))) {
          if (flag === "admin" && !req.user.flags.admin) continue;
          user.flags[flag] = selected.includes(`form-flag-${flag}`);
        }
      }

      user.save();
      if (user.discord_id) axios.post(`https://nchack.org:8443/user/${user.discord_id}/roles`, {}, { headers: {
          "Authorization": process.env.DISCORD_AUTH_TOKEN,
          flags: JSON.stringify(user.flags)
        } });
      res.status(200).redirect(`/profile/${user.username}`);
    });
  });

  // Suspension
  app.post("/api/suspend", async (req, res) => {
    UserModel.findOne({ token: req.user.token }, async (err, user) => {
      if (!user.flags.admin && !user.flags.organizer) return res.redirect("/403");
    });
    UserModel.findOne({ _id: req.body.uid }, async (err, user) => {
      if (err) throw new Error(err);
      if (!user) return res.redirect("/400");
      user.flags.suspended = true;
      new InfractionModel({
        created: Date.now(),
        moderator_id: req.user._id,
        user_id: req.body.uid,
        reason: req.body.reason,
        type: "suspend",
        anonymous: !!req.body["form-anonymous"]
      }).save();

      user.save();
      res.status(200).redirect(`/profile/${user.username}`);
    });
  });

  // Unsuspend
  app.post("/api/unsuspend", async (req, res) => {
    UserModel.findOne({ token: req.user.token }, async (err, user) => {
      if (!user.flags.admin && !user.flags.organizer) return res.redirect("/403");
    });
    UserModel.findOne({ _id: req.body.uid }, async (err, user) => {
      if (err) throw new Error(err);
      if (!user) return res.redirect("/400");
      user.flags.suspended = false;
      new InfractionModel({
        created: Date.now(),
        moderator_id: req.user._id,
        user_id: req.body.uid,
        reason: req.body.reason,
        type: "unsuspend"
      }).save();

      user.save();
      res.status(200).redirect(`/profile/${user.username}`);
    });
  });

  //Delete
  app.post("/api/delete", async (req, res) => {
    console.log(req.user, req.body);
    UserModel.findOne({ token: req.user.token }, async (err, user) => {
      if (!user.flags.admin) return res.redirect("/403");
    });
    UserModel.findOne({ _id: req.body.uid }, async (err, user) => {
      if (err) throw new Error(err);
      if (!user) return res.redirect("/400");
      UserModel.deleteOne({ _id: req.body.uid });
      res.status(200).redirect(`/`);
    });
  });

  // Message
  app.post("/api/message", async (req, res) => {
    UserModel.findOne({ token: req.user.token }, async (err, user) => {
      if (!user.flags.admin && !user.flags.organizer) return res.redirect("/403");
    });
    UserModel.findOne({ _id: req.body.uid }, async (err, user) => {
      if (err) throw new Error(err);
      if (!user) return res.redirect("/400");
      new InfractionModel({
        created: Date.now(),
        moderator_id: req.user._id,
        user_id: req.body.uid,
        reason: req.body.reason,
        type: "message",
        anonymous: !!req.body["form-anonymous"]
      }).save();

      user.save();
      res.status(200).redirect(`/profile/${user.username}`);
    });
  });

  // Announcement
  app.post("/api/announce", async (req, res) => {
    UserModel.findOne({ token: req.user.token }, async (err, user) => {
      if (!user.flags.admin && !user.flags.organizer) return res.redirect("/403");
    });

      let announcement = await new InfractionModel({
        created: Date.now(),
        moderator_id: req.user._id,
        reason: req.body.announcement,
        type: "announcement",
        anonymous: !!req.body["form-anonymous"]
      }).save();

      res.status(200).redirect(`/message/${announcement._id}`);
  });

  // Edit Announcement/Message
  app.post("/message/:id", async (req, res) => {
    if (!["put", "delete"].includes(req.body._method)) return res.sendStatus(404);
    UserModel.findOne({ token: req.user.token }, async (err, user) => {
      if (!user.flags.admin && !user.flags.organizer) return res.redirect("/403");
    });
    InfractionModel.findOne({ _id: req.params.id }, async (err, msg) => {
      if (!msg) return res.sendStatus(404);
      switch (req.body._method) {
        case "put":
          msg.reason = req.body.reason;
          await msg.save();
          return res.status(200).redirect(`/message/${msg._id}`);
        case "delete":
          let redirect = msg.type === "announcement" ? "announcements" : "";
          await InfractionModel.remove({ _id: msg._id });
          return res.status(200).redirect(`/${redirect}`);
      }
    });
  });

  // Edit Challenge
  app.post("/challenge/:challenge", async (req, res) => {
    if (!["put", "delete"].includes(req.body._method)) return res.sendStatus(404);
    UserModel.findOne({ token: req.user.token }, async (err, user) => {
      if (!user || (!user.flags.admin && !user.flags.organizer)) return res.redirect("/403");
    });
    ChallengeModel.findOne({ _id: req.params.challenge }, async (err, challenge) => {
      if (!challenge) return res.sendStatus(404);
      switch (req.body._method) {
        case "put":
          challenge.title = req.body.title;
          challenge.short = req.body.short;
          challenge.long = req.body.long;
          challenge.start = req.body.start;
          challenge.end = req.body.end;
          challenge.sponsor.name = req.body.sponsor;
          challenge.sponsor.link = req.body.sponsorlink;
          challenge.hidden = !!req.body["form-hidden"];
          await challenge.save();
          return res.status(200).redirect(`/challenge/${challenge._id}`);
        case "delete":
          await ChallengeModel.remove({ _id: challenge._id });
          return res.status(200).redirect(`/schedule`);
      }
    });
  });

  // Edit Challenge
  app.post("/challenge/:challenge/judges", async (req, res) => {
    UserModel.findOne({ token: req.user.token }, async (err, user) => {
      if (!user || (!user.flags.admin && !user.flags.organizer)) return res.redirect("/403");
    });
    ChallengeModel.findOne({ _id: req.params.challenge }, async (err, challenge) => {
      if (!challenge) return res.sendStatus(404);
      challenge.judges = Object.keys(req.body);
      challenge.save();
      res.redirect("/challenge/" + req.params.challenge + "/judging");
    });
  });

  // Challenge Post
  app.post("/api/challenge", async (req, res) => {
    UserModel.findOne({ token: req.user.token }, async (err, user) => {
      if (!user.flags.admin && !user.flags.organizer) return res.redirect("/403");
    });

    let challenge = await new ChallengeModel({
      created: Date.now(),
      creator_id: req.user._id,
      title: req.body.title,
      short: req.body.short,
      long: req.body.long,
      start: req.body.start,
      end: req.body.end,
      sponsor: {
        name: req.body.sponsor,
        link: req.body.sponsorlink
      },
      anonymous: !!req.body["form-anonymous"]
    }).save();

    res.status(200).redirect(`/challenge/${challenge._id}`);
  });

  // Schedule Post
  app.post("/api/event", async (req, res) => {
    UserModel.findOne({ token: req.user.token }, async (err, user) => {
      if (!user.flags.admin && !user.flags.organizer) return res.redirect("/403");
    });

    await new EventModel({
      created: Date.now(),
      creator_id: req.user._id,
      title: req.body.title,
      description: req.body.description,
      start: req.body.start,
      end: req.body.end,
      anonymous: !!req.body["form-anonymous"]
    }).save();

    res.status(200).redirect(`/schedule`);
  });

  app.post("/event/:event", async (req, res) => {
    if (!["put", "delete"].includes(req.body._method)) return res.sendStatus(404);
    UserModel.findOne({ token: req.user.token }, async (err, user) => {
      if (!user || (!user.flags.admin && !user.flags.organizer)) return res.redirect("/403");
    });
    EventModel.findOne({ _id: req.params.event }, async (err, event) => {
      if (!event) return res.sendStatus(404);
      switch (req.body._method) {
        case "put":
          event.title = req.body.title;
          event.description = req.body.description;
          event.start = req.body.start;
          event.end = req.body.end;
          await event.save();
          return res.status(200).redirect(`/schedule`);
        case "delete":
          await EventModel.remove({ _id: event._id });
          return res.status(200).redirect(`/schedule`);
      }
    });
  });

  // Regenerate a verification token
  app.get("/api/verify/regenerate", async (req, res) => {
    if (!req.user) return res.redirect("/403");
    const { token } = await new TokenModel({_userId: req.user._id, token: crypto.randomBytes(16).toString('hex'), createdAt: Date.now(), type: "verify" }).save();
    let link = `https://nchack.org/api/verify/${token}`;

    const transport = mailer.createTransport(
        smtp({
          host: 'smtp.sendgrid.net',
          port: 465,
          auth: {
            user: "apikey",
            pass: process.env.SENDGRID_KEY,
          },
        })
    );

    let message = {
      from: '"NC Hack" no-reply@nchack.org',
      to: `"${req.user.name}" ${req.user.email}`,
      subject: "Verify your account!",
      text: "**********************************\n" +
          "Thanks for signing up for NC Hack!\n" +
          "**********************************\n" +
          "\n" +
          `There's only one step left, you need to verify your email. Use this link: ${link}\n\n` +
          "Do not reply to this email. Replies sent to this address are not monitored. Contact team@nchack.org if you need assistance.",
      html: "<div width=\"95%\" style=\"background:#E6E6E6;padding:10px;border-radius:10px;\">\n" +
    "<img class=\"max-width\" border=\"0\" style=\"border-radius:10px;display:block; color:#000000; text-decoration:none; font-family:Helvetica, arial, sans-serif; font-size:16px; max-width:100% !important; width:100%; height:auto !important;\" width=\"600\" alt=\"\" data-proportionally-constrained=\"true\" data-responsive=\"true\" src=\"http://cdn.mcauto-images-production.sendgrid.net/9df10bd9f9c67c4c/24163e16-60d1-4bdb-b0a6-35af17c4217f/944x156.png\">\n" +
    `        <h1 style=\"text-align: center\"><span style=\"color: #0072ff\">Thanks for signing up for NC Hack!</span></h1><div style=\"font-family: inherit; text-align: inherit\">There's only one step left, you need to <strong>verify your email</strong>. Click the button below to do that, or if that doesn't work use this link: ${link}</div>\n` +
    "                 <br>\n" +
    `                 <a href=\"${link}\" style=\"background-color:#0072ff;border-radius:9px;border:0; color:#ffffff; display:inline-block; font-size:14px; font-weight:normal; letter-spacing:0px; line-height:normal; padding:12px 18px 12px 18px; text-align:center; text-decoration:none; border-style:solid;\" target=\"_blank\">Verify Email</a>\n` +
    "                 <br>\n" +
    "                <div style=\"font-family: inherit; text-align: inherit\"><em>Do not reply to this email. Replies sent to this address are not monitored. Contact </em><a href=\"mailto:team@nchack.org?subject=&amp;body=\"><em>team@nchack.org</em></a><em> if you need assistance.</em></div>\n" +
    "                </div>"
    };

    transport.sendMail(message, (err) => {
      if (err) console.log(err);
    });
    res.status(200).redirect("/verification?resent=true");
  });

  // Verify from an email link
  app.get("/api/verify/:token", (req, res) => {
    if (!req.params.token) return res.redirect("/400");
    TokenModel.findOne({ token: req.params.token }, (err, token) => {
      if (err) throw err;
      if (!token) return res.status(400).send({ type: 'not-verified', msg: 'We were unable to find a valid token. Your token my have expired.' });
      UserModel.findOne({ _id: token._userId }, (error, doc) => {
        if (error) throw error;
        if (!doc) return res.status(400).send({ msg: 'We were unable to find a user for this token.' });
        if (doc.emailValidated) return res.status(400).send({ type: 'already-verified', msg: 'This user has already been verified.' });

        doc.emailValidated = true;
        doc.save(function (err) {
          if (err) { return res.status(500).send({ msg: err.message }); }
          return res.status(200).redirect("/profile");
        });
      });
    });
    let criteria = {};
    criteria[req.params.type] = req.params.search;

  });

  // 403
  app.get("/403", (req, res) => {
    res.render("403", {
      isAuth: req.isAuthenticated(),
      user: req.user,
    });
  });

  // 400
  app.get("/400", (req, res) => {
    res.render("400", {
      isAuth: req.isAuthenticated(),
      user: req.user,
    });
  });

  // 404
  app.get("*", (req, res) => {
    res.render("404", {
      isAuth: req.isAuthenticated(),
      user: req.user,
    });
  });

};

function isLoggedIn(req, res, reverse, next) {
  // if user is authenticated in the session, carry on
  // if they aren't redirect them to login or 403
  if (req.isAuthenticated()) {
    if (reverse) res.redirect("/403");
    else return next();
  } else {
    if (reverse) return next();
    else return res.redirect("/login");
  }
}

function isVerified (req, res, reverse, next) {
  isLoggedIn(req, res, false, function() {
    if (req.user.emailValidated) {
      if (reverse) res.redirect("/403");
      else return next();
    } else {
      if (reverse) return next();
      else return res.redirect("/verification");
    }
  });
};



