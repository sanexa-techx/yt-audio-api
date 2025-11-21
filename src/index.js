const express = require("express");
const cors = require("cors");
const path = require("path");

const routes = require("./routes");

function createApp() {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());

  // API Routes
  app.use("/", routes);

  // Static HLS directory (segments + playlists)
  app.use("/public", express.static(path.join(__dirname, "..", "public")));

  // Health check
  app.get("/health", (req, res) => {
    res.json({ status: "ok" });
  });

  return app;
}

module.exports = createApp;
