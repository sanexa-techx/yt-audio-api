import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

import { fetchYoutubeMeta } from "./src/yt-dlp.js";
import { cacheGet, cacheSet } from "./src/cache.js";
import { enqueueHLSJob } from "./src/queue.js";
import logger from "./src/logger.js";

const app = express();
app.use(cors());

// Path fix for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// HLS output folder
const HLS_BASE = path.join(__dirname, "hls-output");

// -----------------------------
// HEALTH CHECK
// -----------------------------
app.get("/health", (req, res) => {
    res.json({
        status: "ok",
        uptime: process.uptime(),
        timestamp: Date.now()
    });
});

// -----------------------------
// MAIN AUDIO ENDPOINT
// /audio?id=VIDEO_ID
// -----------------------------
app.get("/audio", async (req, res) => {
    try {
        const videoId = req.query.id;

        if (!videoId) {
            return res.status(400).json({ error: "Missing id" });
        }

        const cacheKey = `meta:${videoId}`;

        // -----------------------------
        // CHECK CACHE
        // -----------------------------
        const cached = await cacheGet(cacheKey);
        let meta;

        if (cached) {
            logger.info(`Cache HIT → ${videoId}`);
            meta = JSON.parse(cached);
        } else {
            logger.info(`Cache MISS → Fetching YouTube data: ${videoId}`);

            meta = await fetchYoutubeMeta(videoId);

            // store for 6 hours
            await cacheSet(cacheKey, JSON.stringify(meta), 6 * 60 * 60);
        }

        // -----------------------------
        // CHECK IF HLS EXISTS
        // -----------------------------
        const indexPath = path.join(HLS_BASE, videoId, "index.m3u8");
        const hlsReady = fs.existsSync(indexPath);

        if (!hlsReady) {
            logger.info(`HLS missing → enqueue job for ${videoId}`);
            await enqueueHLSJob(meta);

            return res.json({
                ...meta,
                hls_status: "queued",
                hls_url: `/hls/${videoId}/index.m3u8`,
                audio_url: meta.bestAudioUrl
            });
        }

        // -----------------------------
        // RETURN READY HLS + META
        // -----------------------------
        return res.json({
            ...meta,
            hls_status: "ready",
            hls_url: `/hls/${videoId}/index.m3u8`,
            audio_url: meta.bestAudioUrl
        });

    } catch (err) {
        logger.error("Error in /audio endpoint:", err);
        return res.status(500).json({
            error: "Internal server error",
            details: err.toString()
        });
    }
});

// -----------------------------
// STATIC HLS FOLDER
// -----------------------------
app.use(
    "/hls",
    express.static(path.join(__dirname, "hls-output"), {
        setHeaders: (res) => {
            res.setHeader("Access-Control-Allow-Origin", "*");
        }
    })
);

// -----------------------------
// START SERVER
// -----------------------------
const PORT = process.env.PORT || 3000;

app.listen(PORT, () =>
    logger.info(`🚀 Server running on port ${PORT}`)
);
