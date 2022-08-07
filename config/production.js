const dotenv = require("dotenv");
dotenv.config();

const config = {
  email: {
    from: "madan@gmail.com",
  },
  aws: {
    accessKeyId: process.env.ACCESS_KEY_ID,
    secretAccessKey: process.env.SECRET_ACCESS_KEY,
  },
};

module.exports = config;
