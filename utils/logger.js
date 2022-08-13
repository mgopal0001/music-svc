const winston = require("winston");
const config = require("../config");

const logger = winston.createLogger({
    format: winston.format.json(),
    defaultMeta: { metadata: { service: config.app }},
    transports: [
        new winston.transports.File({ filename: `logs/${config.app || "service"}-error.log`, level: "error" }),
        new winston.transports.File({ filename: `logs/${config.app || "service"}-out.log` })
    ],
});

if (config.env !== 'production') {
    logger.add(new winston.transports.Console({
      format: winston.format.json(),
    }));
}

module.exports = logger;