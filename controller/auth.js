const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const config = require("../config");
const dbConfig = require("../datacenter/models/config");
const bcrypt = require("bcrypt");
const { Secrets, Users } = require("../datacenter/models");
const { OTP, logger, AuthValidation } = require("../utils");

class AuthController {
  /**
   * 
   * @param {*} req 
   * @param {*} req.headers 
   * @param {*} res 
   * @returns 
   */
  static getAccessToken = async (req, res) => {
    try {
      const uRefreshToken = req.headers["u-refresh-token"];
      if (!uRefreshToken) {
        throw new Error("Unauthorized request");
      }

      const decoded = jwt.verify(uRefreshToken, config.jwt.refresh.secret);
      const { uuid } = decoded.data;
      const { jwtRefreshToken } = await Secrets.findOne({ uuid });
      const isValid = await bcrypt.compare(uRefreshToken, jwtRefreshToken);

      if (isValid) {
        const user = await Users.findOne({ uuid });

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

        const hashedAccessToken = await bcrypt.hash(
          uAccessToken,
          config.jwt.access.hashRound
        );

        await Secrets.updateOne(
          { uuid },
          {
            $set: {
              jwtAccessToken: hashedAccessToken,
            },
          }
        );

        return res.ok({
          message: "success",
          data: {
            uAccessToken,
          },
          success: true,
        });
      } else {
        logger.info("Something went wrong");
        return res.unauthorized({
          message: "Unauthorized",
          success: false,
          err: new Error("Unauthorized request"),
        });
      }
    } catch (err) {
      logger.error("Something went wrong", err);
      return res.unauthorized({
        message: "Unauthorized",
        success: false,
        err: new Error("Unauthorized request"),
      });
    }
  };

  /**
   * 
   * @param {*} req 
   * @param {*} req.body 
   * @param {*} req.body.email 
   * @param {*} res 
   * @returns 
   */
  static login = async (req, res) => {
    try {
      const { email } = AuthValidation.validateLogin({
        email: req.body.email
      });
      const user = await Users.findOne({ email });

      if (!user) {
        return res.notFound({
          message: "User doesn't exist",
          success: false,
          err: new Error("User doesn't exitst"),
        });
      }

      return res.ok({ message: "success", success: true, data: { uuid: user.uuid, email: user.email, fullName: user.fullname } });
    } catch (err) {
      return res.internalServerError({
        message: "Internal Server Error",
        success: false,
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
  static logout = async (req, res) => {
    try {
      const { uuid } = req.user;
      await Secrets.updateOne(
        { uuid },
        {
          $set: {
            jwtAccessToken: "",
            jwtRefreshToken: "",
          },
        }
      );

      return res.ok({
         message: "success", 
         data: {
          message: "You are logged out"
        }, 
        success: true 
      });
    } catch (err) {
      return res.internalServerError({
        message: "Internal Server Error",
        success: false,
        err: new Error("Internal Server Error"),
      });
    }
  };

  /**
   * 
   * @param {*} req 
   * @param {*} req.body 
   * @param {*} req.body.fullName 
   * @param {*} req.body.email 
   * @param {*} req.body.adminSecret 
   * @param {*} res 
   * @returns 
   */
  static signup = async (req, res) => {
    try {
      const { fullName, email, adminSecret } = AuthValidation.validateSignup({
        fullName: req.body.fullName,
        email: req.body.email,
        adminSecret: req.body.adminSecret
      });

      if (adminSecret && adminSecret !== config.admin.secret) {
        return res.unauthorized({
          message: "Unauthorized",
          success: false,
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
          success: false,
          err: new Error("User already exits"),
        });
      }

      const user = new Users({
        fullname: fullName,
        email,
        role,
        uuid,
      });

      await user.save();
      return res.created({ message: "success", data: { fullName, email, uuid }, success: false });
    } catch (err) {
      return res.internalServerError({
        message: "Internal Server Error",
        success: false,
        err: new Error("Internal Server Error"),
      });
    }
  };

  /**
   * 
   * @param {*} req 
   * @param {*} req.body 
   * @param {*} req.body.email 
   * @param {*} res 
   * @returns 
   */
  static sendOTP = async (req, res) => {
    try {
      const { email } = AuthValidation.validateSendOTP({
        email: req.body.email
      });

      const otp = OTP.getOtp();
      const hashedOtp = await bcrypt.hash(otp, config.jwt.otp.hashRound);
      const otpToken = jwt.sign(
        {
          exp: Math.floor(Date.now() / 1000) + config.jwt.otp.exp,
          data: {
            otp: hashedOtp,
          },
        },
        config.jwt.otp.secret
      );
      const user = await Users.findOne({ email });

      if (!user) {
        return res.forbidden({
          message: "User not found",
          success: false,
          err: new Error("User not found"),
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
      return res.ok({ message: "success", data: { email }, success: true });
    } catch (err) {
      logger.error("Something went wrong", err);
      return res.internalServerError({
        message: "Internal Server Error",
        success: false,
        err: new Error("Internal Server Error"),
      });
    }
  };

  /**
   * 
   * @param {*} req 
   * @param {*} req.body 
   * @param {*} req.body.email 
   * @param {*} req.body.otp 
   * @param {*} res 
   * @returns 
   */
  static verifyOTP = async (req, res) => {
    try {
      const { email, otp } = AuthValidation.validateVerifyOTP({
        email: req.body.email,
        otp: req.body.otp
      });
      const user = await Users.findOne({ email });

      if (!user) {
        return res.forbidden({
          message: "User not found",
          success: false,
          err: new Error("User not found"),
        });
      }

      const secret = await Secrets.findOne({
        uuid: user.uuid,
      });
      const decoded = jwt.verify(secret.otp, config.jwt.otp.secret);
      const isValid = await bcrypt.compare(otp, decoded.data.otp);

      if (isValid) {
        await Users.updateOne(
          { uuid: user.uuid },
          {
            $set: {
              isVarified: true,
            },
          }
        );
        const uAccessToken = jwt.sign(
          {
            exp: Math.floor(Date.now() / 1000) + config.jwt.access.exp,
            data: {
              uuid: user.uuid,
            },
          },
          config.jwt.access.secret
        );

        const uRefreshToken = jwt.sign(
          {
            exp: Math.floor(Date.now() / 1000) + config.jwt.refresh.exp,
            data: {
              uuid: user.uuid,
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
              jwtRefreshToken: hashedRefreshToken,
            },
          }
        );

        return res.created({
          message: "success",
          data: {
            uAccessToken,
            uRefreshToken,
          },
          success: true,
        });
      } else {
        return res.forbidden({
          message: "Invalid OTP",
          success: false,
          err: new Error("Invalid OTP"),
        });
      }
    } catch (err) {
      logger.error("Something went wrong", err);
      return res.internalServerError({
        message: "Internal Server Error",
        success: false,
        err: new Error("Internal Server Error"),
      });
    }
  };
}

module.exports = AuthController;
