const ytdl = require("ytdl-core");

/**
 * Extract basic YouTube metadata + best audio URL
 */
async function fetchYoutubeMeta(videoId) {
  if (!videoId) throw new Error("Missing video ID");

  const info = await ytdl.getInfo(videoId);

  const formats = info.formats
    .filter(f => f.mimeType?.includes("audio"))
    .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));

  const best = formats[0];

  return {
    id: videoId,
    title: info.videoDetails.title,
    artist: info.videoDetails.author?.name,
    duration: parseInt(info.videoDetails.lengthSeconds) || 0,
    thumbnails: info.videoDetails.thumbnails,
    bestAudioUrl: best?.url || null,
  };
}

/**
 * Validate YouTube video ID
 */
function validateVideoId(videoId) {
  return /^[a-zA-Z0-9_-]{8,20}$/.test(videoId);
}

module.exports = {
  fetchYoutubeMeta,
  validateVideoId,
};
