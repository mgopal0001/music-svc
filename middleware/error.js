const errorMiddleware = (app) => {
  app.use("*", (req, res) => {
    return res.status(500).json({
      success: false,
      message: "ERROR",
      data: null,
    });
  });
};

module.exports = errorMiddleware;
