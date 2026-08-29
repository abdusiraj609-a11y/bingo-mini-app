/* =========================================================
   BEHERAWI BINGO
   FRONTEND APPLICATION ENGINE
   ========================================================= */

"use strict";

/* =========================================================
   TELEGRAM
   ========================================================= */

const tg = window.Telegram?.WebApp || null;

if (tg) {
    try {
        tg.ready();
        tg.expand();
    } catch (error) {
        console.warn("Telegram WebApp initialization failed:", error);
    }
}


/* =========================================================
   APPLICATION STATE
   ========================================================= */

const state = {

    screen: "selection",

    roundNumber: 18766,

    maxSlots: 500,

    selectedSlots: [],

    maxCartelas: 2,

    cartelas: [],

    takenSlots: new Set(),

    players: 0,

    balance: 0,

    prizePool: 0,

    calledBalls: [],

    currentBall: null,

    gameStartedAt: null,

    soundEnabled: true,

    selectionCountdown: 0,

    waitingCountdown: 0,

    loading: true

};


/* =========================================================
   DOM HELPERS
   ========================================================= */

const $ = (selector) => document.querySelector(selector);

const $$ = (selector) => document.querySelectorAll(selector);


/* =========================================================
   ELEMENTS
   ========================================================= */

const elements = {

    loadingOverlay: $("#loadingOverlay"),
    loadingStatus: $("#loadingStatus"),

    slotSelectionScreen: $("#slotSelectionScreen"),
    waitingScreen: $("#waitingScreen"),
    liveGameScreen: $("#liveGameScreen"),
    winnerScreen: $("#winnerScreen"),

    slotsGrid: $("#slotsGrid"),

    cartelasContainer: $("#cartelasContainer"),
    liveCartelasContainer: $("#liveCartelasContainer"),

    cartelaCount: $("#cartelaCount"),
    liveCartelaCount: $("#liveCartelaCount"),

    playersCount: $("#playersCount"),
    livePlayersCount: $("#livePlayersCount"),
    waitingPlayers: $("#waitingPlayers"),

    balance: $("#balance"),
    prizePool: $("#prizePool"),
    livePrizePool: $("#livePrizePool"),

    roundNumber: $("#roundNumber"),
    waitingRoundNumber: $("#waitingRoundNumber"),
    liveRoundNumber: $("#liveRoundNumber"),

    calledCount: $("#calledCount"),
    liveCalledCount: $("#liveCalledCount"),

    closeCountdown: $("#closeCountdown"),
    startCountdown: $("#startCountdown"),

    currentBall: $("#currentBall"),
    currentBallNumber: $("#currentBallNumber"),
    currentBallLetter: $("#currentBallLetter"),
    currentBallMeta: $("#currentBallMeta"),

    recentBalls: $("#recentBalls"),
    ballMatrix: $("#ballMatrix"),

    notification: $("#notification"),

    soundButton: $("#soundButton"),

    autoAssignButton: $("#autoAssignButton"),
    clearButton: $("#clearButton"),

    nextRoundButton: $("#nextRoundButton"),

    winnerPlayer: $("#winnerPlayer"),
    winnerCartela: $("#winnerCartela"),
    winnerPayout: $("#winnerPayout"),

    winnerBallsCalled: $("#winnerBallsCalled"),
    winnerLines: $("#winnerLines"),
    winnerDuration: $("#winnerDuration"),

    winningCartelaContainer:
        $("#winningCartelaContainer")

};


/* =========================================================
   INITIALIZATION
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {

    initializeApplication();

});


function initializeApplication() {

    updateLoading("STARTING...");

    // Load only what is needed for the first screen.
    initializeSlots();

    updateLoading("EVENTS...");
    bindEvents();

    updateLoading("EVENTS DONE...");

    // Update lightweight interface data only.
    updateRound();
    updatePlayers();
    updateMoney();
    updateSlots();
    updateCartelaCounters();

    updateLoading("READY");

    // Tell Telegram that the Mini App is ready.
    if (window.Telegram &&
        window.Telegram.WebApp) {
        window.Telegram.WebApp.ready();
        window.Telegram.WebApp.expand();
    }

    // Hide the loading screen immediately after the first screen is ready.
    requestAnimationFrame(() => {
        hideLoading();
    });
}


/* =========================================================
   LOADING
   ========================================================= */

