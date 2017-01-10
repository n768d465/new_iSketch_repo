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
		refreshPlayerList(usernames);	
	}
	else{
		$('#txtAreaGame').append(name + ": " + msg + "\n");	
	}
});

socket.on('fire off timer', function(time){
	
	var count = 500;
	var counter = setInterval(function(){
		timer();
		document.getElementById("timerOnFirstGuess").innerHTML= count / 100;
	
	}, 10)

	function timer()
	{
		if (count <= 0)
		{
			clearInterval(counter);
			document.getElementById("timerOnFirstGuess").innerHTML= "asf";
			return;
		}
		count--;
	 
	
	}
	
});		

socket.on('next artist on time', function(data, index){
	
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
		$("#assignedWord").html("Your word is: " + data[1][index] + ". Remember, drawing letters is NOT allowed.");
	}
	else{
		removeArtistPrivileges();
		$('#txtAreaChat').append("[Game] " + data[0].username  + " is drawing this round." + "\n");
		canvas.clear();	
	}
	
	
});

socket.on('next artist on skip', function(data, index){
		startNextRound(data);

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
	$('#txtAreaGame').scrollTop($('#txtAreaGame')[0].scrollHeight);
	
	socket.emit('game message', userNameToChat, $('#txtGame').val());
	socket.emit('next artist on time', userNameToChat, $('#txtGame').val(), getWord());
	
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

function startNextRound(arr){
	canvas.clear(); 
	if(arr[0].isDrawing == true){
		addArtistPrivileges();
		$('#txtAreaChat').append("[Game] You are drawing this round." + "\n");
		$("#assignedWord").html("Your word is: " + arr[2] + ". Remember, drawing letters is NOT allowed.");		
	}
	else{
		removeArtistPrivileges();
		$('#txtAreaChat').append("[Game] " + arr[1].username  + " is drawing this round." + "\n");
		$("#assignedWord").html(arr[2]);
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
