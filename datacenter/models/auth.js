const mongoose = require("mongoose");
const config = require("./config");

const Secrets = new mongoose.Schema(
  {
    jwtAccessToken: {
      type: String,
    },
    jwtRefreshToken: {
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
