const { Router } = require("express");
const { UserController } = require("../controller");
const router = Router();

router.get("/", UserController.getUsers);

module.exports = router;
