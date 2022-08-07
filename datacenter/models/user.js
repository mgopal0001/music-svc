const mongoose = require("mongoose");
const config = require("./config");

const Users = new mongoose.Schema(
  {
    fullname: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    isVarified: {
      type: Boolean,
      default: false,
    },
    uuid: {
      type: String,
      unique: true,
      required: true,
    },
    role: {
      type: String,
      enum: [config.user.roles.user, config.user.roles.admin],
      default: config.user.roles.user,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Users", Users, "Users");
