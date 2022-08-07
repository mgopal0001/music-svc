const { Router } = require("express");
const { AuthController } = require("../controller");
const { auth } = require("../middleware");
const router = Router();

router.get("/token", AuthController.getAccessToken);
router.post("/login", AuthController.login);
router.get("/logout", auth, AuthController.logout);
router.post("/signup", AuthController.signup);
router.post("/otp/send", AuthController.sendOTP);
router.post("/otp/verify", AuthController.verifyOTP);

module.exports = router;
