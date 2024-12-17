const redis = require("redis");
const { promisify } = require("util");

const redisConfig = {
    url: process.env.REDIS_URL || "redis://127.0.0.1:6379"
};

const client = redis.createClient(redisConfig);

client.on("error", function (error) {
    console.log("redis", error);
});

module.exports.GET = promisify(client.GET).bind(client);
module.exports.SET = promisify(client.SET).bind(client);
module.exports.INCR = promisify(client.INCR).bind(client);
module.exports.DEL = promisify(client.DEL).bind(client);
module.exports.HMSET = promisify(client.HMSET).bind(client);
module.exports.HSET = promisify(client.HSET).bind(client);
module.exports.HGET = promisify(client.HGET).bind(client);
module.exports.HMGET = promisify(client.HMGET).bind(client);
module.exports.HEXISTS = promisify(client.HEXISTS).bind(client);
module.exports.LPUSH = promisify(client.LPUSH).bind(client);
module.exports.LRANGE = promisify(client.LRANGE).bind(client);
module.exports.EXPIRE = promisify(client.EXPIRE).bind(client);
module.exports.EXISTS = promisify(client.EXISTS).bind(client);
