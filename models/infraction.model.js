const { Schema, model } = require("mongoose");

let infractionSchema = new Schema({
  created: { type: Date, required: true },
  moderator_id: { type: Schema.Types.ObjectId, required: true },
  user_id: { type: Schema.Types.ObjectId },
  reason: String,
  noticed: { type: Boolean, default: false },
  anonymous: { type: Boolean, default: false },
  type: { type: String, enum: ["message", "suspend", "unsuspend", "announcement"], required: true }
});

module.exports = model("Infraction", infractionSchema);
