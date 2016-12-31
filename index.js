var express = require('express'),app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

app.use(express.static(__dirname + '/lib'));
app.use(express.static(__dirname + '/src'));
app.use(express.static(__dirname + '/node_modules'));


app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

io.on('connection', function(socket){
  console.log('New user connected.');

  socket.on('disconnect', function(){
    console.log('User disconnected');
  });

});

io.on('connection', function(socket){
  socket.on('chat message', function(msg){
    console.log('message: ' + msg);
  });

  socket.on('chat message', function(msg){
    io.emit('chat message', msg);
  });

});


http.listen(3000, function(){
  console.log('listening on *:3000');
});
