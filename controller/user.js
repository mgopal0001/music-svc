class UserController {
  static getUsers = async (req, res, next) => {
    try {
      const { offset, size } = req.query;
      const { uuid } = req.body;
    } catch (err) {
      throw err;
    }
  };
}

module.exports = UserController;
