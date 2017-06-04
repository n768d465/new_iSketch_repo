"use strict";
const socket = io.connect();
var clientName = "";

$("#txtModal").val(generateRandomUser());

$('#formModal').submit(function() {
    clientName = $('#txtModal').val().replace(/[.*+?^${}()|[\]\\]\s/g, "");
    $('#myModal').modal('hide');

    socket.emit('add user', clientName, getWord());
    socket.emit('chat message', clientName + " has joined the game!", 'SERVER');

    $("#lblUsername").html("Your username: " + clientName);
    return false;
});

const alertSound = document.getElementById("alertSound");
const userJoinedSound = document.getElementById("userJoinedSound");
const timerSound = document.getElementById("timer");
const nextArtistSound = document.getElementById("nextArtistSound");
const endOfRoundSound = document.getElementById("endOfRoundSound");
const closeAlert = document.getElementById("closeAlert");


socket.on('user joined', users => {
    userJoinedSound.play();
    refreshPlayerList(users);
});

socket.on('chat message', (msg, msgType) => {
    switch (msgType) {
        case 'SERVER':
            $('#socialChatList').append($('<li style = "color:#33ccff" class = "list-group-item chat-list-item">').text(msg));
            break;
        default:
            $('#socialChatList').append($('<li style = "color: #DDDDDD" class = "list-group-item chat-list-item">').text(msg));
            break;

    }
    $('#socialChatList').scrollTop($('#socialChatList')[0].scrollHeight);
});

socket.on('game message', function(msg, users, word, msgType)  {

    switch (msgType) {
        case 'CORRECT GUESS':
            alertSound.play();
            $('#gameChatList').append($('<li style = "color: #33cc00; font-weight:bold" class = "list-group-item chat-list-item">').text(msg));
            break;
        case 'GAME':
        case 'NOTICE':
            $('#gameChatList').append($('<li style = "color: #ff6a1a;" class = "list-group-item chat-list-item">').text(msg));
            break;
        case 'HINT':
            $('#gameChatList').append($('<li style = "color: #B8860B;" class = "list-group-item chat-list-item">').text(msg));
            break;
        case 'NEW ROUND':
            $('#gameChatList').append($('<li style = "color: #cc0000;" class = "list-group-item chat-list-item">').text(msg));
            break;
        case 'CLOSE GUESS':
            $('#gameChatList').append($('<li style = "color: #f5c13d;" class = "list-group-item chat-list-item">').text(msg));
            closeAlert.play();
            break;
        default:
            $('#gameChatList').append($('<li style = "color: #DDDDDD" class = "list-group-item chat-list-item">').text(msg));
            break;

    }
    $('#gameChatList').scrollTop($('#gameChatList')[0].scrollHeight);
});

socket.on('refresh player list', (users, isCorrect) => {
    refreshPlayerList(users);
})

socket.on('lock game input', (isCorrect, skipped, word) => {
    if (isCorrect) {
        $("#txtGame").css({
            "background-color": "#84e184",
            "border-color": "#28a428"
        });
        $("#txtGame").prop("disabled", true);
        $("#btnGame").prop("disabled", true);
        $("#txtGame").val("You found the word: " + word + "!");
        alertSound.play();
    }
    if (skipped) {
        $("#txtAreaGame").append("You cannot skip because you are the only person in the room.\n");
    }


});

socket.on('round timer', time => {
    $("#timerOnRoundStart").empty().append(time);
    startNormalTimer(time);
});


socket.on('fire off timer', (time, isClicked) => {
    timerSound.load();
    timerSound.play();

    $("#timerOnRoundStart").empty();
    $("#timerOnFirstGuess").show();

    $("#btnSkip").prop("disabled", true);

    startAlarmTimer(time);

});

socket.on('remove user', (usernames, msg) => {
    refreshPlayerList(usernames);
    if (usernames.length === 1) {
        clearInterval(roundCounter);
        $("#timerOnRoundStart").empty();

    }
});

socket.on('add user', (users, word, isDrawing) => {
    if (isDrawing) {
        addArtistPrivileges();
        $("#assignedWord").html(word);
    } else {
        removeArtistPrivileges();
    }

});

socket.on('draw', data => {
    canvas.loadFromJSON(data);
    canvas.forEachObject(function(o) {
        o.selectable = false;
    });
    canvas.renderAll();
});

socket.on('next round', (usernames, word, isArtist) => {
    $("#btnSkip").prop("disabled", false);
    $("#timerOnRoundStart").show();

    if (isArtist) {
        addArtistPrivileges();
        nextArtistSound.play();
    } else {
        removeArtistPrivileges();
        endOfRoundSound.play();
        $("#assignedWord").empty();

    }
    $("#assignedWord").html(word);
    refreshPlayerList(usernames);
    resetCanvas();
});


