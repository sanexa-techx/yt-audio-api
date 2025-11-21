import Redis from "ioredis";

const redisUrl = process.env.REDIS_URL || "redis://127.0.0.1:6379";

// Create Redis client
const redis = new Redis(redisUrl, {
    retryStrategy(times) {
        // reconnect every 2 seconds
        return Math.min(times * 2000, 5000);
    },
});

// Log connection issues
redis.on("error", (err) => {
    console.error("❌ Redis error:", err.message);
});

redis.on("connect", () => {
    console.log("✅ Redis connected:", redisUrl);
});

redis.on("reconnecting", () => {
    console.log("🔄 Redis reconnecting...");
});

// ------------------------------------------------------
// GET
// ------------------------------------------------------
export async function cacheGet(key) {
    try {
        return await redis.get(key);
    } catch (err) {
        console.error("Redis GET error:", err);
        return null;
    }
}

// ------------------------------------------------------
// SET (with TTL)
// ------------------------------------------------------
export async function cacheSet(key, value, ttl = 3600) {
    try {
        return await redis.set(key, value, "EX", ttl);
    } catch (err) {
        console.error("Redis SET error:", err);
        return null;
    }
}

// ------------------------------------------------------
// PUSH to JSON array stored in Redis
// ------------------------------------------------------
export async function cachePushArray(key, value) {
    try {
        let list = await redis.get(key);
        list = list ? JSON.parse(list) : [];
        list.push(value);

        await redis.set(key, JSON.stringify(list));
    } catch (err) {
        console.error("Redis PUSH ARRAY error:", err);
    }
}

export default redis;
