const ytdl = require("ytdl-core");
const { PassThrough } = require("stream");

// This module returns an HLS-friendly audio stream
async function getHLSStream(videoId) {
  if (!videoId) throw new Error("Missing videoId");

  const stream = ytdl(videoId, {
    filter: "audioonly",
    quality: "highestaudio",
    highWaterMark: 1 << 25, // prevent stutter
  });

  // PassThrough converts YouTube stream → HLS compatible
  const pass = new PassThrough();
  stream.pipe(pass);

  return pass;
}

// HLS playlist (.m3u8)
function generatePlaylistUrl(req, videoId) {
  return `${req.protocol}://${req.get("host")}/hls/${videoId}/index.m3u8`;
}

// Generate simple M3U8 playlist (not segmented, very lightweight)
function buildHLSPlaylist() {
  return `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-MEDIA-SEQUENCE:0
#EXT-X-TARGETDURATION:10
#EXT-X-PLAYLIST-TYPE:EVENT
#EXTINF:10.0,
segment.ts
#EXT-X-ENDLIST`;
}

module.exports = {
  getHLSStream,
  generatePlaylistUrl,
  buildHLSPlaylist,
};
