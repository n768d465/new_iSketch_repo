var express = require('express'),app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

// Directories
app.use(express.static(__dirname + '/lib'));
app.use(express.static(__dirname + '/src'));
app.use(express.static(__dirname + '/node_modules'));

app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

http.listen(80, function(){
	console.log('Connected to *:80. Listening...');
});

var users = [];
var artistIndex = 0; // index that keeps track of who is drawing

var setTimer;
var word_history = [];
var wordIndex = 0;

// User connected or disconnected.
io.on('connection', function(socket){

    socket.on('add user', function(name, word){
        var player = {
            username: name,
            points: 0,
            isDrawing: false,
            isCorrect: false,
            id: socket.id
        };

        if(users.length == 0) {player.isDrawing = true;}

        users.push(player);
        word_history.push(word);

        io.sockets.in(player.id).emit('add user', users, getWord(), player.isDrawing);
        io.emit('user joined', users);
        console.log(users);
    });


    socket.on('remove user', function(name, word){
        word_history.push(word);
        //console.log("REMOVING PLAYER...\n");
        var isDrawing = playerStatus(name).isDrawing;
        removePlayer(name);

        if(isDrawing && users.length > 0){
            //console.log("SDFSDF");
            setNextRound();
        }

        if(users.length == 0){artistIndex = 0;}

        word_history.push(word);

        io.emit('remove user', users);
        io.emit('chat message', "[Server] " + name + " has left the game.\n");

        console.log(users);
    })

    socket.on('chat message', function(msg){
        io.emit('chat message', msg);
    });

    socket.on('game message', function(name, msg, word){
        var pointsToGive = 10 - getCorrectPlayers(users);

        if(msg.includes(word_history[wordIndex])){
            playerStatus(name).isCorrect = true;
            playerStatus(name).points += pointsToGive;

            io.emit('game message',"[Game] " + name + " has found the word!\n", users, playerStatus(name).isCorrect);
            io.sockets.in(playerStatus(name).id).emit('private game message ', playerStatus(name).isCorrect, false);

            if(getCorrectPlayers(users) == 1){
                io.emit('fire off timer', 2000);
                io.emit('game message',"[Notice] " + "Round will end in 20 seconds.\n", users)

                setTimeout(function(){
                    io.emit('game message', "[Game] The round has ended. The word was: " + word_history[wordIndex] + "\n");
                    io.emit('game message', "-------------------------------------------\n");
                    io.emit('reset', users);
                    setNextRound();
                }, 20000);
                word_history.push(word);

            }

        }
        else{
            io.emit('game message', name + ": " + msg + "\n", users, playerStatus(name).isCorrect);
        }
    })

    socket.on('draw', function(data){
        io.emit('draw', data);
    })

    socket.on('skip round', function(name, word){

        if(users.length <= 1){
            io.sockets.in(playerStatus(name).id).emit('private game message ', false, true);
        }
        else
        {
            word_history.push(word);
            //console.log("SKIP BUTTON PRESSED\n" + artistIndex);
            io.emit('game message', "[Game] The artist has skipped the round.\n");
            io.emit('game message', "-------------------------------------------\n");
            io.emit('reset', users);
            setNextRound(users);
        }

    })
});

function removePlayer(playerName){

	/* Needed a way to get the index of an object inside an array, found this method:
	 * http://stackoverflow.com/questions/8668174/indexof-method-in-an-object-array
	 */
	var index = users.map(function(e) { return e.username; }).indexOf(playerName);
	users.splice(index, 1);
}

function setNextRound(){
    resetPlayerStatus(users);

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

    io.emit('game message', "[Game] " + users[newArtist].username + " is drawing this round\n", users, false);
    artistIndex++;
}

function getCorrectPlayers(arr){
	var c = 0;
	for (var i = 0; i < arr.length; i++){
		if(arr[i].isCorrect){
			c++; // ayyyy
		}
	}

	return c;
}

function resetPlayerStatus(arr){
	for(var i = 0; i < arr.length; i++){
		arr[i].isCorrect = false;
        arr[i].isDrawing = false;
	}
}

function playerStatus(player){
	for(var i = 0; i < users.length; i++){
		if (player == users[i].username){
			return users[i];
		}
	}
}

function getArtists(arr){
    var a = 0;
	for (var i = 0; i < arr.length; i++){
		if(arr[i].isCorrect){
			a++;
		}
	}

    return a;
}

var getWord = function(){
    return "Your word is: " + word_history[wordIndex] + ". Remember, drawing letters is NOT allowed.";
}
