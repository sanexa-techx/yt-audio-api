// src/yt-dlp.js
import { YTDlpWrap } from "yt-dlp-wrap";
import pRetry from "p-retry";
import path from "path";

// Optional: use bundled yt-dlp binary
const ytDlp = new YTDlpWrap();

async function fetchYoutubeMeta(videoId) {
  const fetchFn = async () => {
    const url = `https://www.youtube.com/watch?v=${videoId}`;

    const args = [
      url,
      "--dump-single-json",
      "--no-warnings",
      "--skip-download",
      "--prefer-free-formats"
    ];

    const output = await ytDlp.execPromise(args);

    // yt-dlp-wrap returns JSON string
    const info = JSON.parse(output);

    // pick best audio-only format
    const bestAudio = (info.formats || [])
      .filter(f =>
        f.acodec && f.acodec !== "none" &&
        (!f.vcodec || f.vcodec === "none")
      )
      .sort((a, b) =>
        (b.abr || b.tbr || 0) - (a.abr || a.tbr || 0)
      )[0];

    return {
      id: info.id,
      title: info.title,
      duration: info.duration,
      thumbnail: info.thumbnail || (info.thumbnails?.[0]?.url ?? null),
      channel: info.uploader || info.channel,
      bestAudioUrl: bestAudio?.url || null
    };
  };

  return await pRetry(fetchFn, {
    retries: Number(process.env.MAX_RETRIES || 2)
  });
}

export { fetchYoutubeMeta };
