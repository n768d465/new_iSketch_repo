"use strict";

// JS includes.
const path = require('path')
const express = require('express'),
    app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);

// Directories
app.use(express.static(path.join(__dirname, '/docs/lib')));
app.use(express.static(path.join(__dirname + '/docs/src')));
app.use(express.static(path.join(__dirname + '/node_modules')));

// Obtains the HTML file to establish a connection with.
app.get('/', function (req, res) {
    res.sendFile(path.join(__dirname + '/docs/index.html'));
});

// Uses the TCP port to establish a connection.
http.listen(8080, function () {
    console.log('Connected to *:80. Listening...');
});

const roundTime = 120 * 1000;
const activityTime = 25 * 1000;

var users = [];
var drawingQueue = [];
var timer;
var alarmTimer;
var roundTimer;
var activityTimer;
var word_history = [];
var wordIndex = 0;
var hint = "";

io.on('connection', socket => {

    socket.on('add user', (name, word) => {
        var player = {
            username: name,
            points: 0,
            isDrawing: false,
            isCorrect: false,
            id: socket.id,
        };

        if (users.length === 0) player.isDrawing = true;

        users.push(player);
        drawingQueue.push(player);
        word_history.push(word);

        adjustTimer();

        if (users.length === 2) {
            setRoundTimer();
            io.emit('chat message', "The timer has started and a new game begins.", 'SERVER');
        }

        io.sockets.in(player.id).emit('add user', users, getWord(), player.isDrawing);
        io.emit('user joined', users);
        console.log(users);
    });

    socket.on('chat message', (msg, msgType) => {
        io.emit('chat message', msg, msgType);
        console.log(msg);
    });

    socket.on('game message', (name, msg, word, msgType) => {
        let correctPlayers = getCorrectPlayers(users);

        let guess = msg.toLowerCase();
        let correctWord = word_history[wordIndex];

        let pointsToGive;

        if (correctPlayers <= 5) {
            pointsToGive = 10 - getCorrectPlayers(users);
        } else {
            pointsToGive = 5;
        }

        let player = playerStatus(name);

        if (guess.includes(correctWord)) {

            player.isCorrect = true;
            player.points += pointsToGive;

            io.emit('game message', name + " has found the word!\n", 'CORRECT GUESS');

            io.emit('refresh player list', users, player.isCorrect);

            io.sockets.in(player.id).emit('game message', "You found the word: " + word_history[wordIndex] + "!\n", 'CORRECT GUESS');
            io.sockets.in(player.id).emit('game message', "You earned " + pointsToGive + " points this round.\n", 'GAME');
            io.sockets.in(player.id).emit('game message', "You can speak here again once the round ends.\n", 'GAME');

            io.sockets.in(player.id).emit('lock game input', player.isCorrect, false, word_history[wordIndex]);

            if (getCorrectPlayers(users) === 1) {
                getArtist(users).points++;

                io.emit('fire off timer', timer / 10);
                io.emit('game message', "Round will end in " + timer / 1000 + " seconds.\n", 'NOTICE');

                startTime(word);
            }

        } else if (diceCoefficient(guess, correctWord) >= 0.49) {
            io.sockets.in(player.id).emit('game message', "'" + msg + "' " + "is close!", 'CLOSE GUESS');
        } else {
            io.emit('game message', name + ": " + msg + "\n", null);
        }
        console.log(name + ": " + msg);

    })

    socket.on('draw', data => {
        io.emit('draw', data);
        clearTimeout(activityTimer);
    });

    socket.on('skip round', (name, word) => {
        if (users.length <= 1) {
            io.sockets.in(playerStatus(name).id).emit('private game message ', false, true);
        } else {
            io.emit('game message', "The artist has skipped the round.\n", 'NOTICE');
            setNextRound();
            word_history.push(word);
        }
    });

    socket.on('give hint', (hintCount, name) => {
        let currentWord = word_history[wordIndex];

        if (hintCount === 1) {
            for (let i = 0; i < currentWord.length; i++) {
                hint += "_ ";
            }
            io.emit('game message', "HINT: The word has " + currentWord.length + " letters.\n", 'HINT');
        } else if (hintCount === 2) {
            var subhint = hint.slice(1, hint.length);
            hint = currentWord.charAt(0) + subhint
            io.emit('game message', "HINT: The word begins with: " + currentWord.charAt(0) + "\n", 'HINT');

        } else if (hintCount === 3) {
            var subhint = hint.slice(3, hint.length);
            hint = currentWord.charAt(0) + " " + currentWord.charAt(1) + subhint
            io.emit('game message', "HINT: The word begins with: " + currentWord.charAt(0) + currentWord.charAt(1) + "\n", 'HINT');
        } else {
            io.sockets.in(playerStatus(name).id).emit('game message', "You cannot give any more hints.\n", null);
        }
        io.emit('give hint', hint);
    });

    socket.on('get word', word => {
        word_history.push(word);
    });

    socket.on('disconnect', () => {

        if (playerID(socket.id) != null) {
            let isDrawing = playerID(socket.id).isDrawing;
            let name = playerID(socket.id).username;

            console.log(name + " has left the game.\n");

            removePlayerByID(socket.id);
            adjustTimer();
            if (isDrawing && users.length > 0) {
                setNextRound();
            }
            io.emit('remove user', users);
            io.emit('chat message', name + " has left the game.\n", 'SERVER');
            console.log(users);
        }

    });

});

/**
 *  Removes a player from the userlist by their socket ID.  Helper fuction to
 *  remove a player from the game when that player disconnects.
 *
 * @param {string} sid The players' socket ID.
 */
