// src/routes.js
const express = require('express');
const path = require('path');
const fs = require('fs');
const { fetchYoutubeMeta } = require('./yt-dlp');
const { cacheGet, cacheSet } = require('./cache');
const { enqueueHLSJob } = require('./queue');

const HLS_BASE = process.env.HLS_BASE || path.join(__dirname, '..', 'public', 'hls');

const router = express.Router();

function isValidId(id) {
  return /^[a-zA-Z0-9_-]{8,20}$/.test(id);
}

// GET metadata + enqueue HLS if needed
router.get('/audio', async (req, res) => {
  try {
    const id = req.query.id;
    if (!id || !isValidId(id)) return res.status(400).json({ error: 'Invalid or missing id' });

    // metadata caching
    const cacheKey = `meta:${id}`;
    const cached = await cacheGet(cacheKey);
    let meta;
    if (cached) {
      meta = JSON.parse(cached);
    } else {
      meta = await fetchYoutubeMeta(id);
      await cacheSet(cacheKey, JSON.stringify(meta), 60 * 60 * 6);
    }

    // check if HLS exists
    const indexPath = path.join(HLS_BASE, id, 'index.m3u8');
    const hlsReady = fs.existsSync(indexPath);

    if (!hlsReady) {
      // enqueue job
      await enqueueHLSJob(meta);
      return res.json({
        ...meta,
        hls_status: 'queued',
        hls_url: `/hls/${id}/index.m3u8`,
        audio_url: meta.bestAudioUrl
      });
    }

    return res.json({
      ...meta,
      hls_status: 'ready',
      hls_url: `/hls/${id}/index.m3u8`,
      audio_url: meta.bestAudioUrl
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Serve HLS static files (index.m3u8 + segments) handled by Express static in src/index.js

// Health
router.get('/health', (req, res) => res.json({ ok: true }));

module.exports = router;
