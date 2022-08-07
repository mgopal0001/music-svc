const jwt = require("jsonwebtoken");
const config = require("../config");
const bcrypt = require("bcrypt");
const { Secrets, Users } = require("../datacenter/models");

const auth = async (req, res, next) => {
  try {
    const uAccessToken = req.headers["u-access-token"];

    if (!uAccessToken) {
      throw new Error("Unauthorized request");
    }

    const decoded = jwt.verify(uAccessToken, config.jwt.access.secret);
    const { uuid } = decoded.data;
    const { jwtAccessToken } = await Secrets.findOne({ uuid });
    const isValid = await bcrypt.compare(uAccessToken, jwtAccessToken);

    if (isValid) {
      const user = await Users.findOne({ uuid });

      if (!user.isVarified) {
        throw new Error("Unauthorized request");
      }

      req.user = user;
      next();
    } else {
      throw new Error("Unauthorized request");
    }
  } catch (error) {
    console.log(error);
    return res.unauthorized({
      message: "Unauthorized",
      data: null,
      err: new Error("Unauthorized request"),
    });
  }
};

module.exports = auth;
