const { Schema, model } = require("mongoose");
const { hashSync, compareSync } = require("bcrypt");

let userSchema = new Schema({
  name: String,
  username: String,
  email: String,
  emailValidated: { type: Boolean, default: false },
  password: String,
  avatar: String,
  discord_id: String,
  discord_token: String,
  bio: String,
  token: String,
  noticed_announcements: [String],
  team: Schema.Types.ObjectId,
  github: String,
  flags: {
    admin: { type: Boolean, default: false },
    organizer: { type: Boolean, default: false },
    judge: { type: Boolean, default: false },
    mentor: { type: Boolean, default: false },
    host: { type: Boolean, default: false },
    sponsor: { type: Boolean, default: false },
    verified: { type: Boolean, default: false },
    winner: { type: Boolean, default: false },
    team: { type: Boolean, default: false },
    participant: { type: Boolean, default: true },
    snowman: { type: Boolean, default: false },
    beta: { type: Boolean, default: false },
    no_edit: { type: Boolean, default: false },
    suspended: { type: Boolean, default: false },
    mar_2021_participant: { type: Boolean, default: false }
  }
});

// Methods
/**
 * Returns a hashed password from input
 * @param password - The input password
 * @returns {*} - Hashed password
 */
userSchema.methods.generateHash = password => hashSync(password, 10);

/**
 * Checks an input password against the stored password for the user
 * @param password - The input password
 * @returns {Boolean} - If the password is correct (true) or incorrect (false)
 */
userSchema.methods.validatePassword = function (password) {
  return compareSync(password, this.password);
};

module.exports = model("User", userSchema);
