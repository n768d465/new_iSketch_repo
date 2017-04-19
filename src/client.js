const socket = io.connect();
var clientName = "";

$("#txtModal").val(generateRandomUser());

$('#formModal').submit(function() {
    clientName = $('#txtModal').val();
    $('#myModal').modal('hide');

    socket.emit('add user', clientName, getWord());
    socket.emit('chat message', "--- [Server] " + clientName + " has joined the game! ---");

    $("#lblUsername").html("Your username: " + clientName);
    return false;
});

var alertSound = document.getElementById("alertSound");
var userJoinedSound = document.getElementById("userJoinedSound");
var timerSound = document.getElementById("timer");
var nextArtistSound = document.getElementById("nextArtistSound");
var endOfRoundSound = document.getElementById("endOfRoundSound");

socket.on('user joined', function(users) {
    userJoinedSound.play();
    refreshPlayerList(users);
});

socket.on('user_left', function(msg) {
    $('#txtAreaChat').append(msg + '\n')
});

socket.on('chat message', function(msg) {
    $('#txtAreaChat').append(msg + '\n');
    $('#txtAreaChat').scrollTop($('#txtAreaChat')[0].scrollHeight);

});

socket.on('game message', function(msg, usernames, isCorrect, refresh) {

    $("#txtAreaGame").append(msg);
    $('#txtAreaGame').scrollTop($('#txtAreaGame')[0].scrollHeight);
});

socket.on('refresh player list', function(users, isCorrect){
    refreshPlayerList(users);

    if (isCorrect) {
        alertSound.play();
    }
})

socket.on('private game message ', function(isCorrect, skipped, word, points, msg){
    if(isCorrect){
        $("#txtGame").val("You got the word: " + word + "!");
        $("#txtGame").css({"background-color": "#84e184"});
        $("#txtGame").prop("disabled", true);
        $("#btnGame").prop("disabled", true);

        $("#txtAreaGame").append("You got the word: " + word + "!\n");
        $("#txtAreaGame").append("You earned " + points + " points this round.\n");
        $("#txtAreaGame").append("You can speak here again once the round ends.\n");

    }
    if(skipped){
        $("#txtAreaGame").append("You cannot skip because you are the only person in the room.\n");
    }


});

socket.on('fire off timer', function(time, isClicked) {
    timerSound.load();
    timerSound.play();

    var counter;
    var count = time;
    $("#timerOnFirstGuess").show();

    $("#btnSkip").prop("disabled", true);

    counter = setInterval(function() {
        timer();
        $("#timerOnFirstGuess").html(count / 100);
    }, 10);

    function timer() {
        if (count <= 0) {
            document.getElementById("timer").pause();
            $("#timerOnFirstGuess").hide();
            clearInterval(counter);
            resetCanvas();
            return;
        }
        count--;
    }

});

socket.on('remove user', function(usernames, msg) {
    refreshPlayerList(usernames);
});

socket.on('add user', function(users, word, isDrawing) {
    if(isDrawing){
        addArtistPrivileges();
        $("#assignedWord").html(word);
    }
    else{
        removeArtistPrivileges();
    }

});

socket.on('draw', function(data) {
    canvas.loadFromJSON(data);
    canvas.forEachObject(function(o) {
        o.selectable = false;
    });
    canvas.renderAll();
});

socket.on('next round', function(usernames, word, isArtist) {
    $("#btnSkip").prop("disabled", false);

    if (isArtist) {
        addArtistPrivileges();
        nextArtistSound.play();
    } else {
        removeArtistPrivileges();
        endOfRoundSound.play();
        word = "";

    }
    $("#assignedWord").html(word);
    refreshPlayerList(usernames);
    resetCanvas();
});

socket.on('give hint', function(hint){
    $("#pHint").html("Hint: " + hint);
});

/*********** SOCIAL CHAT ***********/
$('#formChat').submit(function() {
    socket.emit('chat message', updateTime() + $('#txtChat').val());
    console.log(clientName);
    $('#txtChat').val('');
    return false;
});

/*********** GAME CHAT ***********/
$('#formGame').submit(function() {
    socket.emit('game message', clientName, $('#txtGame').val(), getWord());
    $('#txtGame').val('');
    return false;
});

canvas.observe('mouse:up', function() {
    socket.emit('draw', JSON.stringify(canvas));
});

function updateTime() {
    var date = new Date();
    var time = date.toLocaleTimeString();
    var message = "[" + time + "] " + clientName + ": ";
    return message;
}

function refreshPlayerList(name) {
    $('.list-group-item').remove();
    //$("#txtGame").prop("disabled", false);
    //$("#txtGame").val('');

    name.sort(function(a, b) {
        return b.points - a.points;
    })

    for (var i = 0; i < name.length; i++) {
        if (name[i].isCorrect) {
            $('#listPlayers').append($('<li style = "color: red" class = "list-group-item">').text(name[i].username + " " + "(" + name[i].points + ")"));
        } else if (name[i].isDrawing) {
            $('#listPlayers').append($('<li style = "color: green" class = "list-group-item">').text(name[i].username + " " + "(" + name[i].points + ")"));
        } else {
            $('#listPlayers').append($('<li style = "color: black" class = "list-group-item">').text(name[i].username + " " + "(" + name[i].points + ")"));
        }
    }

}

socket.on('reset', function(users){
    $("#txtGame").prop("disabled", false);
    $("#btnGame").prop("disabled", false);
    $("#txtGame").val('');
    $("#txtGame").css({"background-color": "white"});

    removeArtistPrivileges();
    refreshPlayerList(users);
    
    hintCount = 0;
    $("#pHint").html("");
});

function generateRandomUser() {
    var num = (Math.floor((Math.random() * 1000) + 1)).toString();
    var user = "guest_user" + num;
    return user;
}

function addArtistPrivileges() {
    $(".drawingTools").show();
    $("#txtGame").val("You cannot speak here since you are the artist.");
    $("#txtGame").prop("disabled", true);
    $("#txtGame").css({"background-color": "#e59a9a"});
    $("#btnGame").prop("disabled", true);

    canvas.isDrawingMode = true;
    canvas.hoverCursor = "crosshair";
}

function removeArtistPrivileges() {
    $(".drawingTools").hide();
    canvas.isDrawingMode = false;
    canvas.hoverCursor = "default";
    $("#btnGame").prop("disabled", false);

}

function getWord() {
    var rand = (Math.floor((Math.random() * words.length) + 1));
    return words[rand];
}

var removeUser = function(){
    socket.emit('remove user', clientName, getWord());
}
