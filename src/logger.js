// src/logger.js

// Simple custom logger for Render / Node.js
// Keeps logs clean and structured

export default {
    info: (...msg) => console.log(`[INFO]`, ...msg),
    warn: (...msg) => console.warn(`[WARN]`, ...msg),
    error: (...msg) => console.error(`[ERROR]`, ...msg)
};
