import { Queue } from "bullmq";
import Redis from "ioredis";

const REDIS_URL = process.env.REDIS_URL || "redis://127.0.0.1:6379";

const connection = new Redis(REDIS_URL);

/**
 * BullMQ queue for HLS conversion jobs
 */
export const hlsQueue = new Queue("hlsQueue", {
  connection,
});

/**
 * Add video to HLS processing queue
 * meta = { id, bestAudioUrl, duration, title }
 */
export async function enqueueHLSJob(meta) {
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
      removeOnComplete: true,   // delete successful jobs
      removeOnFail: false,      // keep failed jobs for debugging
    }
  );
}
