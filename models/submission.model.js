const { Schema, model } = require("mongoose");

let submissionSchema = new Schema({
  submittedAt: { type: Date, required: true },
  author: { type: Schema.Types.ObjectID, required: true },
  github: { type: String, required: true },
  challenge: { type: Schema.Types.ObjectID, required: true },
  team: String,
  description: String,
  notes: String,
  judging: [{
    name: String,
    score: Number
  }],
  disqualified: { type: Boolean, default: false }
});

module.exports = model("Submission", submissionSchema);
