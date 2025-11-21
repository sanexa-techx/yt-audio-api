const express = require("express");
const router = express.Router();

const cache = require("./cache");
const { fetchYoutubeMeta, validateVideoId } = require("./utils");
const { getHLSStream, buildHLSPlaylist } = require("./hls");

/**
 * GET /meta/:id
 * Returns metadata + best audio URL
 */
router.get("/meta/:id", async (req, res) => {
  try {
    const videoId = req.params.id;

    if (!validateVideoId(videoId)) {
      return res.status(400).json({ error: "Invalid video ID" });
    }

    // Check cache
    const cached = await cache.get(`meta:${videoId}`);
    if (cached) return res.json(JSON.parse(cached));

    // Fetch live metadata
    const meta = await fetchYoutubeMeta(videoId);

    // Cache result 6 hours
    await cache.set(`meta:${videoId}`, JSON.stringify(meta), 60 * 60 * 6);

    return res.json(meta);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch metadata" });
  }
});

/**
 * GET /stream/:id
 * Streams raw audio directly
 */
router.get("/stream/:id", async (req, res) => {
  try {
    const videoId = req.params.id;
    if (!validateVideoId(videoId)) return res.status(400).send("Invalid videoId");

    const stream = await getHLSStream(videoId);

    res.setHeader("Content-Type", "audio/mp4");
    res.setHeader("Transfer-Encoding", "chunked");

    stream.pipe(res);
  } catch (err) {
    console.error("STREAM ERROR", err);
    res.status(500).json({ error: "Stream failed" });
  }
});

/**
 * GET /hls/:id/index.m3u8
 * Returns a static playlist (Flutter uses this)
 */
router.get("/hls/:id/index.m3u8", (req, res) => {
  res.setHeader("Content-Type", "application/x-mpegURL");
  res.send(buildHLSPlaylist());
});

/**
 * GET /hls/:id/segment.ts
 * Returns an audio segment (same YouTube stream)
 */
router.get("/hls/:id/segment.ts", async (req, res) => {
  try {
    const videoId = req.params.id;
    const stream = await getHLSStream(videoId);

    res.setHeader("Content-Type", "video/mp2t");
    stream.pipe(res);
  } catch (err) {
    console.error("SEGMENT ERROR", err);
    res.status(500).json({ error: "Unable to fetch segment" });
  }
});

module.exports = router;
