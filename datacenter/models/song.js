const mongoose = require("mongoose");
const config = require("./config");

const Songs = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    maxRating: {
      type: Number,
      default: config.songs.rating.max,
    },
    minRating: {
      type: Number,
      default: config.songs.rating.min,
    },
    totalRating: {
      type: Number,
      default: 0,
    },
    ratingCount: {
      type: Number,
      default: 0,
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
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Songs", Songs, "Songs");