function updateLoading(message) {

    if (elements.loadingStatus) {
        elements.loadingStatus.textContent = message;
    }

}


function hideLoading() {

    state.loading = false;

    if (!elements.loadingOverlay) {
        return;
    }

    elements.loadingOverlay.style.transition =
        "opacity .25s ease";

    elements.loadingOverlay.style.opacity = "0";

    setTimeout(() => {

        elements.loadingOverlay.style.display =
            "none";

    }, 260);

}


/* =========================================================
   SLOT SYSTEM
   ========================================================= */

function initializeSlots() {

    if (!elements.slotsGrid) {
        return;
    }

    elements.slotsGrid.innerHTML = "";

    for (let number = 1; number <= state.maxSlots; number++) {

        const slot = document.createElement("button");

        slot.type = "button";

        slot.className = "slot";

        slot.dataset.slot = number;

        slot.textContent = number;

        // SLOT CLICK TEST DISABLED

        elements.slotsGrid.appendChild(slot);

    }

}


function selectSlot(number) {

    if (state.takenSlots.has(number)) {
        showNotification("This slot is already taken.");
        return;
    }

    const index = state.selectedSlots.indexOf(number);

    if (index !== -1) {

        state.selectedSlots.splice(index, 1);

        state.cartelas =
            state.cartelas.filter(
                cartela => cartela.slot !== number
            );

    } else {

        if (state.selectedSlots.length >= state.maxCartelas) {
            showNotification("Maximum 2 slots.");
            return;
        }

        state.selectedSlots.push(number);

        state.cartelas.push(
            createCartela(number)
        );
    }

    updateSlots();
    renderCartelas();
}

/* =========================================================
   AUTO ASSIGN
   ========================================================= */

function autoAssignSlots() {

    clearSlots(false);


    while (
        state.selectedSlots.length <
        state.maxCartelas
    ) {

        const number =
            Math.floor(
                Math.random() *
                state.maxSlots
            ) + 1;


        if (
            state.takenSlots.has(number) ||
            state.selectedSlots.includes(number)
        ) {
            continue;
        }


        state.selectedSlots.push(number);

    }


    updateSlots();

    updateCartelas();

    showNotification(
        "Slots assigned."
    );

}


/* =========================================================
   CLEAR
   ========================================================= */

function clearSlots(showMessage = true) {

    state.selectedSlots = [];
    state.cartelas = [];

    updateSlots();
    renderCartelas();

    if (showMessage) {
        showNotification("Selection cleared.");
    }
}

/* =========================================================
   CARTELA SYSTEM
   ========================================================= */

function initializeCartelas() {
    renderCartelas();
}

/* =========================================================
   CREATE A NEW CARTELA
   ========================================================= */

function createCartela(slotNumber) {
    return {
        slot: slotNumber,
        numbers: generateBingoCard(),
        marked: new Set(["FREE"])
    };
}

/* =========================================================
   RENDER CARTELAS
   ========================================================= */

function renderCartelas() {

    if (!elements.cartelasContainer) {
        return;
    }

    elements.cartelasContainer.innerHTML = "";

    state.cartelas.forEach(cartela => {
        elements.cartelasContainer.appendChild(
            renderCartela(cartela, true)
        );
    });

    while (state.cartelas.length < state.maxCartelas) {

        const empty = document.createElement("div");
        empty.className = "cartela-box empty-cartela";

        empty.innerHTML = `
            <div class="empty-cartela-content">
                + EMPTY CARTELA
            </div>
        `;

        elements.cartelasContainer.appendChild(empty);
    }

    updateCartelaCounters();
}

