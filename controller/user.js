const { Users } = require("../datacenter/models");
const { UserValidation } = require("../utils");

class UserController {
  /**
   * Get user details
   * @param {*} req 
   * @param {*} res 
   * @returns 
   */
  static getUser = async (req, res) => {
    try {
      const { uuid } = req.user;
      const user = await Users.findOne({uuid}, {
        uuid: 1,
        fullname: 1,
        email: 1
      });

      return res.ok({
        message: "success", 
        data: {
          uuid,
          fullName: user.fullname,
          email: user.email
        }, 
        success: true
      });
    } catch (err) {
      return res.internalServerError({message: "Internal server error", success: false, err});
    }
  };

  /**
   * 
   * @param {*} req 
   * @param {*} req.body 
   * @param {*} req.body.fullName 
   * @param {*} res 
   * @returns 
   */
  static updateUser = async (req, res) => {
    try {
      const { uuid } = req.user;
      const { fullName } = UserValidation.validateUpdateUser({
        fullName: req.body.fullName
      });
      const user = await Users.findOneAndUpdate({ uuid }, {
        $set: {
          fullname: fullName
        }
      });

      return res.ok({
        message: "success", 
        data: {
          uuid,
          fullName: user.fullname,
          email: user.email
        }, 
        success: true
      });
    } catch (err) {
      return res.internalServerError({message: "Internal server error", success: false, err});
    }
  };

  /**
   * 
   * @param {*} req 
   * @param {*} res 
   * @returns 
   */
  static deleteUser = async (req, res) => {
    try {
      const { uuid } = req.user;
      const user = await Users.findOneAndUpdate({ uuid }, {
        $set: {
          active: false
        }
      });

      return res.ok({
        message: "success", 
        data: {
          uuid,
          fullName: user.fullname,
          email: user.email
        }, 
        success: true
      });
    } catch (err) {
      return res.internalServerError({message: "Internal server error", success: false, err});
    }
  };
}

module.exports = UserController;
