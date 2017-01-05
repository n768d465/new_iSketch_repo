var socket = io();
var userName = prompt("Welcome! Enter your name: ", generateRandomUser());
var userLabel = document.getElementById('lblUsername');

userLabel.innerHTML = "Your username:  " + userName;
var userNameToChat = userLabel.innerHTML.slice(15, userLabel.length)

socket.on('user_joined', function(msg){
	$('#txtAreaChat').append(msg + '\n')
});
	
socket.on('user_left', function(msg){
	$('#txtAreaChat').append(msg + '\n')
});
	
socket.on('chat message',function (msg){
	$('#txtAreaChat').append(msg + '\n');
});
		
	
socket.on('del_user', function(name){
	refreshPlayerList(name);
});
	
socket.on('add_user', function(name){
	refreshPlayerList(name);
});
	

socket.on('draw', function(data){
	canvas.loadFromJSON(data);
	canvas.renderAll();
});
	
socket.emit('user_joined', "[Server]" + userNameToChat + " has joined the game!");
socket.emit('add_user', userNameToChat);

$(window).on('beforeunload', function(){
    socket.emit('del_user', userNameToChat);
	socket.emit('user_left', "[Server]" + userNameToChat + " has left the game.")
});
	
$('form').submit(function(){
	socket.emit('chat message', updateTime() + $('#txtChat').val());
	$('#txtChat').val('');
	return false;
    });
	
canvas.observe('mouse:up', function(){
	console.log('mouse up');
	socket.emit('draw', JSON.stringify(canvas));
});
	
function updateTime(){
	var date = new Date();
	var time = date.toLocaleTimeString();
	var message = "[" + time + "]" + userNameToChat + ": ";
	return message;
}

	
function refreshPlayerList(name){
	$('.list-group-item').remove();
		
	for(var i = 0; i < name.length; i++){
		$('#listPlayers').append($('<li class = "list-group-item">').text(name[i].username + " " + "(" + name[i].points + ")"));
	}
}

function generateRandomUser(){
	var num = (Math.floor((Math.random() * 100) + 1)).toString();
	var user = "guest_user" + num;
	return user;
}