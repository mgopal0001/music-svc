const { Router } = require("express");
const { AuthController } = require("../controller");
const router = Router();

router.get("/token", AuthController.getAccessToken);
router.get("/login", AuthController.login);
router.get("/logout", AuthController.logout);
router.get("/signup", AuthController.signup);

module.exports = router;
