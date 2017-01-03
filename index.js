var express = require('express'),app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

app.use(express.static(__dirname + '/lib'));
app.use(express.static(__dirname + '/src'));
app.use(express.static(__dirname + '/node_modules'));




var usernames = {};
var line_history = [];

app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

// User connected or disconnected.
io.on('connection', function(socket){
  console.log('New user connected.');

  socket.on('disconnect', function(){
    console.log('User disconnected');
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
  
  
  // This will let everyone know that a new user has joined the game.
  socket.on('new_user', function(msg){
	  io.emit('new_user', msg);
  });

});

http.listen(3000, function(){
  console.log('listening on *:3000');
});


io.on('connection', function(socket){

    socket.on('draw', function(data){
        io.emit('draw', data);
    })

});