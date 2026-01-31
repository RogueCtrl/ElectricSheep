/**
 * Logging configuration for ElectricSheep.
 */

import { createLogger, format, transports } from "winston";
import { resolve } from "node:path";
import { DATA_DIR } from "./config.js";

const LOG_FILE = resolve(DATA_DIR, "electricsheep.log");

const logger = createLogger({
  level: "info",
  format: format.combine(
    format.timestamp(),
    format.printf(
      ({ timestamp, level, message }) => `${timestamp} - ${level} - ${message}`
    )
  ),
  transports: [
    new transports.File({
      filename: LOG_FILE,
      maxsize: 5 * 1024 * 1024, // 5 MB
      maxFiles: 5,
      level: "debug",
    }),
    new transports.Console({
      format: format.combine(format.colorize(), format.simple()),
    }),
  ],
});

export function setVerbose(verbose: boolean): void {
  logger.level = verbose ? "debug" : "info";
}

export default logger;
