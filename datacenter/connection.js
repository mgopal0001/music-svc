const mongoose = require("mongoose");

class MongoDB {
  static _instance;
  static _mongoose;

  static getInstance = () => {
    if (MongoDB._instance) {
      return MongoDB._instance;
    }

    MongoDB._instance = new MongoDB();
    return MongoDB._instance;
  };

  connect = async (uri) => {
    MongoDB._mongoose = await mongoose.connect(uri);
  };

  disconnect = async () => {
    if (MongoDB._mongoose) {
      await MongoDB._mongoose.disconnect();
    }
  };
}

module.exports = MongoDB;
