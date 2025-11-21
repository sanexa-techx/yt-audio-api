// src/yt-dlp.js
import pkg from "yt-dlp-wrap";
import pRetry from "p-retry";

const { YTDlpWrap } = pkg;

async function fetchYoutubeMeta(videoId) {
    const fetchFn = async () => {
        const ytdlp = new YTDlpWrap();

        const out = await ytdlp.execPromise([
            `https://www.youtube.com/watch?v=${videoId}`,
            "--dump-single-json",
            "--no-warning",
            "--skip-download",
            "--prefer-free-formats"
        ]);

        const info = typeof out === "string" ? JSON.parse(out) : out;

        const bestAudio = (info.formats || [])
            .filter(f => f.acodec && f.acodec !== "none" && (!f.vcodec || f.vcodec === "none"))
            .sort((a, b) => (b.abr || b.tbr || 0) - (a.abr || a.tbr || 0))[0];

        return {
            id: info.id,
            title: info.title,
            duration: info.duration,
            thumbnail: info.thumbnail,
            channel: info.uploader || info.uploader_id,
            bestAudioUrl: bestAudio ? bestAudio.url : null
        };
    };

    return pRetry(fetchFn, { retries: 2 });
}

export { fetchYoutubeMeta };