function removePlayerByID(sid) {

    /* Needed a way to get the index of an object inside an array, found this method:
     * http://stackoverflow.com/questions/8668174/indexof-method-in-an-object-array
     */
    let index = users.map(e => {
        return e.id;
    }).indexOf(sid);

    if (index != null) {
        users.splice(index, 1);
    }
}

/**
 *  Gets a player in the userlist.
 *
 *  @returns {object} The requested player, if it exists.
 */
function playerStatus(player) {
    let index = users.map(p => {
        return p.username;
    }).indexOf(player)

    if (index != null) {
        return users[index];
    }

}

/**
 *  Gets a player by their socket ID.  Helper fuction when private messages need to be
 *  sent to a specific client.
 *
 *  @param {string} sid The players' socket ID.
 */
function playerID(sid) {
    let index = users.map(function (p) {
        return p.id;
    }).indexOf(sid)
    return users[index];
}


/**
 *  Starts a new round.
 */
var setNextRound = function () {


    let hint = "";
    resetPlayerStatus(users);
    io.emit('reset', users)


    var oldArtist = drawingQueue.shift()

    if (users.includes(oldArtist)) {
        drawingQueue.push(oldArtist)
    }

    var newArtist = drawingQueue[0]

    newArtist.isDrawing = true;

    wordIndex++;
    var newWord = getWord();

    // Remove drawing rights of old round.
    io.sockets.in(oldArtist.id).emit('next round',
        users,
        "",
        oldArtist.isDrawing);

    // Give drawing rights to artist of upcoming round.
    io.sockets.in(newArtist.id).emit('next round',
        users,
        newWord,
        newArtist.isDrawing);

    io.emit('game message',
        " " + newArtist.username + " is drawing this round\n",
        users,
        undefined,
        'GAME');

    setRoundTimer();
}

/**
 *  Gets the number of players who correctly guessed the word.  Helper function
 *  to determine how many points a correct player earned.
 *
 *  @returns {number} c The number of correct players.
 */
function getCorrectPlayers(arr) {
    let c = 0;
    for (let i = 0; i < arr.length; i++) {
        if (arr[i].isCorrect) {
            c++;
        }
    }

    return c;
}

/*
 * Resets user flags in preparation for an upcoming round.
 */
function resetPlayerStatus(arr) {
    for (let i = 0; i < arr.length; i++) {
        arr[i].isCorrect = false;
        arr[i].isDrawing = false;
    }
}

/**
 *  Gets the current artist. This is helper function for setting
 *  the next round.
 */
var getArtist = function () {
    let index = users.map(p => {
        return p.isDrawing;
    }).indexOf(true);

    return users[index];
}

/**
 *  This generates the message that tells the artist what to draw each round.
 */
var getWord = function () {
    return "Your word is: " + word_history[wordIndex] + ".";
}

/**
 *  Adjusts game timers for the amount of present players.
 */
function adjustTimer() {
    if (users.length < 2) {
        clearTimeout(roundTimer);
        clearTimeout(activityTimer)
    }
    else if (users.length == 2) {
        timer = 5000;
    }
    else {
        timer = 20000;
    }
}

/**
 *  This starts the alarm timer.
 *  This timer is started when the first correct guess is made.
 *  It clears the standard round timer and activity timer (if they are active),
 *  and starts the alarm timer, which lasts 20 seconds (or 5 if there are only
 *  two players).
 *
 *  @param {string} word
 *                  The new word to add to the word list when the round ends.
 */
var startTime = function (word) {
    clearTimeout(roundTimer);
    clearTimeout(activityTimer);
    alarmTimer = setTimeout(() => {
        io.emit('game message', " The round has ended. The word was: " + word_history[wordIndex] + "\n", 'NEW ROUND');
        setNextRound();
        word_history.push(word);

    }, timer);
}

/**
 *  Starts the standard and active timers for each round.
 */
var setRoundTimer = function () {
    clearTimeout(roundTimer);
    clearTimeout(activityTimer);

    io.emit('round timer', roundTime);


    if (users.length > 1) {
        roundTimer = setTimeout(() => {
            io.emit('game message', "Nobody found the word! The word was: " + word_history[wordIndex] + ".\n", 'NOTICE');
            setNextRound();
        }, roundTime);
        activityTimer = setTimeout(() => {
            io.emit('game message', getArtist(users).username + " seems to be asleep. A new artist will be selected.\n", 'NOTICE');
            setNextRound();
        }, activityTime);
    }


}


/**
 * Compares two strings and measures their similarity. Uses the
 * Sorensen-Dice index statistic to determine the similarity.
 *
 * @param {string} str1
 *                 The first string to compare, which is typically the guess
 *                 made by a player.
 * @param {string} str2
 *                 The seconds string to compare, which is typcally the correct
 *                 word in a round.
 * @returns {number}
 *                 A number s calculated by the Sorensen-Dice formula, where
 *                 0 <= s <= 1.
 */
var diceCoefficient = function (str1, str2) {
    let bigramsStr1 = [];
    let bigramsStr2 = [];

    for (let i = 0; i < str1.length - 1; i++) {
        bigramsStr1.push(str1.substr(i, 2));
    }

    for (let i = 0; i < str2.length - 1; i++) {
        bigramsStr2.push(str2.substr(i, 2));
    }

    let intersection = bigramsStr1.filter(n => {
        return bigramsStr2.indexOf(n) !== -1;
    });

    return (2 * (intersection.length)) / (bigramsStr1.length + bigramsStr2.length);

}