/* =========================================================
   RENDER SINGLE CARTELA
   ========================================================= */

function renderCartela(cartela, removable) {

    const wrapper = document.createElement("div");
    wrapper.className = "cartela-box";

    const top = document.createElement("div");
    top.className = "cartela-top";

    const label = document.createElement("span");
    label.textContent = `SLOT ${cartela.slot}`;

    top.appendChild(label);

    if (removable) {

        const remove = document.createElement("button");

        remove.type = "button";
        remove.className = "remove-cartela";
        remove.textContent = "REMOVE";

        remove.addEventListener("click", () => {

            const index =
                state.selectedSlots.indexOf(cartela.slot);

            if (index !== -1) {
                state.selectedSlots.splice(index, 1);
            }

            state.cartelas =
                state.cartelas.filter(
                    item => item.slot !== cartela.slot
                );

            updateSlots();
            renderCartelas();
        });

        top.appendChild(remove);
    }

    wrapper.appendChild(top);
    wrapper.appendChild(renderBingoCard(cartela));

    return wrapper;
}

/* =========================================================
   LIVE CARTELAS
   ========================================================= */

function updateLiveCartelas() {

    if (!elements.liveCartelasContainer) {
        return;
    }

    elements.liveCartelasContainer.innerHTML = "";

    state.cartelas.forEach(cartela => {

        elements.liveCartelasContainer.appendChild(
            renderCartela(cartela, false)
        );

    });

    updateCartelaCounters();
}

/* =========================================================
   BINGO CARD GENERATION
   ========================================================= */

function generateBingoCard() {

    const columns = [

        randomNumbers(1, 15, 5),

        randomNumbers(16, 30, 5),

        randomNumbers(31, 45, 5),

        randomNumbers(46, 60, 5),

        randomNumbers(61, 75, 5)

    ];


    const card = [];

    for (let row = 0; row < 5; row++) {

        card[row] = [];

        for (
            let column = 0;
            column < 5;
            column++
        ) {

            if (
                row === 2 &&
                column === 2
            ) {

                card[row][column] = "FREE";

            } else {

                card[row][column] =
                    columns[column][row];

            }

        }

    }

    return card;

}


function randomNumbers(min, max, count) {

    const numbers = [];

    for (let n = min; n <= max; n++) {
        numbers.push(n);
    }


    for (
        let i = numbers.length - 1;
        i > 0;
        i--
    ) {

        const j =
            Math.floor(
                Math.random() * (i + 1)
            );

        [
            numbers[i],
            numbers[j]
        ] = [
            numbers[j],
            numbers[i]
        ];

    }


    return numbers.slice(0, count);

}


/* =========================================================
   CARTELA RENDERING
   ========================================================= */

function renderCartela(cartela, removable) {

    const wrapper =
        document.createElement("div");

    wrapper.className =
        "cartela-box";

    const top =
        document.createElement("div");

    top.className =
        "cartela-top";


    const label =
        document.createElement("span");

    label.textContent =
        `SLOT ${cartela.slot}`;


    top.appendChild(label);


    if (removable) {

        const remove =
            document.createElement("button");

        remove.type = "button";

        remove.className =
            "remove-cartela";

        remove.textContent =
            "REMOVE";

        remove.addEventListener(
            "click",
            () => {

                const index =
                    state.selectedSlots.indexOf(
                        cartela.slot
                    );

                if (index !== -1) {

                    state.selectedSlots.splice(
                        index,
                        1
                    );

                }

                updateSlots();

                updateCartelas();

            }
        );

        top.appendChild(remove);

    }


    wrapper.appendChild(top);

    wrapper.appendChild(
        renderBingoCard(cartela)
    );

    return wrapper;

}


