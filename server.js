import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

import { getAudioInfo } from "./src/youtube.js";
import { cacheGet, cacheSet } from "./src/cache.js";
import logger from "./src/logger.js";

const app = express();
app.use(cors());

// Path fix for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// -------------------------------------------
// HEALTH CHECK
// -------------------------------------------
app.get("/health", (req, res) => {
    res.json({
        status: "ok",
        uptime: process.uptime(),
        timestamp: Date.now()
    });
});

// -------------------------------------------
// MAIN AUDIO ENDPOINT
// -------------------------------------------
app.get("/audio", async (req, res) => {
    try {
        const videoId = req.query.id;

        if (!videoId) {
            return res.status(400).json({ error: "Missing id" });
        }

        const cacheKey = `audio:${videoId}`;

        // Check Redis cache
        const cached = await cacheGet(cacheKey);
        if (cached) {
            logger.info(`Cache HIT → ${videoId}`);
            return res.json(JSON.parse(cached));
        }

        logger.info(`Cache MISS → Fetching YouTube data: ${videoId}`);

        // Fetch fresh data
        const data = await getAudioInfo(videoId);

        // Save to cache for 6 hours
        await cacheSet(cacheKey, JSON.stringify(data), 6 * 60 * 60);

        return res.json(data);

    } catch (err) {
        logger.error("Error in /audio endpoint:", err);
        return res.status(500).json({
            error: "Internal server error",
            details: err.toString()
        });
    }
});

// -------------------------------------------
// STATIC HLS FOLDER
// -------------------------------------------
app.use(
    "/hls",
    express.static(path.join(__dirname, "hls-output"), {
        setHeaders: (res) => {
            res.setHeader("Access-Control-Allow-Origin", "*");
        }
    })
);

// -------------------------------------------
// START SERVER
// -------------------------------------------
const PORT = process.env.PORT || 3000;

app.listen(PORT, () =>
    logger.info(`🚀 Server running on port ${PORT}`)
);
