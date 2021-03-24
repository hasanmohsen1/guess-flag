const express = require("express");
const socketIO = require("socket.io");
const cryptoRandomString = require("crypto-random-string");
const redis = require("./redis.js");
const flagsArr = require("./countriesflags.json");

// prettier-ignore
const emojis = ['🐸','🐱','🦊', '🐻', '🐼', '🐨', '🐙', '🦁','🐹', '🐰'];

const app = express();

const server = require("http").createServer(app);

server.listen(8080, () => console.log("Server is running"));

app.use(express.static("public"));

app.get("/", (request, response) => {
    response.sendFile(__dirname + "/views/index.html");
});

app.post("/create", async (req, res) => {
    const roomString = cryptoRandomString(8);

    const randomFlags = JSON.stringify(
        flagsArr.sort(() => Math.random() - 0.5).slice(0, 48)
    );
    const questionFlag = Math.floor(Math.random() * 48);
    await redis.HMSET(
        roomString,
        "flags",
        randomFlags,
        "question",
        questionFlag
    );
    await redis.EXPIRE(roomString, 320);

    await redis.SET(roomString + "counter", 0);
    await redis.EXPIRE(roomString + "counter", 320);
    res.redirect(`/room/${roomString}`);
});

app.get("/room/:roomString", (req, res) => {
    res.sendFile(__dirname + "/views/room.html");
});

const io = socketIO(server);

io.on("connection", (socket) => {
    const playerData = {
        emoji: null,
        socketId: socket.id,
        points: 0,
        room: null,
    };

    socket.on("player-online", async (room) => {
        const checkRoomExistence = await redis.EXISTS(room);
        if (!checkRoomExistence) {
            return socket.disconnect();
        }
        socket.join(room);
        if (io.sockets.adapter.rooms.get(room).size > 10) {
            socket.leave(room);
            return socket.disconnect();
        }

        if (await redis.HGET(room, "started")) {
            const flags = redis.HGET(room, "flags");
            socket.emit("new-player-arrived-later", await flags);
        }

        playerData.room = room;
        playerData.emoji = emojis[io.sockets.adapter.rooms.get(room).size - 1];
        socket.emit("send-player-emoji", playerData);
    });

    socket.on("start-game", async (data) => {
        await redis.HSET(data, "started", 1);

        const [randomFlags, questionFlag] = await redis.HMGET(
            data,
            "flags",
            "question"
        );

        io.to(data).emit("question", {
            flags: randomFlags,
            questionFlag,
            index: "flag" + questionFlag,
        });
    });

    socket.on("disconnect", () => {
        if (!playerData.emoji) {
            return;
        }
        console.log(io.sockets.adapter.rooms);
        socket.to(playerData.room).emit("socket-left", socket.id);
    });

    socket.on("player-mouse-position", (data) => {
        socket.broadcast
            .to(playerData.room)
            .emit("player-mouse-position", data);
    });

    socket.on("answer-correct", async () => {
        await redis.LPUSH(playerData.room + "winners", playerData.emoji);
        playerData.points++;
    });

    socket.on("send-points", () => {
        io.to(playerData.room).emit("points", playerData);
    });

    socket.on("next-question", async () => {
        await redis.INCR(playerData.room + "counter");
        const counter = redis.GET(playerData.room + "counter");
        if (
            (await counter) >=
            io.sockets.adapter.rooms.get(playerData.room).size
        ) {
            console.log("next-round", socket.id);
            await redis.SET(playerData.room + "counter", 0);
            const winners = await redis.LRANGE(
                playerData.room + "winners",
                0,
                -1
            );
            await redis.DEL(playerData.room + "winners");

            io.to(playerData.room).emit("winner", winners);
            io.to(playerData.room).emit("send-points");

            const questionFlag = Math.floor(Math.random() * 48);

            await redis.HSET(playerData.room, "question", questionFlag);

            setTimeout(() => {
                io.to(playerData.room).emit("question", {
                    flags: null,
                    questionFlag,
                    index: "flag" + questionFlag,
                });
            }, 3000);
        }
    });
});
