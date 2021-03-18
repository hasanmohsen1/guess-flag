(function () {
    const main = document.querySelector("main");
    const startButton = document.querySelector("#start-button");
    const socket = io.connect();

    socket.emit("player-online");

    socket.on("flags", (data) => {
        data.forEach((element, index) => {
            main.innerHTML += `<img src="${element.flag}" class="flag" id="flag${index}"/>`;
        });
        startButton.innerHTML = "BE PREPARED!";
    });

    socket.on("send-player-emoji", (data) => {
        document.body.style.cursor = startButton.style.cursor = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='40' height='60' viewport='0 0 100 100' style='fill:black;font-size:30px;'><text y='50%'>${data.emoji}</text></svg>") 16 0, auto`;
        document.addEventListener("mousemove", function (e) {
            socket.emit("player-mouse-position", {
                ...data,
                x: e.pageX,
                y: e.pageY,
            });
        });
    });

    socket.on("player-mouse-position", (data) => {
        const playerEmoji = document.querySelector("#player" + data.socketId);
        if (playerEmoji) {
            playerEmoji.style.left = data.x + "px";
            playerEmoji.style.top = data.y + "px";
            return;
        }
        const emojiDiv = document.createElement("div");
        document.body.appendChild(emojiDiv);
        emojiDiv.id = "player" + data.socketId;
        emojiDiv.classList.add("emoji");
        emojiDiv.innerHTML = data.emoji;
        emojiDiv.style.left = data.x + "px";
        emojiDiv.style.top = data.y + "px";
    });

    const country = document.createElement("h3");
    let correctFlag = null;

    socket.on("question", (data) => {
        console.log(data);
        startButton.style.display = "none";
        main.prepend(country);
        country.innerHTML = data.name;
        document.addEventListener(
            "click",
            (event) => {
                correctFlag = data.index;
                if (event.target.id == data.index) {
                    socket.emit("answered", "win");
                } else {
                    document.getElementById(data.index).style.border =
                        "10px solid #b6fd8e";
                    setTimeout(() => {
                        document.getElementById(data.index).style.border = "";
                    }, 1500);
                    socket.emit("answered", "lose");
                }
            },
            { once: true }
        );
    });

    socket.on("send-points", () => {
        socket.emit("send-points");
    });

    const pointsSection = document.getElementById("player-points");
    socket.on("points", (data) => {
        const pointEmojiElement = document.getElementById(
            `points-${data.socketId}`
        );
        if (pointEmojiElement) {
            pointEmojiElement.children[0].innerHTML = data.points;
            return;
        }
        const pointElem = document.createElement("span");
        pointElem.classList.add("points");
        pointElem.id = `points-${data.socketId}`;
        pointElem.innerHTML = `${data.emoji}<p>${data.points}</p>`;
        pointsSection.appendChild(pointElem);
    });

    socket.on("winner", (data) => {
        country.innerHTML = "GOOD JOB: ";
        if (data.length) {
            data.forEach((item) => (country.innerHTML += item));
        } else {
            country.innerHTML = "No one knew it !!!";
        }
    });

    socket.on("socket-left", (data) => {
        const playerEmoji = document.querySelector(`#player${data}`);
        if (playerEmoji) {
            document.body.removeChild(playerEmoji);
        }
        const pointEmojiElement = document.getElementById(`points-${data}`);
        if (pointEmojiElement) {
            pointsSection.removeChild(pointEmojiElement);
        }
    });
})();
