const express = require("express");
const socketIO = require("socket.io");
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

const gameData = {
    playerCounter: 0,
    started: false,
    flag: null,
    playerGuess: [],
    timeoutId: null,
    flags: [],
};

function startGame(io, socket) {
    if (gameData.started) {
        socket.emit("question", {
            ...gameData.flags[gameData.flag],
            index: "flag" + gameData.flag,
        });
        return;
    }
    if (gameData.timeoutId) {
        clearTimeout(gameData.timeoutId);
    }
    gameData.timeoutId = setTimeout(() => {
        gameData.started = true;
        gameData.flag = Math.floor(Math.random() * 48);
        io.emit("question", {
            ...gameData.flags[gameData.flag],
            index: "flag" + gameData.flag,
        });
    }, 5000);
}

const io = socketIO(server);

io.on("connection", (socket) => {
    if (!emojis.length) {
        socket.disconnect();
    }
    const playerData = {
        emoji: emojis.pop(),
        socketId: socket.id,
        points: 0,
    };
    console.log("socket is now connected", socket.id, emoji);

    if (io.sockets.sockets.size === 1) {
        gameData.flags = flagsArr.sort(() => Math.random() - 0.5).slice(0, 48);
    }

    socket.on("player-online", () => {
        socket.emit("send-player-emoji", playerData);
        socket.emit("flags", gameData.flags);
        startGame(io, socket);
    });

    socket.on("disconnect", () => {
        console.log(
            `socket with the id: ${socket.id} has disconnected, emoji:${playerData.emoji}"`
        );
        emojis.push(playerData.emoji);
        io.emit("socket-left", socket.id);
        nextQuestion();
    });

    socket.on("player-mouse-position", (data) => {
        socket.broadcast.emit("player-mouse-position", data);
    });

    socket.on("answered", (data) => {
        gameData.playerCounter++;
        console.log(gameData);
        if (data === "win") {
            gameData.playerGuess.push(playerData.emoji);
            playerData.points++;
        }
        nextQuestion();
    });

    socket.on("send-points", () => {
        io.emit("points", playerData);
    });

    function nextQuestion() {
        if (gameData.playerCounter >= io.sockets.sockets.size) {
            io.emit("winner", gameData.playerGuess);
            gameData.playerCounter = 0;
            gameData.playerGuess = [];
            gameData.flag = Math.floor(Math.random() * 48);
            io.emit("send-points");
            setTimeout(() => {
                io.emit("question", {
                    ...gameData.flags[gameData.flag],
                    index: "flag" + gameData.flag,
                });
            }, 3000);
        }
    }
});
