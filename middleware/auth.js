const jwt = require("jsonwebtoken");
const config = require("../config");
const bcrypt = require("bcrypt");
const { Secrets, Users } = require("../datacenter/models");

const auth = async (req, res, next) => {
  const uAccessToken = req.headers["u-access-token"];

  if (!uAccessToken) {
    throw new Error("Unauthorized request");
  }

  try {
    const decoded = jwt.verify(uAccessToken, config.jwt.secret);
    const hashedToken = await bcrypt.hash(uAccessToken, config.jwt.hashRound);
    const { uuid } = decoded;
    const { jwtAccessToken } = await Secrets.findOne({ uuid });

    if (hashedToken === jwtAccessToken) {
      const user = Users.findOne({ uuid });

      if (!user.isVarified) {
        throw new Error("Unauthorized request");
      }

      req.user = user;
      next();
    } else {
      throw new Error("Unauthorized request");
    }
  } catch (error) {
    return res.unauthorized({
      message: "Unauthorized",
      data: null,
      err: new Error("Unauthorized request"),
    });
  }
};

module.exports = auth;
