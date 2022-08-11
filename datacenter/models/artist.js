const mongoose = require("mongoose");

const Artists = new mongoose.Schema(
  {
    name: {
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
    dob: {
      type: Date,
      required: true,
    },
    aid: {
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

module.exports = mongoose.model("Artists", Artists, "Artists");
