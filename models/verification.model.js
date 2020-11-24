const { Schema, model } = require("mongoose");

const tokenSchema = new Schema({
    _userId: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
    token: { type: String, required: true },
    createdAt: { type: Date, required: true, expires: 43200 },
    type: { type: String, enum: ["verify", "access"] }
});

module.exports = model("Verification", tokenSchema);
