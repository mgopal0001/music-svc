const { Router } = require("express");
const { auth } = require("../middleware")
const { UserController } = require("../controller");
const router = Router();

router.get("/", auth, UserController.getUser);
router.patch("/", auth, UserController.updateUser);
router.delete("/", auth, UserController.deleteUser);

module.exports = router;
