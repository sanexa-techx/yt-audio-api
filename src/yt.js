// src/yt.js
import ytdl from "@distube/ytdl-core";

// Pick best audio-only format
function selectBestAudioFormat(formats) {
  const audioFormats = ytdl.filterFormats(formats, "audioonly");

  if (!audioFormats || audioFormats.length === 0) {
    throw new Error("No audio formats available.");
  }

  // Sort highest bitrate first
  return audioFormats.sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))[0];
}

// Fetch metadata + best audio URL
export async function getYouTubeInfo(videoId) {
  try {
    const info = await ytdl.getInfo(videoId);
    const format = selectBestAudioFormat(info.formats);

    return {
      id: videoId,
      title: info.videoDetails.title,
      author: info.videoDetails.author?.name || "Unknown",
      duration: parseInt(info.videoDetails.lengthSeconds),
      thumbnail:
        info.videoDetails.thumbnails?.[info.videoDetails.thumbnails.length - 1]
          ?.url || null,
      audioUrl: format.url,
      mimeType: format.mimeType || "audio/webm",
      container: format.container || "webm",
      bitrate: format.bitrate || null,
    };
  } catch (err) {
    console.error("❌ YouTube extraction failed:", err);
    throw new Error("Failed to extract YouTube audio");
  }
}

// Direct readable stream (used for /stream/:id)
export function getAudioStream(videoId) {
  return ytdl(videoId, {
    filter: "audioonly",
    quality: "highestaudio",
    highWaterMark: 1 << 25, // High buffer for stability
  });
}
