const express = require("express");
const socketIO = require("socket.io");
const flags = require("./countriesflags.json").sort(() => Math.random() - 0.5);

// prettier-ignore
const emojis = ['🐸','🐱','🦊', '🐻', '🐼', '🐨', '🐙', '🦁','🐹', '🐰'];

const app = express();

const server = require("http").createServer(app);

server.listen(8080, () => console.log("Server is running"));

app.use(express.static("public"));

app.get("/", (request, response) => {
    response.sendFile(__dirname + "/views/index.html");
});

let players = 0;
let playerCounter = 0;
let playerGuess = [];
const gameData = {
    started: false,
    flag: null,
};

const io = socketIO(server);

io.on("connection", (socket) => {
    players = io.sockets.sockets.size;
    const emoji = emojis.pop();
    console.log("socket is now connected", socket.id, emoji);

    socket.on("player-online", () => {
        const playerDate = {
            emoji,
            socketId: socket.id,
        };
        socket.emit("send-player-emoji", playerDate);
        socket.emit("flags", flags.slice(0, 48));
        if (gameData.started) {
            socket.emit("no-button");
            playerCounter++;
            setTimeout(() => {
                socket.emit("question", {
                    ...flags[gameData.flag],
                    index: "flag" + gameData.flag,
                });
            }, 1500);
        }
    });

    socket.on("disconnect", () => {
        console.log(
            `socket with the id: ${socket.id} has disconnected, emoji:${emoji}"`
        );
        playerCounter--;
        players = io.sockets.sockets.size;
        emojis.push(emoji);
        io.emit("socket-left", socket.id);
    });

    socket.on("player-mouse-position", (data) => {
        socket.broadcast.emit("player-mouse-position", data);
    });

    socket.on("start-game", () => {
        playerCounter++;
        if (playerCounter === players && players >= 2 && !gameData.started) {
            gameData.started = true;
            gameData.flag = Math.floor(Math.random() * 48);
            io.emit("question", {
                ...flags[gameData.flag],
                index: "flag" + gameData.flag,
            });
        }
    });

    socket.on("end", (data) => {
        console.log("playerCounter", playerCounter, players);
        playerCounter--;
        if (data === "win") {
            playerGuess.push(emoji);
        }
        if (playerCounter <= 0) {
            io.emit("winner", playerGuess);
            playerCounter = io.sockets.sockets.size;
            playerGuess = [];
            gameData.flag = Math.floor(Math.random() * 48);
            setTimeout(() => {
                io.emit("question", {
                    ...flags[gameData.flag],
                    index: "flag" + gameData.flag,
                });
            }, 3000);
        }
    });
});