socket.on('give hint', hint => {
    $("#pHint").html("Hint: " + hint);
});

/*********** SOCIAL CHAT ***********/
$('#formChat').submit(() => {
    if ($('#txtChat').val() != '') {
        socket.emit('chat message', getTime() + $('#txtChat').val());
        $('#txtChat').val('');
    }
    return false;
});

/*********** GAME CHAT ***********/
$('#formGame').submit(() => {
    if ($('#txtGame').val() != '') {
        socket.emit('game message', clientName, $('#txtGame').val(), getWord(), undefined);
        $('#txtGame').val('');
    }
    return false;
});

/*
 * On mouse up event, the drawing gets sent to all users in the server.  The
 * canvas drawing gets converted in JSON format and sends the JSON data to the
 * server.
 */
canvas.observe('mouse:up', () => {
    socket.emit('draw', JSON.stringify(canvas));
    console.log(JSON.stringify(canvas));
});

/**
 * Gets the current time in format HH:MM AM/PM. This is called anytime a username
 * sends a message in the social chat list.
 *
 * @return {String} The current time, which gets appended at the start of each
 *                  message sent.
 */
function getTime() {
    var date = new Date();
    var time = date.toLocaleTimeString();
    var message = "[" + time + "] " + clientName + ": ";
    return message;
}

/**
 * Refreshes the userlist that is on the top left of the page. The userlist
 * gets refreshed anytime a user guesses the correct word, a user joins, or
 * a user leaves.
 * @param  {Object} userlist The array holding the users. It is typically the
 *                           userlist sent by the server (index.js).
 */
function refreshPlayerList(userlist) {
    $('.player-list-item').remove();

    userlist.sort((a, b) => {
        return b.points - a.points;
    })

    for (let i = 0; i < userlist.length; i++) {
        if (userlist[i].isCorrect) {
            $('#listPlayers').append($('<li style = "color: red" class = "list-group-item player-list-item">').text(userlist[i].username + " (" + userlist[i].points + ")"));
        } else if (userlist[i].isDrawing) {
            $('#listPlayers').append($('<li style = "color: green" class = "list-group-item player-list-item">').text(userlist[i].username + " (" + userlist[i].points + ")"));
        } else {
            $('#listPlayers').append($('<li style = "color: black" class = "list-group-item player-list-item">').text(userlist[i].username + " (" + userlist[i].points + ")"));
        }
    }

}

/*
 * Resets some HTML5 elements to their default settings to all users.
 * Used to help start a new round.
 */
socket.on('reset', function(users) {
    $("#txtGame").prop("disabled", false);
    $("#btnGame").prop("disabled", false);
    $("#txtGame").val('');
    $("#txtGame").css({
        "background-color": "white",
        "border-color": "white"
    });

    removeArtistPrivileges();
    refreshPlayerList(users);

    hintCount = 0;
    $("#pHint").html("");
});

/**
 * Generates a random username. Used for the login modal.
 *
 * @return {string} The randomly generated username. Possible random
 * usernames are between guest_user1 and guest_user1000.
 */
function generateRandomUser() {
    let num = (Math.floor((Math.random() * 1000) + 1)).toString();
    let user = "guest_user" + num;
    return user;
}

/**
 * Adds or modifies HTML5 elements needed for the artist to draw on the canvas
 * for a single round.  Some additions include the paintbrush, eraser, undo
 * button, and some modifications include disabling the game text input and
 * button.
 */
var addArtistPrivileges = function() {
    $(".drawingTools").show();
    $("#txtGame").val("You cannot speak here since you are the artist.");
    $("#txtGame").prop("disabled", true);
    $("#txtGame").css({
        "background-color": "#e59a9a",
        "border-color": "#b62f2f"
    });
    $("#btnGame").prop("disabled", true);

    canvas.isDrawingMode = true;
    canvas.hoverCursor = 'pointer';
}

/**
 * Removes all HTML elements needed to draw on the canvas.
 */
var removeArtistPrivileges = function()  {
    canvas.isDrawingMode = false;
    canvas.hoverCursor = "default";

    $(".drawingTools").hide();
    $("#btnGame").prop("disabled", false);
}

/**
 * Gets a word from the word list words.js
 * @returns {string} A word from the word list.
 */
var getWord = function() {
    let rand = (Math.floor((Math.random() * words.length) + 1));
    return words[rand];
}

/*
 * Sends the necessary data (the username in this case) to have the server
 * remove a user from the game.
 */
var removeUser = function() {
    socket.emit('remove user', clientName, getWord());
}
