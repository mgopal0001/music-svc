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
};

module.exports = config;
