var express = require('express'),app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

// Directories
app.use(express.static(__dirname + '/lib'));
app.use(express.static(__dirname + '/src'));
app.use(express.static(__dirname + '/node_modules'));

var usernames = [];
var artistIndex = 1; // index that keeps track of who is drawing

var setTimer;
var word_history = [];
var wordIndex = 0;

app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

// User connected or disconnected.
io.on('connection', function(socket){

	socket.on('user_joined', function(msg){
		io.emit('user_joined', msg, usernames);
		console.log(msg);
	});
  
	socket.on('add_user', function(name, word){
		var player = 	{username: "", 
						points: 0, 
						isDrawing: false, 
						isCorrect: false,
						id: socket.id};
						
		player.username = name;
		
		if(usernames.length == 0) { player.isDrawing = true; }

		usernames.push(player);
		word_history.push(word);

		io.sockets.in(playerStatus(name).id).emit('add_user',
			usernames,
			"Your word is: " + word_history[wordIndex] + ". Remember, drawing letters is NOT allowed.",
			playerStatus(name).isDrawing);
	});

	socket.on('del_user', function(name, word){
		//prevents server crash if someone refreshes before entering the game
		if(name != "" && usernames.length > 0){
			// what to do when the artist leaves the game
			if(playerStatus(name).isDrawing){
				setNextRound(word);
				artistIndex+= (usernames.length - 1); // this needs to be done and i have no idea why..
			}
			removePlayer(name);
			io.emit('del_user', usernames, "[Server] " + name + " has left the game.\n");  
			console.log(name + " has left the game.");
			console.log(usernames);	

		}


	});
	
  
});

// Chat sysytem
io.on('connection', function(socket){
	
	socket.on('chat message', function(msg){
		console.log('message: ' + msg);
	});

	socket.on('chat message', function(msg){
		io.emit('chat message', msg);
	});
  

	socket.on('game message', function(name, msg, word){
		var pointsToGive = 10 - getCorrectPlayers(usernames);

		if(msg.includes(word_history[wordIndex])){
			playerStatus(name).isCorrect = true;
			playerStatus(name).points += pointsToGive;

			io.emit('game message',"[Game] " + name + " has found the word!\n", usernames,	playerStatus(name).isCorrect);

			if(getCorrectPlayers(usernames) == 1){
				io.emit('fire off timer', 2000);
				io.emit('game message',"[Notice] " + "Round will end in 20 seconds.\n", usernames)

				setTimeout(function(){
					io.emit('game message', "[Game] The round has ended. The word was: " + word_history[wordIndex] + "\n");
					io.emit('game message', "===============================================================\n");
					resetPlayerStatus(usernames);
					setNextRound(word);
				}, 20000);
			}
		}
		else{
			io.emit('game message', name + ": " + msg + "\n", usernames, playerStatus(name).isCorrect);	
		}
		
	});

});

http.listen(80, function(){
	console.log('Connected to *:80. Listening...');
});

// Canvas
io.on('connection', function(socket){
	

    socket.on('draw', function(data){
        io.emit('draw', data);
    })
	

    socket.on('next round', function(word, isSkipped){
	
    	if(isSkipped && usernames.length > 1){
    		io.emit('game message', "[Notice] The artist has skipped the round.\n", usernames);
    		io.emit('game message', "===============================================================\n",usernames);
    		setNextRound(word);

    	}
    	else{
    		io.emit('game message', "You cannot skip because you are the only person in the room.\n", usernames);
    	}

		console.log(usernames);	
		console.log(word_history);
    });


	socket.on('fire off timer', function(time){
		io.emit('fire off timer', time);
	});
	
});

function removePlayer(playerName){

	/* Needed a way to get the index of an object inside an array, found this method: 
	 * http://stackoverflow.com/questions/8668174/indexof-method-in-an-object-array
	 */
	var index = usernames.map(function(e) { return e.username; }).indexOf(playerName);
	usernames.splice(index, 1);
}

function setNextArtist(){
	
}

function setNextRound(word){
	//setNextArtist();
	usernames[artistIndex % usernames.length].isDrawing = true;
	usernames[(artistIndex-1) % usernames.length].isDrawing = false;
	word_history.push(word)
	wordIndex++;

	io.sockets.in(usernames[(artistIndex - 1) % usernames.length].id).emit('next round',
															usernames,
															"",
															false);
			
	io.sockets.in(usernames[artistIndex % usernames.length].id).emit('next round',
															usernames,
															"Your word is: " + word_history[wordIndex] + ". Remember, drawing letters is NOT allowed.",
															true);

	io.emit('game message', "[Game] " + usernames[artistIndex % usernames.length].username + " is drawing this round.\n", usernames);

	artistIndex += 1;

	console.log("\nIndex: " + artistIndex + "\n");

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
	}
}

function playerStatus(player){
	for(var i = 0; i < usernames.length; i++){
		if (player == usernames[i].username){
			return usernames[i];
		}
	}
}