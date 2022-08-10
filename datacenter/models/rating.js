const mongoose = require("mongoose");
const config = require("./config");

const Ratings = new mongoose.Schema(
  {
    sid: {
      type: String,
      required: true,
    },
    uuid: {
      type: String,
      required: true,
    },
    rating: {
      type: Number,
      min: config.songs.rating.min,
      max: config.songs.rating.max,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

Ratings.index({ sid: 1, uuid: 1 }, { unique: true });

module.exports = mongoose.model("Ratings", Ratings, "Ratings");
