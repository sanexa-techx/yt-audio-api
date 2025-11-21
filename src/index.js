// src/index.js
const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
const routes = require('./routes');

const HLS_BASE = process.env.HLS_BASE || path.join(__dirname, '..', 'public', 'hls');

function createApp() {
  const app = express();
  app.use(helmet());
  app.use(express.json());
  app.use(morgan('combined'));
  app.use(rateLimit({ windowMs: 60_000, max: 60 }));
  // Serve HLS static
  app.use('/hls', express.static(HLS_BASE, { maxAge: '1d' }));
  // API routes
  app.use('/', routes);
  return app;
}

module.exports = createApp;
