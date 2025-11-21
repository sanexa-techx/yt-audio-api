// src/yt-dlp.js
const ytdlp = require('yt-dlp-exec');
const pRetry = require('p-retry');

async function fetchYoutubeMeta(videoId) {
  const fetchFn = async () => {
    const out = await ytdlp(`https://www.youtube.com/watch?v=${videoId}`, {
      dumpSingleJson: true,
      noWarnings: true,
      preferFreeFormats: true,
      skipDownload: true
    });
    // yt-dlp-exec often returns JSON string
    const info = typeof out === 'string' ? JSON.parse(out) : out;

    const bestAudio = (info.formats || [])
      .filter(f => f.acodec && f.acodec !== 'none' && (!f.vcodec || f.vcodec === 'none'))
      .sort((a,b) => (b.abr || b.tbr || 0) - (a.abr || a.tbr || 0))[0];

    return {
      id: info.id,
      title: info.title,
      duration: info.duration,
      thumbnail: info.thumbnail,
      channel: info.uploader || info.uploader_id,
      bestAudioUrl: bestAudio ? bestAudio.url : null
    };
  };

  const info = await pRetry(fetchFn, { retries: Number(process.env.MAX_RETRIES || 2) });
  return info;
}

module.exports = { fetchYoutubeMeta };
