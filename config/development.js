const dotenv = require("dotenv");
dotenv.config();

const config = {
  email: {
    from: "alert@gurubyuri.com",
  },
  aws: {
    accessKeyId: process.env.ACCESS_KEY_ID,
    secretAccessKey: process.env.SECRET_ACCESS_KEY,
  },
};

module.exports = config;
