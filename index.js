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
var artistIndex = 0;

var timer;
var word_history = [];
var wordIndex = 0;
var hint = "";

io.on('connection', function(socket){

    socket.on('add user', function(name, word){
        var player = {
            username: name,
            points: 0,
            isDrawing: false,
            isCorrect: false,
            id: socket.id,
        };


        if(users.length == 0) {
            player.isDrawing = true;
        }


        users.push(player);
        word_history.push(word);

        adjustTimer();

        io.sockets.in(player.id).emit('add user', users, getWord(), player.isDrawing);
        io.emit('user joined', users);
        console.log(users);
    });

    socket.on('chat message', function(msg){
        io.emit('chat message', msg);
        console.log(msg);
    });

    socket.on('game message', function(name, msg, word){
        var pointsToGive = 10 - getCorrectPlayers(users);
        var player = playerStatus(name);

        if(msg.toLowerCase().includes(word_history[wordIndex])){

            player.isCorrect = true;
            player.points += pointsToGive;

            io.emit('game message',"[Game] " + name + " has found the word!\n");
            io.emit('refresh player list', users, player.isCorrect);

            io.sockets.in(playerStatus(name).id).emit('game message', "You found the word: " + word_history[wordIndex] + "!\n");
            io.sockets.in(playerStatus(name).id).emit('game message', "You earned " + pointsToGive + " points this round.\n");
            io.sockets.in(playerStatus(name).id).emit('lock game input', player.isCorrect, false, word_history[wordIndex]);

            if(getCorrectPlayers(users) == 1){
                //getArtist(users).points += 10;
                getArtist(users).points++;

                io.emit('fire off timer', timer / 10);
                io.emit('game message',"[Notice] " + "Round will end in " + timer / 1000 + " seconds.\n");

                setTimeout(function(){
                    io.emit('game message', "[Game] The round has ended. The word was: " + word_history[wordIndex] + "\n");
                    io.emit('game message', "-------------------------------------------\n");
                    setNextRound();
                    word_history.push(word);

                }, timer);

            }
        }
        else{
            io.emit('game message', name + ": " + msg + "\n", users, playerStatus(name).isCorrect);
        }
        console.log(name + ": " + msg);

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
            io.emit('game message', "[Game] The artist has skipped the round.\n");
            io.emit('game message', "-------------------------------------------\n");
            setNextRound(users);
            word_history.push(word);

        }

    });

    socket.on('give hint', function(hintCount, name){
        let currentWord = word_history[wordIndex];

        if(hintCount === 1){
            for(let i = 0; i < currentWord.length; i++){
                hint += "_ ";
            }
            io.emit('game message', "[HINT] The word has " + currentWord.length + " letters.\n");
        }
        else if (hintCount === 2){
            var subhint = hint.slice(1, hint.length);
            hint = currentWord.charAt(0) + subhint
            io.emit('game message', "[HINT] The word begins with: " + currentWord.charAt(0) + "\n");

        }
        else if(hintCount === 3){
            var subhint = hint.slice(3, hint.length);
            hint = currentWord.charAt(0) + " " + currentWord.charAt(1) + subhint
            io.emit('game message', "[HINT] The word begins with: " +  currentWord.charAt(0) + currentWord.charAt(1) + "\n");
        }
        else{
            io.sockets.in(playerStatus(name).id).emit('game message', "You cannot give any more hints.\n");
        }
        io.emit('give hint', hint);
    })

    socket.on('disconnect', function(){
        var isDrawing = playerID(socket.id).isDrawing;
        var name = playerID(socket.id).username;

        console.log(name + " has left the game.\n");
        removePlayerByID(socket.id);
        adjustTimer();

        if(isDrawing && users.length > 0){
            if(users.length == 0){artistIndex = 0;}
            //else{artistIndex--;}
            setNextRound();
        }

        io.emit('remove user', users);
        io.emit('chat message', "[Server] " + name + " has left the game.\n");
        console.log(users);
    });

});


function removePlayerByID(playerName){

	/* Needed a way to get the index of an object inside an array, found this method:
	 * http://stackoverflow.com/questions/8668174/indexof-method-in-an-object-array
	 */
	var index = users.map(function(e) { return e.id; }).indexOf(playerName);
	users.splice(index, 1);
}

function playerStatus(player){
    let index = users.map(function(p){return p.username;}).indexOf(player)
    return users[index];
    //return users[player];
}
function playerID(id){
    let index = users.map(function(p){return p.id;}).indexOf(id)
    return users[index];
}

function setNextRound(){
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
            "[Game] " + users[newArtist].username + " is drawing this round\n",
            users,
            false);
    artistIndex++;
}

function getCorrectPlayers(arr){
	var c = 0;
	for (let i = 0; i < arr.length; i++){
		if(arr[i].isCorrect){
			c++;
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


function getArtist(arr){
	for (var i = 0; i < arr.length; i++){
		if(arr[i].isDrawing){
			return arr[i];
		}
	}
}

var getWord = function(){
    return "Your word is: " + word_history[wordIndex] + ". Remember, drawing letters is NOT allowed.";
}

function adjustTimer(){
    if(users.length <= 2) timer = 5000;
    else timer = 20000;
}
