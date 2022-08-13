const { Users } = require("../datacenter/models");

class UserController {
  static getUser = async (req, res) => {
    try {
      const { uuid } = req.user;
      const user = await Users.findOne({uuid}, {
        uuid: 1,
        fullname: 1,
        email: 1
      });

      return res.ok({message: "Success", data: user, err: null});
    } catch (err) {
      return res.internalServerError({message: "Internal server error", data: null, err});
    }
  };

  static updateUser = async (req, res) => {
    try {
      const { uuid } = req.user;
      const { name } = req.body;
      const user = await Users.findOneAndUpdate({ uuid }, {
        $set: {
          fullname: name
        }
      });

      return res.ok({message: "Success", data: user, err: null});
    } catch (err) {
      return res.internalServerError({message: "Internal server error", data: null, err});
    }
  };

  static deleteUser = async (req, res) => {
    try {
      const { uuid } = req.user;
      const user = await Users.findOneAndUpdate({ uuid }, {
        $set: {
          active: false
        }
      });

      return res.ok({message: "Success", data: user, err: null});
    } catch (err) {
      return res.internalServerError({message: "Internal server error", data: null, err});
    }
  };
}

module.exports = UserController;
