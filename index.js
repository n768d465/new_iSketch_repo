var express = require('express'),app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

app.use(express.static(__dirname + '/lib'));
app.use(express.static(__dirname + '/src'));
app.use(express.static(__dirname + '/node_modules'));

var usernames = [];
var clients = []; // used to broadcast data to a certain user
var i = 1; // index that keeps track of who is drawing

var setTimer;
var word_history = [];
var wordIndex = 0;

app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

// User connected or disconnected.
io.on('connection', function(socket){
	console.log('New user connected.');
  
	socket.on('disconnect', function(name){
		console.log('User disconnected');
	});
  
	socket.on('user_joined', function(msg){
		io.emit('user_joined', msg);
	});
	
	socket.on('user_left', function(msg){
		io.emit('user_left', msg);
	});
  
	socket.on('add_user', function(name){
		var player = {username: "", points: 0, isDrawing: false, isCorrect: false};
		player.username = name;
		
		if(usernames.length == 0){
			player.isDrawing = true;
			usernames.push(player);
		}
		else{
			usernames.push(player);	
		}
		
		io.emit('add_user',usernames); 
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
  
	socket.on('del_user', function(name){
		removePlayer(name);
		//console.log(usernames);
		io.emit('del_user', usernames);  
	});
	
	socket.on('game message', function(name, msg, points){
		var pointsToGive = 10 - getCorrectPlayers(usernames);

		// what a headache.
		for(var i = 0; i < usernames.length; i++){
			
			if(name == usernames[i].username){
				if(msg == word_history[wordIndex]){
					usernames[i].points += pointsToGive;
					usernames[i].isCorrect = true;
					io.emit('game message', name, msg, word_history[wordIndex], usernames[i].points, usernames)
				}
				else{
					io.emit('game message', name, msg, word_history[wordIndex]);
				}
			}		
		}
	});

});

http.listen(3000, function(){
	console.log('listening on *:3000');
});

// Canvas
io.on('connection', function(socket){
	
	clients.push(socket.id);

    socket.on('draw', function(data){
        io.emit('draw', data);
    })
	
	socket.on('next artist on load', function(data){
		word_history.push(data);
		for(var i = 0; i < clients.length; i++){
			io.sockets.in(clients[i]).emit('next artist on load', [usernames[i % usernames.length], word_history], wordIndex);
		}
		
		console.log(word_history);
		console.log(word_history[wordIndex]);
		
	});
	
	socket.on('next artist on skip', function(word, newWord){
		
		if(word == word_history[wordIndex] && getCorrectPlayers(usernames) == 1){
			io.emit('fire off timer', 2000);
			setTimer = setTimeout(function(){
				setNextRound('next artist on skip', newWord);
				resetPlayerStatus(usernames);
			},20000);
		}
		else if(word == true){
			io.emit('fire off timer', 0);
			clearTimeout(setTimer);
			setNextRound('next artist on skip', newWord);
			resetPlayerStatus(usernames);
		}

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
	usernames[i % usernames.length].isDrawing = true;
	usernames[(i-1) % usernames.length].isDrawing = false;	
	i += 1;
}

function setNextRound(socket, data){
	setNextArtist();
	word_history.push(data)
	wordIndex++;
	for(var i = 0; i < clients.length; i++){
		io.sockets.in(clients[i]).emit(socket, [usernames[i % usernames.length], usernames[(i + 1) % usernames.length], word_history[wordIndex], word_history[wordIndex-1]]);
	}
}

function getCorrectPlayers(arr){
	var c = 0;
	
	for (var i = 0; i < arr.length; i++){
		if(arr[i].isCorrect == true){
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