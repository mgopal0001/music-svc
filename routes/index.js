const { Router } = require("express");
const userRoute = require("./user");
const router = Router();

router.use("/user", userRoute);

module.exports = router;
