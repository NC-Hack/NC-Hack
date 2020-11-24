const { Schema, model } = require("mongoose");

let eventSchema = new Schema({
  created: { type: Date, required: true },
  creator_id: { type: Schema.Types.ObjectId, required: true },
  title: String,
  description: String,
  start: Date,
  end: Date,
  anonymous: { type: Boolean, default: false }
});

module.exports = model("Event", eventSchema);
