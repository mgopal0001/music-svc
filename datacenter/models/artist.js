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
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Artists", Artists, "Artists");
