import { generateHLS } from "./src/hls.js";
import { cacheGet, cacheSet } from "./src/cache.js";
import logger from "./src/logger.js";

// POLLING QUEUE — Worker checks every 5 seconds
const INTERVAL = 5000;

async function processQueue() {
    logger.info("Worker checking queue…");

    // Get list of pending jobs from cache
    const pendingJobs = await cacheGet("hls:pending");
    if (!pendingJobs) return;

    const queue = JSON.parse(pendingJobs);

    for (let videoId of queue) {
        try {
            logger.info(`Worker generating HLS for: ${videoId}`);

            const hlsUrl = await generateHLS(videoId);

            // Store generated URL in cache
            await cacheSet(`hls:${videoId}`, hlsUrl);

            // Remove from queue
            const newQueue = queue.filter((v) => v !== videoId);
            await cacheSet("hls:pending", JSON.stringify(newQueue));

            logger.info(`HLS generated for ${videoId}: ${hlsUrl}`);
        } catch (err) {
            logger.error(`Error processing ${videoId}:`, err);
        }
    }
}

setInterval(processQueue, INTERVAL);
logger.info("HLS Worker started…");
