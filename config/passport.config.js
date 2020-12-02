const LocalStategy = require("passport-local").Strategy;
const RememberMeStrategy = require("passport-remember-me").Strategy;
const User = require("../models/user.model");
const Infraction = require("../models/infraction.model");
const Token = require("../models/verification.model");
const mailer = require("nodemailer");
const smtp = require("nodemailer-smtp-transport");
const crypto = require("crypto");
const { issueToken, saveRememberMeToken } = require("../scripts/tokenMethods");

module.exports = async passport => {
  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser((id, done) => {
    User.findById(id, (err, user) => done(err, user));
  });

  // Signup
  passport.use("local-signup", new LocalStategy({
    passReqToCallback: true
  }, async (req, username, password, done) => {
    let newUser = new User({
      name: req.body.name,
      username: username,
      email: req.body.email,
      password: String,
    });
    newUser.password = newUser.generateHash(password);

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

    const { token } = await new Token({_userId: newUser._id, token: crypto.randomBytes(16).toString('hex'), createdAt: Date.now(), type: "verify" }).save();
    let link = `https://nchack.org/api/verify/${token}`;

    let message = {
      from: '"NC Hack" no-reply@nchack.org',
      to: `"${newUser.name}" ${newUser.email}`,
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

    transport.sendMail(message, (err, info) => {
      if (err) console.log(err);
    });

    newUser.save(err => {
      if (err) throw err;
      return done(null, newUser);
    });
  }));

  // Login
  passport.use("local-login", new LocalStategy({
    passReqToCallback: true
  }, (req, nameOrEmail, password, done) => {
    User.findOne({$or: [{email: nameOrEmail}, {username: nameOrEmail}]}, async (err, user) => {
      if (err) throw err;
      if (!user || !user.validatePassword(password)) return done(null, false, req.flash("loginMessage", "Incorrect login details provided"));
      if (user.flags.suspended) {
        let infs = await Infraction.find({ user_id: user._id, type: "suspend" });
        let inf = infs[infs.length-1];
        if (inf) {
          if (!inf.noticed) {
            inf.noticed = true;
            inf.save();
          }
          let mod = !inf.anonymous ? await User.findOne({_id: inf.moderator_id}) : null;
          return done(null, false, req.flash("loginMessage", [`<strong>Your account has been suspended${!inf.anonymous ? ` by ${mod.name}` : ""}.</strong>`, `${inf && inf.reason ? `\n${inf.reason}` : ""}`]));
        }
        return done(null, false, req.flash("loginMessage", [`<strong>Your account has been suspended.</strong>`, ""]));
      }
      const token = crypto.randomBytes(64).toString('hex');
      user.token = token;
      user.save();
      return done(null, user);
    });
  }));

  function consumeRememberMeToken(token, fn) {
    User.findOne({ token: token }, (err, user) => {
      if (err) throw err;
      if (!user) return fn(null, false);
      user.token = null;
      user.save();
      return fn(null, user);
    });
  }

  //Remember Me
  passport.use("remember-me", new RememberMeStrategy(
      function(token, done) {
        consumeRememberMeToken(token, function(err, uid) {
          if (err) { return done(err); }
          if (!uid) { return done(null, false); }

          User.findOne({ _id: uid }, (err, user) => {
            if (err) return done(err);
            if (!user) return done(null, false);
            return done(null, user);
          });

        });
      },
      issueToken
  ));

};
