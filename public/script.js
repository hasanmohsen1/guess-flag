(function () {
    const room = location.pathname.split("/")[2];

    const h4 = document.querySelector(".h4-container");
    const roomUrlElem = document.getElementById("room-url");
    const main = document.querySelector("main");
    const startButton = document.querySelector("#start-button");
    const pointsSection = document.getElementById("player-points");
    const timerCountdown = document.getElementById("timer");
    const country = document.createElement("h3");

    const socket = io.connect();

    let allFlags = null;
    let timeoutId = null;
    let timeoutCountdownId = null;
    let correctFlag = null;
    let clicked = false;

    roomUrlElem.innerHTML = location.href;
    roomUrlElem.addEventListener("click", () => {
        roomUrlElem.select();
        roomUrlElem.setSelectionRange(0, 99999);
        document.execCommand("copy");

        h4.children[0].innerHTML = "You've copied the link!";
    });

    socket.emit("player-online", room);

    socket.on("send-player-emoji", (data) => {
        startButton.addEventListener(
            "click",
            () => {
                startButton.innerHTML = "BE PREPARED!";
                socket.emit("start-game", room);
            },
            { once: true }
        );
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

    const showCorrectFlag = () => {
        const flagItem = document.getElementById(correctFlag);
        if (!flagItem) {
            return;
        }
        flagItem.classList.add("correct-flag");

        setTimeout(() => {
            flagItem.classList.remove("correct-flag");
        }, 1500);
    };

    const countdown = (num = 10) => {
        if (timeoutCountdownId) {
            clearTimeout(timeoutCountdownId);
        }
        timerCountdown.textContent = num;
        if (num > 0) {
            timeoutCountdownId = setTimeout(countdown, 1000, --num);
        }
    };

    main.addEventListener("click", (event) => {
        if (clicked || !event.target.classList.contains("flag")) {
            return;
        }

        clicked = true;
        if (timeoutId) {
            clearTimeout(timeoutId);
        }
        if (event.target.id == correctFlag) {
            socket.emit("answer-correct");
        } else {
            showCorrectFlag();
        }
        socket.emit("next-question");
    });

    socket.on("question", (data) => {
        if (data.flags) {
            allFlags = JSON.parse(data.flags);
            startButton.style.display = "none";
            h4.style.display = "none";
            main.innerHTML = "";
            allFlags.forEach((element, index) => {
                main.innerHTML += `<img src="${element.flag}" class="flag" id="flag${index}"/>`;
            });
        }
        if (timeoutId) {
            clearTimeout(timeoutId);
        }
        if (timeoutCountdownId) {
            clearTimeout(timeoutCountdownId);
        }
        clicked = false;
        countdown();
        main.prepend(country);
        country.innerHTML = allFlags[data.questionFlag].name;
        correctFlag = data.index;

        timeoutId = setTimeout(() => {
            clicked = true;
            showCorrectFlag();
            socket.emit("next-question");
        }, 10000);
    });

    socket.on("new-player-arrived-later", (flags) => {
        allFlags = JSON.parse(flags);
        startButton.style.display = "none";
        h4.style.display = "none";
        main.innerHTML = "";
        allFlags.forEach((element, index) => {
            main.innerHTML += `<img src="${element.flag}" class="flag" id="flag${index}"/>`;
        });
        main.prepend(country);
        country.innerHTML = "Please, WAIT FOR NEXT ROUND!";
        socket.emit("next-question");
    });

    socket.on("send-points", () => {
        if (timeoutCountdownId) {
            clearTimeout(timeoutCountdownId);
        }
        timerCountdown.textContent = 0;
        socket.emit("send-points");
    });

    socket.on("points", (data) => {
        const pointEmojiElement = document.getElementById(
            `points-${data.socketId}`
        );
        if (pointEmojiElement) {
            pointEmojiElement.children[0].innerHTML = data.points;
            return;
        }
        const pointElem = document.createElement("span");
        pointElem.id = `points-${data.socketId}`;
        pointElem.classList.add("points");
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

    socket.on("end-game", () => {
        pointsSection.style.width = "100vw";
        const endH3 = document.createElement("h3");
        endH3.innerHTML = `GAME OVER!  <a href="/">New game?</a>`;
        pointsSection.prepend(endH3);
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

    socket.on("disconnect", () => {
        window.location.replace("/");
    });
})();
