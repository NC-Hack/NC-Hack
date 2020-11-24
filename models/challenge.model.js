const { Schema, model } = require("mongoose");

let challengeSchema = new Schema({
  created: { type: Date, required: true },
  creator_id: { type: Schema.Types.ObjectId, required: true },
  title: String,
  short: String,
  long: String,
  start: Date,
  end: Date,
  sponsor: {
    name: String,
    link: String
  },
  judges: [Schema.Types.ObjectId],
  anonymous: { type: Boolean, default: false },
  hidden: { type: Boolean, default: false },
  criteria: [{
    name: String,
    worth: Number
  }],
  resultsPublished: { type: Boolean, default: false }
});

module.exports = model("Challenge", challengeSchema);
