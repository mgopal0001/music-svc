const express = require("express");
const morgan = require("morgan");
const cors = require("cors");
const config = require("./config");
const { MongoDB } = require("./datacenter");
const routes = require("./routes");
const { Response } = require("./utils");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  morgan(":method :url :status :res[content-length] - :response-time ms")
);

app.use((req, res, next) => {
  const responseFactory = (type) => {
    switch (type) {
      case "processing":
        return ({ message, data, err }) => {
          const response = Response.processing({ message, data });
          return res.status(response.statusCode).json(response);
        };

      case "ok":
        return ({ message, data, err }) => {
          const response = Response.ok({ message, data });
          return res.status(response.statusCode).json(response);
        };

      case "created":
        return ({ message, data, err }) => {
          const response = Response.created({ message, data });
          return res.status(response.statusCode).json(response);
        };

      case "partial":
        return ({ message, data, err }) => {
          const response = Response.partial({ message, data });
          return res.status(response.statusCode).json(response);
        };

      case "notFound":
        return ({ message, data, err }) => {
          const response = Response.notFound({ message, data, err });
          return res.status(response.statusCode).json(response);
        };

      case "forbidden":
        return ({ message, data, err }) => {
          const response = Response.forbidden({ message, data, err });
          return res.status(response.statusCode).json(response);
        };

      case "unauthorized":
        return ({ message, data, err }) => {
          const response = Response.unauthorized({ message, data, err });
          return res.status(response.statusCode).json(response);
        };

      case "gone":
        return ({ message, data, err }) => {
          const response = Response.gone({ message, data, err });
          return res.status(response.statusCode).json(response);
        };

      default:
        return ({ message, data, err }) => {
          const response = Response.internalServerError({ message, data, err });
          return res.status(response.statusCode).json(response);
        };
    }
  };

  res.processing = responseFactory("processing");
  res.ok = responseFactory("ok");
  res.created = responseFactory("created");
  res.partial = responseFactory("partial");
  res.notFound = responseFactory("notFound");
  res.forbidden = responseFactory("forbidden");
  res.unauthorized = responseFactory("unauthorized");
  res.gone = responseFactory("gone");
  res.internalServerError = responseFactory("ise");
  next();
});

app.use(routes);

app.listen(config.port, async (err) => {
  if (err) {
    console.log("Something went wrong!");
    return;
  }

  await MongoDB.getInstance().connect(config.mongo.uri);
  console.log(`Server started on port ${config.port}, connected to DB`);
});