function renderBingoCard(cartela) {

    const card =
        document.createElement("div");

    card.className =
        "bingo-card";


    const letters =
        ["B", "I", "N", "G", "O"];


    letters.forEach(letter => {

        const header =
            document.createElement("div");

        header.className =
            "bingo-header";

        header.textContent =
            letter;

        card.appendChild(header);

    });


    for (let row = 0; row < 5; row++) {

        for (
            let column = 0;
            column < 5;
            column++
        ) {

            const value =
                cartela.numbers[row][column];

            const cell =
                document.createElement("div");

            cell.className =
                "bingo-cell";


            if (value === "FREE") {

                cell.classList.add("free");

                cell.textContent =
                    "FREE";

            } else {

                cell.textContent =
                    value;

                if (
                    state.calledBalls.includes(value)
                ) {

                    cell.classList.add(
                        "called"
                    );

                }

                if (
                    state.currentBall === value
                ) {

                    cell.classList.add(
                        "current"
                    );

                }

            }


            card.appendChild(cell);

        }

    }


    return card;

}


/* =========================================================
   LIVE CARTELAS
   ========================================================= */

function updateLiveCartelas() {

    if (!elements.liveCartelasContainer) {
        return;
    }

    elements.liveCartelasContainer.innerHTML = "";


    state.cartelas.forEach(cartela => {

        elements.liveCartelasContainer.appendChild(
            renderCartela(cartela, false)
        );

    });


    updateCartelaCounters();

}


/* =========================================================
   MATRIX
   ========================================================= */

function initializeMatrix() {

    if (!elements.ballMatrix) {
        return;
    }

    elements.ballMatrix.innerHTML = "";


    const letters =
        ["B", "I", "N", "G", "O"];


    letters.forEach(letter => {

        const header =
            document.createElement("div");

        header.className =
            "matrix-header";

        header.textContent =
            letter;

        elements.ballMatrix.appendChild(
            header
        );

    });


    for (
        let number = 1;
        number <= 75;
        number++
    ) {

        const cell =
            document.createElement("div");

        cell.className =
            "matrix-cell";

        cell.dataset.number =
            number;

        cell.textContent =
            number;

        elements.ballMatrix.appendChild(
            cell
        );

    }


    updateMatrix();

}


function updateMatrix() {

    if (!elements.ballMatrix) {
        return;
    }


    const cells =
        elements.ballMatrix.querySelectorAll(
            ".matrix-cell"
        );


    cells.forEach(cell => {

        const number =
            Number(cell.dataset.number);


        cell.classList.toggle(
            "called",
            state.calledBalls.includes(number)
        );


        cell.classList.toggle(
            "current",
            state.currentBall === number
        );

    });

}


/* =========================================================
   DRAWN BALL
   ========================================================= */

function drawBall() {

    const available = [];

    for (let number = 1; number <= 75; number++) {

        if (!state.calledBalls.includes(number)) {
            available.push(number);
        }

    }

    if (!available.length) {

        showNotification(
            "All balls have been called."
        );

        stopAutoDraw();

        return null;

    }

    const index =
        Math.floor(
            Math.random() * available.length
        );

    const number =
        available[index];

    state.currentBall = number;

    state.calledBalls.push(number);

    updateBallDisplay();

    updateMatrix();

    updateLiveCartelas();

    playBallSound();


    /* =====================================================
       CHECK ALL PLAYER CARTELAS FOR BINGO
       Any complete horizontal, vertical or diagonal line
       immediately ends the round.
       ===================================================== */

    for (
        let index = 0;
        index < state.cartelas.length;
        index++
    ) {

        const cartela =
            state.cartelas[index];

        const winningLines =
            countWinningLines(cartela);

        if (winningLines > 0) {

            stopAutoDraw();

            showWinner(index);

            return number;

        }

    }


    return number;

}


let autoDrawTimer = null;


function stopAutoDraw() {

    if (autoDrawTimer !== null) {

        clearInterval(autoDrawTimer);

        autoDrawTimer = null;

    }

}


function getBallLetter(number) {

    if (number <= 15) {
        return "B";
    }

    if (number <= 30) {
        return "I";
    }

    if (number <= 45) {
        return "N";
    }

    if (number <= 60) {
        return "G";
    }

    return "O";

}


