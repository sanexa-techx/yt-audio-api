// src/yt.js
import { YTDlpWrap } from "yt-dlp-wrap";
import pRetry from "p-retry";

// yt-dlp instance (auto-downloads binary on Render/Vercel)
const ytDlp = new YTDlpWrap();

/**
 * Select the highest bitrate audio-only format
 */
function selectBestAudioFormat(formats) {
  const audioFormats = formats.filter(
    (f) =>
      f.acodec && f.acodec !== "none" &&
      (!f.vcodec || f.vcodec === "none") // audio-only
  );

  if (audioFormats.length === 0) {
    throw new Error("No audio-only formats available.");
  }

  return audioFormats.sort(
    (a, b) => (b.abr || b.tbr || 0) - (a.abr || a.tbr || 0)
  )[0];
}

/**
 * Fetch metadata + best audio URL using yt-dlp-wrap
 */
export async function getYouTubeInfo(videoId) {
  const fetchFn = async () => {
    const url = `https://www.youtube.com/watch?v=${videoId}`;

    const args = [
      url,
      "--dump-single-json",
      "--no-warnings",
      "--skip-download",
      "--prefer-free-formats",
    ];

    const raw = await ytDlp.execPromise(args);
    const info = JSON.parse(raw);

    const bestAudio = selectBestAudioFormat(info.formats);

    return {
      id: info.id,
      title: info.title,
      author: info.uploader || info.channel || "Unknown",
      duration: info.duration || null,
      thumbnail:
        info.thumbnail ||
        info.thumbnails?.[info.thumbnails.length - 1]?.url ||
        null,

      // best audio URL
      audioUrl: bestAudio.url,
      mimeType: bestAudio.ext ? `audio/${bestAudio.ext}` : "audio/mpeg",
      container: bestAudio.ext || "m4a",
      bitrate: bestAudio.abr || bestAudio.tbr || null,
    };
  };

  return await pRetry(fetchFn, {
    retries: 2,
  });
}

/**
 * Direct streaming (used for `/stream/:id`)
 * yt-dlp can output directly to stdout for streaming
 */
export function getAudioStream(videoId) {
  const url = `https://www.youtube.com/watch?v=${videoId}`;

  const args = [
    url,
    "-f", "bestaudio",
    "-o", "-", // output to stdout
  ];

  return ytDlp.exec(args); // returns Readable stream
                      }
