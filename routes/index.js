const { Router } = require("express");
const userRoute = require("./user");
const authRoute = require("./auth");
const songRoute = require("./song");
const router = Router();

router.get("/", (req, res) => {
  return res.ok({
    message: "HEALTH_ROUTE",
    data: {
      version: "1.0.0",
      app: "music-svc",
    },
    err: null,
  });
});

router.use("/user", userRoute);
router.use("/auth", authRoute);
router.use("/song", songRoute);

router.use("*", (req, res) => {
  return res.gone({
    message: "INVALID_ROUTE",
    data: null,
    err: new Error("Route not found"),
  });
});

module.exports = router;
