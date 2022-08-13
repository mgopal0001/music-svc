const winston = require("winston");
const config = require("../config");

const winstonLogger = (meta) => {
    const metadata = {
        service: config.app,
        metadata: meta
    };

    const factory = winston.createLogger({
        format: winston.format.json(),
        defaultMeta: { metadata },
        transports: [
            new winston.transports.File({ filename: `logs/${config.app || "service"}-error.log`, level: "error" }),
            new winston.transports.File({ filename: `logs/${config.app || "service"}-out.log` })
        ],
    });

    if (config.env !== 'production') {
        factory.add(new winston.transports.Console({
        format: winston.format.json(),
        }));
    }

    return factory;
}

const logger = {
    info: (message, metadata) => winstonLogger(metadata).info(message),
    warn: (message, metadata) => winstonLogger(metadata).warn(message),
    debug: (message, metadata) => winstonLogger(metadata).debug(message),
    error: (message, metadata) => winstonLogger(metadata).error(message),
}

module.exports = logger;