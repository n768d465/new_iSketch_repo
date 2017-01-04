var express = require('express'),app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

app.use(express.static(__dirname + '/lib'));
app.use(express.static(__dirname + '/src'));
app.use(express.static(__dirname + '/node_modules'));

var usernames = [];

app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

// User connected or disconnected.
io.on('connection', function(socket){
	console.log('New user connected.');
  

	socket.on('disconnect', function(name){
		console.log('User disconnected');
	});
  
    // This will let everyone know that a new user has joined the game.
	socket.on('user_joined', function(msg){
		io.emit('user_joined', msg);
	});
	
	socket.on('user_left', function(msg){
		io.emit('user_left', msg);
	});
  
	socket.on('add_user', function(name){
		usernames.push(name);
		console.log(usernames);
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
		console.log(usernames);
		io.emit('del_user', usernames);  
	});
  
});

http.listen(3000, function(){
	console.log('listening on *:3000');
});

// Canvas
io.on('connection', function(socket){

    socket.on('draw', function(data){
        io.emit('draw', data);
    })
});


function removePlayer(playerName){
	var user = usernames.indexOf(playerName);
	usernames.splice(user, 1);
}





