

"use strict";
// JS includes.
const express = require('express'),
    app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);

// Directories
app.use(express.static(__dirname + '/lib'));
app.use(express.static(__dirname + '/src'));
app.use(express.static(__dirname + '/node_modules'));

// Obtains the HTML file to establish a connection with.
app.get('/', function(req, res) {
    res.sendFile(__dirname + '/index.html');
});


// Uses the TCP port to establish a connection.
http.listen(80, function() {
    console.log('Connected to *:80. Listening...');
});

const roundTime = 180 * 1000;       /* Time for a standard round (3 minutes) */
const activityTime = 25 * 1000;     /* Time before considered asleep
                                     * (25 seconds)
                                     */

var users = [];                     /* Userlist. */
var timer;                          /* Time for the alarm timer. */
var alarmTimer;                     /* Alarm timer. */
var roundTimer;                     /* Standard round timer. */
var activityTimer;                  /* Activity timer. */
var word_history = [];              /* List of all currently used words. */
var wordIndex = 0;                  /* Word counter for word_history. */
var hint = "";                      /* Hint for the given word to draw. */

io.on('connection', socket => {

    //  Adds a user to the userlist when a new user connects.
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
        word_history.push(word);

        adjustTimer();

        if (users.length == 2){
            setRoundTimer();
        }

        io.sockets.in(player.id).emit('add user', users, getWord(), player.isDrawing);
        io.emit('user joined', users);
        console.log(users);
    });

    //  Messages from the social chat list.
    socket.on('chat message', (msg, msgType) => {
        io.emit('chat message', msg, msgType);
        console.log(msg);
    });

    //  Messages from the game chat list.
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

        // If the user gets the word correct
        if (guess.includes(correctWord)) {

            // Player is considered correct, and points are awarded to that player.
            player.isCorrect = true;
            player.points += pointsToGive;

            // Sends a message to all connected users that the user found the word.
            io.emit('game message', name + " has found the word!\n", undefined, undefined, 'NOTICE');

            // Sends the newly updated userlist so the points can be displayed
            io.emit('refresh player list', users, player.isCorrect);

            // Sends private messages to the specific correct user, telling that
            // user that they found the word and how many points they earned.
            io.sockets.in(player.id).emit('game message', "You found the word: " + word_history[wordIndex] + "!\n", undefined, undefined, 'CORRECT GUESS');
            io.sockets.in(player.id).emit('game message', "You earned " + pointsToGive + " points this round.\n", undefined, undefined, 'GAME');
            io.sockets.in(player.id).emit('game message', "You can speak here again once the round ends.\n", undefined, undefined, 'GAME');

            // Prevents the specific correct from sending any more messages
            // until the round is over.
            io.sockets.in(player.id).emit('lock game input', player.isCorrect, false, word_history[wordIndex]);

            // Alarm timer fires off when the first correct guess is made.
            if (getCorrectPlayers(users) === 1) {
                getArtist(users).points++;

                io.emit('fire off timer', timer / 10);
                io.emit('game message', "Round will end in " + timer / 1000 + " seconds.\n", undefined, undefined, 'NOTICE');

                startTime(word);
            }

        } else if (diceCoefficient(guess, correctWord) >= 0.49) {
            io.sockets.in(player.id).emit('game message', "'" + msg + "' " + "is close!", undefined, undefined, 'CLOSE GUESS');
        } else {
            io.emit('game message', name + ": " + msg + "\n", users, playerStatus(name).isCorrect);
        }
        console.log(name + ": " + msg);

    })

    // Sends canvas data in JSON format to all connected users.  In other words,
    // this is how the drawing gets displayed to all uesrs.
    socket.on('draw', data => {
        io.emit('draw', data);
        clearTimeout(activityTimer);
    });

    socket.on('skip round', (name, word) => {
        if (users.length <= 1) {
            io.sockets.in(playerStatus(name).id).emit('private game message ', false, true);
        } else {
            io.emit('game message', "The artist has skipped the round.\n", undefined, undefined, 'NOTICE');
            setNextRound();
            word_history.push(word);
        }
    });

    // Sends out a hint of the current word to all connected users.
    socket.on('give hint', (hintCount, name) => {
        let currentWord = word_history[wordIndex];

        if (hintCount === 1) {
            for (let i = 0; i < currentWord.length; i++) {
                hint += "_ ";
            }
            io.emit('game message', "HINT: The word has " + currentWord.length + " letters.\n", undefined, undefined, 'HINT');
        } else if (hintCount === 2) {
            var subhint = hint.slice(1, hint.length);
            hint = currentWord.charAt(0) + subhint
            io.emit('game message', "HINT: The word begins with: " + currentWord.charAt(0) + "\n", undefined, undefined, 'HINT');

        } else if (hintCount === 3) {
            var subhint = hint.slice(3, hint.length);
            hint = currentWord.charAt(0) + " " + currentWord.charAt(1) + subhint
            io.emit('game message', "HINT: The word begins with: " + currentWord.charAt(0) + currentWord.charAt(1) + "\n", undefined, undefined, 'HINT');
        } else {
            io.sockets.in(playerStatus(name).id).emit('game message', "You cannot give any more hints.\n");
        }
        io.emit('give hint', hint);
    });

    // Gets a new word from the client side.
    socket.on('get word', word => {
        word_history.push(word);
    });

    // Disconnects a player
    socket.on('disconnect', () => {

        // Finds the player by their socket id, then removes them from the
        // userlist.
        if(playerID(socket.id) != null){
            let isDrawing = playerID(socket.id).isDrawing;
            let name = playerID(socket.id).username;

            console.log(name + " has left the game.\n");


            // If the disconected user was the artist, a new artist
            // gets selected and a new round begins.
            if (isDrawing && users.length > 0) {
                setNextRound();
            }

            // Clears all timers if there is only one player left.
            if (users.length == 1) {
                clearTimeout(roundTimer);
                clearTimeout(activityTimer);
            }

            removePlayerByID(socket.id);
            adjustTimer();

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
    let index = users.map(function(p) {
        return p.id;
    }).indexOf(sid)
    return users[index];
}


/**
 *  Starts a new round.
 */
var setNextRound = function() {


    // Any hints given in the round are cleared, and allows players to make
    // guesses again.
    hint = "";
    resetPlayerStatus(users);
    io.emit('reset', users)


    // Gets the index of the current artist
    var oldArtist = users.map(p => {
        return p.isDrawing
    }).indexOf(true);

    // Sets the index of the artist for the next round
    var newArtist = (oldArtist + 1) % users.length;

    // Adjusts artist privileges
    users[oldArtist].isDrawing = false;
    users[newArtist].isDrawing = true;

    // Word counter increments, and a new word is retrieved from the client.
    wordIndex++;
    var newWord = getWord();

    // Selected client gives up the artists privileges
    io.sockets.in(users[oldArtist].id).emit('next round',
        users,
        "",
        users[oldArtist].isDrawing);

    // Selected client gets the artists privileges
    io.sockets.in(users[newArtist].id).emit('next round',
        users,
        newWord,
        users[newArtist].isDrawing);

    // Announces the new artist to all clients.
    io.emit('game message',
        " " + users[newArtist].username + " is drawing this round\n",
        users,
        undefined,
        'GAME');

    // Round and activity timers are set.
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

/**
 *  Sets the "isCorrect" property to false for all players. This is called
 *  at the end of each round and is a helper function for starting a new
 *  round.
 */
function resetPlayerStatus(arr) {
    for (let i = 0; i < arr.length; i++) {
        arr[i].isCorrect = false;
    }
}

/**
 *  Gets the current artist. This is helper function for setting
 *  the next round.
 */
var getArtist = function() {
    let index = users.map(p => {
        return p.isDrawing;
    }).indexOf(true);

    return users[index];
}

/**
 *  This generates the message that tells the artist what to draw each round.
 */
var getWord = function() {
    return "Your word is: " + word_history[wordIndex] + ". Remember, drawing letters is NOT allowed.";
}

/**
 *  Adjusts the alarm timer.  This is called anytime a new player joins or
 *  a current player leaves.  The time is 5 seconds when there are two players
 *  only, and 20 seconds for 3 or more players.
 */
function adjustTimer() {
    if (users.length <= 2) timer = 5000;
    else timer = 20000;
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
var startTime = function(word) {
    clearTimeout(roundTimer);
    clearTimeout(activityTimer);
    alarmTimer = setTimeout(() => {
        io.emit('game message', " The round has ended. The word was: " + word_history[wordIndex] + "\n", undefined, undefined, 'NEW ROUND');
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
    console.log("Round timer started..\n");

    // This is the standard three minute timer that is fired off each round.
    // It will always fire off when a new round begins, and there are at least
    // two players in each room.
    roundTimer = setTimeout(() => {
        io.emit('game message', "Nobody found the word! The word was: " + word_history[wordIndex] + ".\n", undefined, undefined, 'NOTICE');
        setNextRound();
    }, roundTime);
    console.log("Activity timer started..\n");

    // This timer checks to see if the artist is active. If the artist does not
    // draw anything within the first 25 seconds of the round, this timer will
    // consider the artist asleep and will start a new round.
    activityTimer = setTimeout(() => {
        io.emit('game message', getArtist(users).username + " seems to be asleep. A new artist will be selected.\n", undefined, undefined, 'NOTICE');
        setNextRound();
    }, activityTime);

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
 *                 A number s calculated by the Sorensen-Dice formula,
 *                 0 <= s <= 1.
 */
var diceCoefficient = function(str1, str2) {
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

    let s = (2 * (intersection.length)) / (bigramsStr1.length + bigramsStr2.length);
    return s;
}
