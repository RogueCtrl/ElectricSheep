import { createLogger, format, transports } from "winston";
import "winston-daily-rotate-file";
import { DATA_DIR } from "./config.js";

const logger = createLogger({
  level: "info",
  format: format.combine(
    format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    format.printf(
      ({ timestamp, level, message }) =>
        `${timestamp} [${level.toUpperCase()}]: ${message}`
    )
  ),
  transports: [
    new transports.DailyRotateFile({
      dirname: DATA_DIR,
      filename: "electricsheep-%DATE%.log",
      datePattern: "YYYY-MM-DD",
      zippedArchive: true,
      maxSize: "20m",
      maxFiles: "14d",
      level: "debug",
    }),
    new transports.Console({
      format: format.combine(
        format.colorize(),
        format.printf(
          ({ timestamp, level, message }) => `${timestamp} [${level}]: ${message}`
        )
      ),
    }),
  ],
});

export function setVerbose(verbose: boolean): void {
  logger.level = verbose ? "debug" : "info";
}

export default logger;
