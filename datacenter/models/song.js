const mongoose = require("mongoose");

const Songs = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    uuid: {
      type: String,
      required: true,
    },
    image: {
      type: String,
      default: "",
    },
    audio: {
      type: String,
      required: true,
    },
    dor: {
      type: Date,
      required: true,
    },
    sid: {
      type: String,
      required: true,
      unique: true,
    },
    ratingValue: {
      type: Number,
      default: 0,
    },
    ratingCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Songs", Songs, "Songs");
