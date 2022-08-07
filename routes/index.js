const { Router } = require("express");
const userRoute = require("./user");
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

router.use("*", (req, res) => {
  return res.gone({
    message: "INVALID_ROUTE",
    data: null,
    err: new Error("Route not found"),
  });
});

module.exports = router;
