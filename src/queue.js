const { Queue } = require("bullmq");
const Redis = require("ioredis");

const REDIS_URL = process.env.REDIS_URL || "redis://127.0.0.1:6379";

const connection = new Redis(REDIS_URL);

/**
 * BullMQ queue for HLS conversion jobs
 */
const hlsQueue = new Queue("hlsQueue", {
  connection,
});

/**
 * Add video to HLS processing queue
 * meta = { id, bestAudioUrl, duration, title }
 */
async function enqueueHLSJob(meta) {
  if (!meta?.id || !meta?.bestAudioUrl) {
    throw new Error("Invalid meta passed to HLS queue");
  }

  return await hlsQueue.add(
    "generate-hls",
    {
      id: meta.id,
      meta,
    },
    {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 3000,
      },
      removeOnComplete: true,
      removeOnFail: false,
    }
  );
}

module.exports = {
  hlsQueue,
  enqueueHLSJob,
};
