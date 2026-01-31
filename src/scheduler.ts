/**
 * Scheduler for ElectricSheep agent.
 *
 * Runs as a long-lived process to trigger agent activities at specific times.
 */

import cron from "node-cron";
import logger from "./logger.js";
import { checkAndEngage } from "./waking.js";
import { runDreamCycle, postDreamJournal } from "./dreamer.js";

function scheduleJobs() {
    logger.info("Starting ElectricSheep scheduler...");

    // Waking check: Every 4 hours at 8, 12, 16, 20
    cron.schedule("0 8,12,16,20 * * *", async () => {
        logger.info("Scheduler triggering: Waking Check");
        try {
            await checkAndEngage();
        } catch (e) {
            logger.error(`Scheduled check failed: ${e}`);
        }
    });

    // Dream cycle: Daily at 2:00 AM
    cron.schedule("0 2 * * *", async () => {
        logger.info("Scheduler triggering: Dream Cycle");
        try {
            await runDreamCycle();
        } catch (e) {
            logger.error(`Scheduled dream cycle failed: ${e}`);
        }
    });

    // Journal post: Daily at 7:00 AM
    cron.schedule("0 7 * * *", async () => {
        logger.info("Scheduler triggering: Journal Post");
        try {
            await postDreamJournal();
        } catch (e) {
            logger.error(`Scheduled journal post failed: ${e}`);
        }
    });

    logger.info("Scheduler active. Press Ctrl+C to stop.");
}

export { scheduleJobs };