function updateBallDisplay() {

    const number =
        state.currentBall;


    if (!number) {

        elements.currentBallNumber.textContent =
            "--";

        elements.currentBallLetter.textContent =
            "—";

        elements.currentBallMeta.textContent =
            "Column — · #—";

        return;

    }


    const letter =
        getBallLetter(number);


    elements.currentBallNumber.textContent =
        number;

    elements.currentBallLetter.textContent =
        letter;

    elements.currentBallMeta.textContent =
        `Column ${letter} · #${number}`;


    renderRecentBalls();


    if (elements.calledCount) {

        elements.calledCount.textContent =
            `${state.calledBalls.length}/75`;

    }


    if (elements.liveCalledCount) {

        elements.liveCalledCount.textContent =
            `${state.calledBalls.length}/75`;

    }

}


function renderRecentBalls() {

    if (!elements.recentBalls) {
        return;
    }

    elements.recentBalls.innerHTML = "";


    const recent =
        state.calledBalls.slice(-6);


    recent.reverse().forEach(number => {

        const ball =
            document.createElement("div");

        ball.className =
            "recent-ball";

        ball.textContent =
            number;

        elements.recentBalls.appendChild(
            ball
        );

    });

}


/* =========================================================
   GAME STATUS
   ========================================================= */

function updateInterface() {

    updateRound();

    updatePlayers();

    updateMoney();

    updateSlots();

    updateCartelas();

    updateBallDisplay();

    updateMatrix();

}


function updateRound() {

    const round =
        `#${state.roundNumber}`;


    if (elements.roundNumber) {
        elements.roundNumber.textContent =
            round;
    }

    if (elements.waitingRoundNumber) {
        elements.waitingRoundNumber.textContent =
            round;
    }

    if (elements.liveRoundNumber) {
        elements.liveRoundNumber.textContent =
            round;
    }

}


function updatePlayers() {

    const value =
        String(state.players);


    if (elements.playersCount) {
        elements.playersCount.textContent =
            value;
    }

    if (elements.livePlayersCount) {
        elements.livePlayersCount.textContent =
            value;
    }

    if (elements.waitingPlayers) {
        elements.waitingPlayers.textContent =
            `${value} PLAYERS`;
    }

}


function updateMoney() {

    const balance =
        Number(state.balance).toFixed(2);


    if (elements.balance) {
        elements.balance.textContent =
            balance;
    }


    if (elements.prizePool) {
        elements.prizePool.textContent =
            state.prizePool;
    }


    if (elements.livePrizePool) {
        elements.livePrizePool.textContent =
            state.prizePool;
    }

}


function updateCartelaCounters() {

    const count =
        state.selectedSlots.length;


    if (elements.cartelaCount) {

        elements.cartelaCount.textContent =
            `(${count}/2)`;

    }


    if (elements.liveCartelaCount) {

        elements.liveCartelaCount.textContent =
            `(${count})`;

    }

}


/* =========================================================
   SCREEN MANAGEMENT
   ========================================================= */

function showScreen(screenName) {

    state.screen = screenName;

    const screens = {
        selection: elements.slotSelectionScreen,
        waiting: elements.waitingScreen,
        live: elements.liveGameScreen,
        winner: elements.winnerScreen
    };

    Object.entries(screens).forEach(([name, element]) => {

        if (!element) {
            return;
        }

        element.classList.toggle(
            "active",
            name === screenName
        );
    });

    // Heavy live-game elements are created only when needed.
    if (screenName === "live") {

        if (elements.ballMatrix &&
            elements.ballMatrix.children.length === 0) {

            initializeMatrix();
        }

        updateLiveCartelas();
        updateMatrix();
    }
}


/* =========================================================
   START DEMO ROUND
   ========================================================= */

function startRound() {

    if (!state.selectedSlots.length) {

        showNotification(
            "Select at least one slot."
        );

        return;

    }


    state.gameStartedAt =
        Date.now();


    state.calledBalls = [];

    state.currentBall = null;


    showScreen("waiting");


    startWaitingCountdown();

}


