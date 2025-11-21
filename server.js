import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { getAudioInfo } from "./src/youtube.js";
import { cacheGet, cacheSet } from "./src/cache.js";
import logger from "./src/logger.js";

const app = express();
app.use(cors());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Health check
app.get("/health", (req, res) => {
    res.json({ status: "ok", uptime: process.uptime() });
});

// Main audio endpoint
app.get("/audio", async (req, res) => {
    try {
        const videoId = req.query.id;
        if (!videoId) return res.status(400).json({ error: "Missing id" });

        // Check cache
        const cacheKey = `audio:${videoId}`;
        const cached = await cacheGet(cacheKey);
        if (cached) {
            logger.info(`Cache hit for ${videoId}`);
            return res.json(JSON.parse(cached));
        }

        logger.info(`Fetching fresh data for ${videoId}`);
        const data = await getAudioInfo(videoId);

        // Cache 6 hours
        await cacheSet(cacheKey, JSON.stringify(data), 21600);

        res.json(data);
    } catch (err) {
        logger.error("Error in /audio:", err);
        res.status(500).json({ error: err.toString() });
    }
});

// Serve generated HLS files
app.use("/hls", express.static(path.join(__dirname, "hls-output")));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => logger.info(`Server running on port ${PORT}`));
