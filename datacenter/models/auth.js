const mongoose = require("mongoose");
const config = require("./config");

/**
 * Secrets to hashed and then stored to DB
 */

const Secrets = new mongoose.Schema(
  {
    jwtAccessToken: {
      type: String,
    },
    jwtRefrestToken: {
      type: String,
    },
    otp: {
      type: String,
    },
    uuid: {
      type: String,
      unique: true,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Secrets", Secrets, "Secrets");
