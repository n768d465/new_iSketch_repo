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

socket.on('game message', function(msg){
	$('#txtAreaGame').append(msg + '\n');	
});
		
	
socket.on('del_user', function(name){
	refreshPlayerList(name);
});
	
socket.on('add_user', function(name){
	refreshPlayerList(name);
});

socket.on('next artist', function(data){
		
	if(data.isDrawing == true){
		//document.getElementById("isDrawing").innerHTML = "You are drawing";
		$("#isDrawing").html("You are drawing.");
	}
	else{
		$("#isDrawing").html("You are NOT drawing.");
		$(".drawingTools").hide();
		canvas.isDrawingMode = false;
		canvas.hoverCursor = "default";
	}


});
	

socket.on('draw', function(data){
	canvas.loadFromJSON(data);
	
		
	canvas.forEachObject(function(o){
		o.selectable = false;
	});	
		
	
	canvas.renderAll();

});
	
socket.emit('user_joined', "[Server]" + userNameToChat + " has joined the game!");
socket.emit('add_user', userNameToChat);
socket.emit('next artist', "Welcome!");

$(window).on('beforeunload', function(){
    socket.emit('del_user', userNameToChat);
	socket.emit('user_left', "[Server]" + userNameToChat + " has left the game.")
});
	
$('#formChat').submit(function(){
	socket.emit('chat message', updateTime() + $('#txtChat').val());
	$('#txtChat').val('');
	return false;
    });
	
$('#formGame').submit(function(){
	socket.emit('game message', userNameToChat + ": " + $('#txtGame').val());
	$('#txtGame').val('');
	return false;
    });
	
	
canvas.observe('mouse:up', function(){
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

