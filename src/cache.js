import Redis from "ioredis";

const redisUrl = process.env.REDIS_URL || "redis://127.0.0.1:6379";
const redis = new Redis(redisUrl);

export async function cacheGet(key) {
    try {
        return await redis.get(key);
    } catch (err) {
        console.error("Redis get error:", err);
        return null;
    }
}

export async function cacheSet(key, value, ttl = 3600) {
    try {
        return await redis.set(key, value, "EX", ttl);
    } catch (err) {
        console.error("Redis set error:", err);
        return null;
    }
}

export async function cachePushArray(key, value) {
    try {
        let list = await redis.get(key);
        list = list ? JSON.parse(list) : [];
        list.push(value);
        await redis.set(key, JSON.stringify(list));
    } catch (err) {
        console.error("Redis array push error:", err);
    }
}

export default redis;