function startWaitingCountdown() {

    state.waitingCountdown = 3;

    updateCountdownDisplay();


    const timer =
        setInterval(() => {

            state.waitingCountdown--;

            updateCountdownDisplay();


            if (
                state.waitingCountdown <= 0
            ) {

                clearInterval(timer);

                startLiveGame();

            }

        }, 1000);

}


function startLiveGame() {

    showScreen("live");

    state.gameStartedAt =
        Date.now();

    updateLiveCartelas();

    stopAutoDraw();

    autoDrawTimer = setInterval(() => {

        if (state.screen !== "live") {
            stopAutoDraw();
            return;
        }

        drawBall();

    }, 3000);

}


function updateCountdownDisplay() {

    const seconds =
        Math.max(
            0,
            state.waitingCountdown
        );


    const formatted =
        `00:${String(seconds).padStart(2, "0")}`;


    if (elements.startCountdown) {

        elements.startCountdown.textContent =
            formatted;

    }

}


/* =========================================================
   WINNER
   ========================================================= */

function showWinner(cartelaIndex = 0) {

    const cartela =
        state.cartelas[cartelaIndex];


    if (!cartela) {
        return;
    }


    showScreen("winner");


    if (elements.winnerPlayer) {

        elements.winnerPlayer.textContent =
            "YOU";

    }


    if (elements.winnerCartela) {

        elements.winnerCartela.textContent =
            `SLOT ${cartela.slot}`;

    }


    if (elements.winnerPayout) {

        elements.winnerPayout.textContent =
            state.prizePool;

    }


    if (elements.winnerBallsCalled) {

        elements.winnerBallsCalled.textContent =
            state.calledBalls.length;

    }


    if (elements.winnerLines) {

        elements.winnerLines.textContent =
            countWinningLines(cartela);

    }


    if (elements.winnerDuration) {

        const seconds =
            Math.floor(
                (
                    Date.now() -
                    state.gameStartedAt
                ) / 1000
            );

        elements.winnerDuration.textContent =
            `${seconds}s`;

    }


    if (
        elements.winningCartelaContainer
    ) {

        elements.winningCartelaContainer.innerHTML =
            "";

        elements.winningCartelaContainer.appendChild(
            renderCartela(
                cartela,
                false
            )
        );

    }

}


/* =========================================================
   BINGO CHECK
   ========================================================= */

function countWinningLines(cartela) {

    let lines = 0;


    for (let row = 0; row < 5; row++) {

        let complete = true;


        for (
            let column = 0;
            column < 5;
            column++
        ) {

            const value =
                cartela.numbers[row][column];


            if (
                value !== "FREE" &&
                !state.calledBalls.includes(value)
            ) {

                complete = false;

                break;

            }

        }


        if (complete) {
            lines++;
        }

    }


    for (
        let column = 0;
        column < 5;
        column++
    ) {

        let complete = true;


        for (let row = 0; row < 5; row++) {

            const value =
                cartela.numbers[row][column];


            if (
                value !== "FREE" &&
                !state.calledBalls.includes(value)
            ) {

                complete = false;

                break;

            }

        }


        if (complete) {
            lines++;
        }

    }


    let diagonalOne = true;

    let diagonalTwo = true;


    for (let i = 0; i < 5; i++) {

        const valueOne =
            cartela.numbers[i][i];

        const valueTwo =
            cartela.numbers[i][4 - i];


        if (
            valueOne !== "FREE" &&
            !state.calledBalls.includes(valueOne)
        ) {

            diagonalOne = false;

        }


        if (
            valueTwo !== "FREE" &&
            !state.calledBalls.includes(valueTwo)
        ) {

            diagonalTwo = false;

        }

    }


    if (diagonalOne) {
        lines++;
    }

    if (diagonalTwo) {
        lines++;
    }


    return lines;

}


