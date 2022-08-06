const express = require("express");
const config = require("./config");
const { MongoDB } = require("./datacenter");
const { utilMiddleware, errorMiddleware } = require("./middleware");
const routes = require("./routes");

const app = express();

utilMiddleware(app);
app.use(routes);
errorMiddleware(app);

app.listen(config.port, async (err) => {
  if (err) {
    console.log("Something went wrong!");
    return;
  }

  await MongoDB.getInstance().connect(config.mongo.uri);
  console.log(`Server started on port ${config.port}, connected to DB`);
});
