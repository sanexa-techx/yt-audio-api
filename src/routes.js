// src/routes.js
const express = require("express");
const path = require("path");
const fs = require("fs");
const { fetchYoutubeMeta } = require("./yt-dlp");
const { cacheGet, cacheSet } = require("./cache");
const { enqueueHLSJob } = require("./queue");

const HLS_BASE =
  process.env.HLS_BASE ||
  path.join(__dirname, "..", "public", "hls");

const router = express.Router();

function isValidId(id) {
  return /^[a-zA-Z0-9_-]{8,20}$/.test(id);
}

// -------------------------------
// GET /audio?id=VIDEO_ID
// Returns metadata + audio_url + HLS status
// -------------------------------
router.get("/audio", async (req, res) => {
  try {
    const id = req.query.id;
    if (!id || !isValidId(id)) {
      return res.status(400).json({ error: "Invalid or missing id" });
    }

    const cacheKey = `meta:${id}`;

    // -----------------------------
    // Metadata from CACHE
    // -----------------------------
    let meta;
    const cached = await cacheGet(cacheKey);

    if (cached) {
      meta = JSON.parse(cached);
    } else {
      // -----------------------------
      // Fetch fresh metadata (yt-dlp)
      // -----------------------------
      meta = await fetchYoutubeMeta(id);
      await cacheSet(cacheKey, JSON.stringify(meta), 60 * 60 * 6); // 6 hours
    }

    // -----------------------------
    // HLS folder check
    // -----------------------------
    const indexPath = path.join(HLS_BASE, id, "index.m3u8");
    const hlsReady = fs.existsSync(indexPath);

    // -----------------------------
    // If not ready → enqueue HLS job
    // -----------------------------
    if (!hlsReady) {
      await enqueueHLSJob(meta);

      return res.json({
        ...meta,
        hls_status: "queued",
        hls_url: `/hls/${id}/index.m3u8`,
        audio_url: meta.bestAudioUrl,
      });
    }

    // -----------------------------
    // HLS READY → return final URLs
    // -----------------------------
    return res.json({
      ...meta,
      hls_status: "ready",
      hls_url: `/hls/${id}/index.m3u8`,
      audio_url: meta.bestAudioUrl,
    });

  } catch (err) {
    console.error("❌ /audio route failed:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

// Health check
router.get("/health", (req, res) => res.json({ ok: true }));

module.exports = router;
