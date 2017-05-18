const express = require('express'),
    app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);

// Directories
app.use(express.static(__dirname + '/lib'));
app.use(express.static(__dirname + '/src'));
app.use(express.static(__dirname + '/node_modules'));

app.get('/', function(req, res) {
    res.sendFile(__dirname + '/index.html');
});

http.listen(80, function() {
    console.log('Connected to *:80. Listening...');
});

const roundTime = 180 * 1000;
const activityTime = 15 * 1000;
var users = [];
var artistIndex = 0;
var activity = 0;

var timer;
var alarmTime;
var roundTimer;
var activityTimer;
var word_history = [];
var wordIndex = 0;
var hint = "";

io.on('connection', function(socket) {

    socket.on('add user', function(name, word) {
        var player = {
            username: name,
            points: 0,
            isDrawing: false,
            isCorrect: false,
            id: socket.id,
        };


        if (users.length === 0) {
            player.isDrawing = true;
        }


        users.push(player);
        word_history.push(word);

        adjustTimer();
        if(users.length == 2){
            setRoundTimer();
        }
        io.sockets.in(player.id).emit('add user', users, getWord(), player.isDrawing);
        io.emit('user joined', users);
        console.log(users);
    });

    socket.on('chat message', function(msg, msgType) {
        io.emit('chat message', msg, msgType);
        console.log(msg);
    });

    socket.on('game message', function(name, msg, word, msgType) {
        var pointsToGive = 10 - getCorrectPlayers(users);
        var player = playerStatus(name);

        if (msg.toLowerCase().includes(word_history[wordIndex])) {

            player.isCorrect = true;
            player.points += pointsToGive;

            io.emit('game message', name + " has found the word!\n", undefined, undefined, 'GAME');
            io.emit('refresh player list', users, player.isCorrect);

            io.sockets.in(player.id).emit('game message', "You found the word: " + word_history[wordIndex] + "!\n", undefined, undefined, 'CORRECT-GUESS');
            io.sockets.in(player.id).emit('game message', "You earned " + pointsToGive + " points this round.\n", undefined, undefined, 'CORRECT-GUESS');
            io.sockets.in(player.id).emit('game message', "You can speak here again once the round ends.\n", undefined, undefined, 'CORRECT-GUESS');
            io.sockets.in(player.id).emit('lock game input', player.isCorrect, false, word_history[wordIndex]);

            if (getCorrectPlayers(users) == 1) {
                //getArtist(users).points += 10;
                getArtist(users).points++;

                io.emit('fire off timer', timer / 10);
                io.emit('game message', "Round will end in " + timer / 1000 + " seconds.\n", undefined, undefined, 'NOTICE');

                startTimer(word);

            }
        } else {
            io.emit('game message', name + ": " + msg + "\n", users, playerStatus(name).isCorrect);
        }
        console.log(name + ": " + msg);

    })

    socket.on('draw', function(data) {
        io.emit('draw', data);
        clearTimeout(activityTimer);
    })

    socket.on('skip round', function(name, word) {

        if (users.length <= 1) {
            io.sockets.in(playerStatus(name).id).emit('private game message ', false, true);
        } else {
            io.emit('game message', "The artist has skipped the round.\n", undefined, undefined, 'NOTICE');
            setNextRound(users);
            word_history.push(word);

        }

    });

    socket.on('give hint', function(hintCount, name) {
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

    socket.on('get word', function(word){
        word_history.push(word);
    });


    socket.on('disconnect', function() {
        var isDrawing = playerID(socket.id).isDrawing;
        var name = playerID(socket.id).username;

        console.log(name + " has left the game.\n");
        removePlayerByID(socket.id);
        adjustTimer();

        if (isDrawing && users.length > 0) {
            if (users.length == 0) {
                artistIndex = 0;
            }
            //else{artistIndex--;}
            setNextRound();
        }

        if(users.length == 1){
            clearTimeout(roundTimer);
            clearTimeout(activityTimer);
        }

        io.emit('remove user', users);
        io.emit('chat message', name + " has left the game.\n", 'SERVER');
        console.log(users);
    });

});


function removePlayerByID(playerName) {

    /* Needed a way to get the index of an object inside an array, found this method:
     * http://stackoverflow.com/questions/8668174/indexof-method-in-an-object-array
     */
    let index = users.map(function(e) {
        return e.id;
    }).indexOf(playerName);
    users.splice(index, 1);
}

function playerStatus(player) {
    let index = users.map(function(p) {
        return p.username;
    }).indexOf(player)
    return users[index];
    //return users[player];
}

function playerID(id) {
    let index = users.map(function(p) {
        return p.id;
    }).indexOf(id)
    return users[index];
}

function setNextRound() {
    hint = "";
    resetPlayerStatus(users);
    io.emit('reset', users)

    var oldArtist = artistIndex % users.length;
    var newArtist = (artistIndex + 1) % users.length;

    users[oldArtist].isDrawing = false;
    users[newArtist].isDrawing = true;

    wordIndex++;
    var newWord = getWord();

    io.sockets.in(users[oldArtist].id).emit('next round',
        users,
        "",
        users[oldArtist].isDrawing);

    io.sockets.in(users[newArtist].id).emit('next round',
        users,
        newWord,
        users[newArtist].isDrawing);

    io.emit('game message',
        " " + users[newArtist].username + " is drawing this round\n",
        users,
        undefined,
        'GAME');

    artistIndex++;
    activity = 0;
    setRoundTimer();
}

function getCorrectPlayers(arr) {
    let c = 0;
    for (let i = 0; i < arr.length; i++) {
        if (arr[i].isCorrect) {
            c++;
        }
    }

    return c;
}

function resetPlayerStatus(arr) {
    for (var i = 0; i < arr.length; i++) {
        arr[i].isCorrect = false;
        arr[i].isDrawing = false;
    }
}


function getArtist(arr) {
    for (var i = 0; i < arr.length; i++) {
        if (arr[i].isDrawing) {
            return arr[i];
        }
    }
}

var getWord = function() {
    return "Your word is: " + word_history[wordIndex] + ". Remember, drawing letters is NOT allowed.";
}

function adjustTimer() {
    if (users.length <= 2) timer = 5000;
    else timer = 20000;

}

function startTimer(word) {
    clearTimeout(roundTimer);
    clearTimeout(activityTimer);
    alarmTime = setTimeout(function() {
        io.emit('game message', " The round has ended. The word was: " + word_history[wordIndex] + "\n", undefined, undefined, 'NEW-ROUND');
        setNextRound();
        word_history.push(word);

    }, timer);
}

function setRoundTimer(){
    clearTimeout(roundTimer);
    clearTimeout(activityTimer);

    io.emit('round timer', roundTime);
    console.log("Round timer started..\n");

    roundTimer = setTimeout(function(){
        io.emit('game message', "Nobody found the word! The word was: " + word_history[wordIndex] + ".\n", undefined, undefined, 'NOTICE');
        setNextRound();
    }, roundTime);
    console.log("Activity timer started..\n");

    activityTimer = setTimeout(function(){
        io.emit('game message', getArtist(users).username + " seems to be asleep. A new artist will be selected.\n", undefined, undefined, 'NOTICE');
        setNextRound();
    }, activityTime);

}