/* =========================================================
   SOUND
   ========================================================= */

let audioContext = null;


function playBallSound() {

    if (!state.soundEnabled) {
        return;
    }


    try {

        if (!audioContext) {

            audioContext =
                new (
                    window.AudioContext ||
                    window.webkitAudioContext
                )();

        }


        const oscillator =
            audioContext.createOscillator();

        const gain =
            audioContext.createGain();


        oscillator.type =
            "sine";

        oscillator.frequency.value =
            520;


        gain.gain.setValueAtTime(
            0.0001,
            audioContext.currentTime
        );


        gain.gain.exponentialRampToValueAtTime(
            0.12,
            audioContext.currentTime + 0.015
        );


        gain.gain.exponentialRampToValueAtTime(
            0.0001,
            audioContext.currentTime + 0.18
        );


        oscillator.connect(gain);

        gain.connect(
            audioContext.destination
        );


        oscillator.start();

        oscillator.stop(
            audioContext.currentTime + 0.2
        );

    } catch (error) {

        console.warn(
            "Audio unavailable:",
            error
        );

    }

}


/* =========================================================
   NOTIFICATION
   ========================================================= */

let notificationTimer = null;


function showNotification(message) {

    if (!elements.notification) {
        return;
    }


    elements.notification.textContent =
        message;


    elements.notification.classList.add(
        "show"
    );


    clearTimeout(notificationTimer);


    notificationTimer =
        setTimeout(() => {

            elements.notification.classList.remove(
                "show"
            );

        }, 1800);

}


/* =========================================================
   EVENT HANDLERS
   ========================================================= */

function bindEvents() {

    console.log("EVENT DEBUG 1 - bindEvents START");

    if (elements.autoAssignButton) {
        console.log("EVENT DEBUG 2 - autoAssign");
        elements.autoAssignButton.addEventListener(
            "click",
            autoAssignSlots
        );
    }

    if (elements.clearButton) {
        console.log("EVENT DEBUG 3 - clear");
        elements.clearButton.addEventListener(
            "click",
            () => clearSlots(true)
        );
    }

    if (elements.soundButton) {
        console.log("EVENT DEBUG 4 - sound");
        elements.soundButton.addEventListener(
            "click",
            toggleSound
        );
    }

    if (elements.nextRoundButton) {
        console.log("EVENT DEBUG 5 - nextRound");
        elements.nextRoundButton.addEventListener(
            "click",
            nextRound
        );
    }

    if (elements.roundNumber) {
        console.log("EVENT DEBUG 6 - round");
        elements.roundNumber.addEventListener(
            "dblclick",
            startRound
        );
    }

    console.log("EVENT DEBUG 7 - bindEvents DONE");
}


/* =========================================================
   SOUND TOGGLE
   ========================================================= */

function toggleSound() {

    state.soundEnabled =
        !state.soundEnabled;


    if (elements.soundButton) {

        elements.soundButton.textContent =
            state.soundEnabled
                ? "🔊"
                : "🔇";

    }


    showNotification(
        state.soundEnabled
            ? "Sound enabled."
            : "Sound disabled."
    );

}


/* =========================================================
   NEXT ROUND
   ========================================================= */

function nextRound() {

    stopAutoDraw();

    state.roundNumber++;

    state.calledBalls = [];

    state.currentBall = null;

    state.gameStartedAt = null;

    showScreen("selection");

    updateInterface();

}


/* =========================================================
   DEVELOPMENT API
   =========================================================
   These functions are exposed temporarily so the frontend
   can be tested before the real server is connected.
   ========================================================= */

window.BingoApp = {

    state,

    selectSlot,

    autoAssignSlots,

    clearSlots,

    startRound,

    startLiveGame,

    drawBall,

    showWinner,

    nextRound,

    showScreen,

    updateInterface

};


/* =========================================================
   DEVELOPMENT CONSOLE MESSAGE
   ========================================================= */

console.log(
    "Beherawi Bingo frontend initialized."
);
