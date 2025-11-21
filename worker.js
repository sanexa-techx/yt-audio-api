// worker.js
require('dotenv').config();
const { Worker } = require('bullmq');
const Redis = require('ioredis');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
const HLS_BASE = process.env.HLS_BASE || path.join(__dirname, 'public', 'hls');

const connection = new Redis(REDIS_URL);

function generateHlsFromUrl(url, outDir, id) {
  return new Promise((resolve, reject) => {
    fs.mkdirSync(outDir, { recursive: true });

    const args = [
      '-y',
      '-i', url,
      '-c:a', 'aac',
      '-b:a', '128k',
      '-vn',
      '-hls_time', '10',
      '-hls_playlist_type', 'vod',
      '-hls_flags', 'independent_segments',
      '-hls_segment_filename', path.join(outDir, `${id}_%03d.ts`),
      path.join(outDir, 'index.m3u8')
    ];

    const ff = spawn('ffmpeg', args);

    ff.stdout.on('data', d => console.log('[ffmpeg stdout]', d.toString()));
    ff.stderr.on('data', d => console.log('[ffmpeg stderr]', d.toString()));

    ff.on('close', code => {
      if (code === 0) return resolve();
      return reject(new Error('ffmpeg exited with code ' + code));
    });
  });
}

const worker = new Worker('hlsQueue', async job => {
  try {
    const { id, meta } = job.data;
    if (!meta || !meta.bestAudioUrl) throw new Error('No audio URL');

    const outDir = path.join(HLS_BASE, id);
    if (fs.existsSync(path.join(outDir, 'index.m3u8'))) {
      console.log('HLS already exists for', id);
      return;
    }

    await generateHlsFromUrl(meta.bestAudioUrl, outDir, id);
    console.log('HLS generation complete', id);
  } catch (err) {
    console.error('Error in worker', err);
    throw err;
  }
}, { connection });

worker.on('failed', (job, err) => {
  console.error('Job failed', job.id, err);
});
