const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const config = require("../config");
const dbConfig = require("../datacenter/models/config");
const bcrypt = require("bcrypt");
const { Secrets, Users } = require("../datacenter/models");
const { OTP } = require("../utils");

class AuthController {
  static getAccessToken = async (req, res, next) => {
    try {
      const uRefrestToken = req.headers["u-refrest-token"];

      if (!uRefrestToken) {
        throw new Error("Unauthorized request");
      }

      const decoded = jwt.verify(uRefrestToken, config.jwt.refresh.secret);
      const hashedToken = await bcrypt.hash(
        uRefreshToken,
        config.jwt.refresh.hashRound
      );
      const { uuid } = decoded;
      const { jwtRefreshToken } = await Secrets.findOne({ uuid });

      if (hashedToken === jwtRefreshToken) {
        const user = Users.findOne({ uuid });

        if (!user.isVarified) {
          throw new Error("Unauthorized request");
        }

        const uAccessToken = jwt.sign(
          {
            exp: Math.floor(Date.now() / 1000) + config.jwt.access.exp,
            data: {
              uuid,
            },
          },
          config.jwt.access.secret
        );

        await Secrets.updateOne(
          { uuid },
          {
            $set: {
              jwtAccessToken: uAccessToken,
            },
          }
        );

        return res.ok({
          message: "Success",
          data: {
            uAccessToken,
          },
          err: null,
        });
      } else {
        throw new Error("Unauthorized request");
      }
    } catch (err) {
      return res.unauthorized({
        message: "Unauthorized",
        data: null,
        err: new Error("Unauthorized request"),
      });
    }
  };

  static login = async (req, res, next) => {
    try {
      const { email } = req.body;
      const user = await Users.findOne({ email });

      if (!user) {
        return res.notFound({
          message: "User doesn't exist",
          data: null,
          err: null,
        });
      }

      return res.ok({ message: "Success", data: null, err: null });
    } catch (err) {
      return res.internalServerError({
        message: "Internal Server Error",
        data: null,
        err: new Error("Internal Server Error"),
      });
    }
  };

  /**
   * This route should be protected
   * @param {*} req
   * @param {*} res
   * @param {*} next
   * @returns
   */
  static logout = async (req, res, next) => {
    try {
      const { uuid } = req.user;
      await Secrets.updateOne(
        { uuid },
        {
          $set: {
            jwtAccessToken: "",
            jwtRefrestToken: "",
          },
        }
      );

      return res.ok({ message: "Success", data: null, err: null });
    } catch (err) {
      return res.internalServerError({
        message: "Internal Server Error",
        data: null,
        err: new Error("Internal Server Error"),
      });
    }
  };

  static signup = async (req, res, next) => {
    try {
      const { fullname, email, adminSecret } = req.body;

      if (adminSecret && adminSecret !== config.admin.secret) {
        return res.unauthorized({
          message: "Unauthorized",
          data: null,
          err: new Error("Unauthorized request"),
        });
      }
      const role =
        adminSecret === config.admin.secret
          ? dbConfig.user.roles.admin
          : dbConfig.user.roles.user;
      const uuid = uuidv4();

      const iUser = await Users.findOne({ email });

      if (iUser) {
        return res.forbidden({
          message: "User already exist",
          data: null,
          err: null,
        });
      }

      const user = new Users({
        fullname,
        email,
        role,
        uuid,
      });

      await user.save();
      return res.created({ message: "Success", data: null, err: null });
    } catch (err) {
      return res.internalServerError({
        message: "Internal Server Error",
        data: null,
        err: new Error("Internal Server Error"),
      });
    }
  };

  static sendOTP = async (req, res, next) => {
    try {
      const { email } = req.body;
      const otp = OTP.getOtp();
      const otpToken = jwt.sign(
        {
          exp: Math.floor(Date.now() / 1000) + config.jwt.otp.exp,
          data: {
            otp,
          },
        },
        config.jwt.otp.secret
      );
      const user = await Users.findOne({ email });

      if (!user) {
        return res.forbidden({
          message: "User not found",
          data: null,
          err: null,
        });
      }

      await Secrets.findOneAndUpdate(
        {
          uuid: user.uuid,
        },
        {
          $set: {
            otp: otpToken,
          },
        },
        {
          new: true,
          upsert: true,
        }
      );

      await OTP.sendOtp({ otp, from: config.email.from, to: email });
      return res.ok({ message: "Success", data: null, err: null });
    } catch (err) {
      return res.internalServerError({
        message: "Internal Server Error",
        data: null,
        err: new Error("Internal Server Error"),
      });
    }
  };

  static verifyOTP = async (req, res, next) => {
    try {
      const { email, otp } = req.body;
      const user = await Users.findOne({ email });

      if (!user) {
        return res.forbidden({
          message: "User not found",
          data: null,
          err: null,
        });
      }

      const secret = await Secrets.findOne({
        uuid: user.uuid,
      });
      const decoded = jwt.verify(secret.otp, config.jwt.otp.secret);

      if (otp === decoded.otp) {
        const uAccessToken = jwt.sign(
          {
            exp: Math.floor(Date.now() / 1000) + config.jwt.access.exp,
            data: {
              uuid,
            },
          },
          config.jwt.access.secret
        );

        const uRefreshToken = jwt.sign(
          {
            exp: Math.floor(Date.now() / 1000) + config.jwt.refresh.exp,
            data: {
              uuid,
            },
          },
          config.jwt.refresh.secret
        );

        const hashedAccessToken = await bcrypt.hash(
          uAccessToken,
          config.jwt.access.hashRound
        );

        const hashedRefreshToken = await bcrypt.hash(
          uRefreshToken,
          config.jwt.refresh.hashRound
        );

        await Secrets.updateOne(
          { uuid: user.uuid },
          {
            $set: {
              jwtAccessToken: hashedAccessToken,
              jwtRefrestToken: hashedRefreshToken,
            },
          }
        );

        return res.created({
          message: "Success",
          data: {
            uAccessToken,
            uRefreshToken,
          },
          err: null,
        });
      } else {
        return res.forbidden({
          message: "Invalid OTP",
          data: null,
          err: null,
        });
      }
    } catch (err) {
      return res.internalServerError({
        message: "Internal Server Error",
        data: null,
        err: new Error("Internal Server Error"),
      });
    }
  };
}

module.exports = AuthController;
