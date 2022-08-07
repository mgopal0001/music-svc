const dotenv = require("dotenv");
dotenv.config();

const config = {
  app: "music-svc",
  port: process.env.PORT,
  tz: process.env.TZ,
  env: process.env.ENV,
  mongo: {
    uri: process.env.MONGO_URI,
  },
  jwt: {
    access: {
      secret: process.env.ACCESS_TOKEN_SECRET,
      hashRound: 10,
      exp: 60 * 5,
    },
    refresh: {
      secret: process.env.REFRESH_TOKEN_SECRET,
      hashRound: 10,
      exp: 60 * 60 * 96,
    },
    otp: {
      secret: {
        verify: process.env.OTP_TOKEN_SECRET,
      },
      hashRound: 10,
      exp: 60 * 15,
    },
  },
  admin: {
    secret: process.env.ADMIN_SECRET,
  },
};

module.exports = config;
