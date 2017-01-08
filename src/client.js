var socket = io();
var userName = prompt("Welcome! Enter your name: ", generateRandomUser());
var userLabel = document.getElementById('lblUsername');
var word = "";

userLabel.innerHTML = "Your username:  " + userName;
var userNameToChat = userLabel.innerHTML.slice(16, userLabel.length)


socket.on('user_joined', function(msg){
	$('#txtAreaChat').append(msg + '\n')
});
	
socket.on('user_left', function(msg){
	$('#txtAreaChat').append(msg + '\n')
});
	
socket.on('chat message',function (msg){
	$('#txtAreaChat').append(msg + '\n');
});

socket.on('game message', function(name, msg, word, points, usernames){
	
	if(msg == word){
		$('#txtAreaGame').append(name + " has found the word!" + "\n");	
		$('.list-group-item').remove();
		refreshPlayerList(usernames);
		

	}
	else{
		$('#txtAreaGame').append(name + ": " + msg + "\n");	
	}
});
		
	
socket.on('del_user', function(name){
	refreshPlayerList(name);
});
	
socket.on('add_user', function(name){
	refreshPlayerList(name);
});

socket.on('next artist on load', function(data, index){
	
	if(data[0].isDrawing == true){
		addArtistPrivileges();
		//$('#txtAreaChat').append("[Game] You are drawing this round." + "\n");
		$("#assignedWord").html("Your word is: " + data[1][index] + ". Remember, drawing letters is NOT allowed.");						
	}
	else{
		removeArtistPrivileges();
		$('#txtAreaChat').append("[Game] " + data[0].username  + " is drawing this round." + "\n");
		$("#assignedWord").html(data[1][index]);
		canvas.clear();	
	}
	
	
});

socket.on('next artist on skip', function(data, index){
	
	canvas.clear(); 
	if(data[0].isDrawing == true){
		addArtistPrivileges();
		$('#txtAreaChat').append("[Game] You are drawing this round." + "\n");
		$("#assignedWord").html("Your word is: " + data[2] + ". Remember, drawing letters is NOT allowed.");		
	}
	else{
		removeArtistPrivileges();
		$('#txtAreaChat').append("[Game] " + data[1].username  + " is drawing this round." + "\n");
		$("#assignedWord").html(data[2]);
	}	
});	

socket.on('draw', function(data){
	canvas.loadFromJSON(data);
		
	canvas.forEachObject(function(o){
		o.selectable = false;
	});	
		
	canvas.renderAll();

});
	
socket.emit('user_joined', "[Server] " + userNameToChat + " has joined the game!");
socket.emit('add_user', userNameToChat);
socket.emit('next artist on load', getWord());


$(window).on('beforeunload', function(){
    socket.emit('del_user', userNameToChat);
	socket.emit('user_left', "[Server] " + userNameToChat + " has left the game.")
});


/*********** SOCIAL CHAT ***********/	
$('#formChat').submit(function(){
	socket.emit('chat message', updateTime() + $('#txtChat').val());
	$('#txtAreaChat').scrollTop($('#txtAreaChat')[0].scrollHeight);
	$('#txtChat').val('');
	return false;
    });


/*********** GAME CHAT ***********/		
$('#formGame').submit(function(){
	//document.getElementById("txtAreaGame").scrollTop = document.getElementById("txtAreaGame").scrollHeight 
	$('#txtAreaGame').scrollTop($('#txtAreaGame')[0].scrollHeight);
	socket.emit('game message', userNameToChat, $('#txtGame').val());
	$('#txtGame').val('');
	return false;
    });
	
canvas.observe('mouse:up', function(){
	socket.emit('draw', JSON.stringify(canvas));
});
	
function updateTime(){
	var date = new Date();
	var time = date.toLocaleTimeString();
	var message = "[" + time + "] " + userNameToChat + ": ";
	return message;
}

	
function refreshPlayerList(name){
	$('.list-group-item').remove();
		
	for(var i = 0; i < name.length; i++){
		$('#listPlayers').append($('<li class = "list-group-item">').text(name[i].username + " " + "(" + name[i].points + ")"));
	}
	
}

function generateRandomUser(){
	var num = (Math.floor((Math.random() * 1000) + 1)).toString();
	var user = "guest_user" + num;
	return user;
}

function addArtistPrivileges(){
	$(".drawingTools").show();
	canvas.isDrawingMode = true;
	canvas.hoverCursor = "crosshair";
}

function removeArtistPrivileges(){
	$(".drawingTools").hide();
	canvas.isDrawingMode = false;
	canvas.hoverCursor = "default";	
}

function getWord(){
	var rand = (Math.floor((Math.random() * words.length) + 1));
	return words[rand];
}

function getListLength(){
	var list = document.getElementsByTagName('li');
	return list.length;
}

