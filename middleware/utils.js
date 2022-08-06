const express = require("express");
const morgan = require("morgan");
const cors = require("cors");

const utilMiddleware = (app) => {
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(
    morgan(":method :url :status :res[content-length] - :response-time ms")
  );
};

module.exports = utilMiddleware;
