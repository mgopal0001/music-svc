const express = require("express");
const morgan = require("morgan");
const cors = require("cors");
const config = require("./config");
const MongoDB = require("./datacenter/connection");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  morgan(":method :url :status :res[content-length] - :response-time ms")
);

app.listen(config.port, async (err) => {
  if (err) {
    console.log("Something went wrong!");
  }

  await MongoDB.getInstance().connect(config.mongo.uri);
  console.log(`Server started on port ${config.port}, connected to DB`);
});
