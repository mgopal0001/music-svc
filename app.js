const express = require("express");
const morgan = require("morgan");
const config = require("./config");

const app = express();

app.use(
  morgan(":method :url :status :res[content-length] - :response-time ms")
);

app.listen(config.port, (err) => {
  if (err) {
    console.log("Something went wrong!");
  }

  console.log(config);

  console.log(`Server started on port ${config.port}`);
});
