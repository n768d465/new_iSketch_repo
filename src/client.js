var socket = io.connect();
var userName = prompt("Welcome! Enter your name: ", generateRandomUser());
var userLabel = document.getElementById('lblUsername');
userLabel.innerHTML = "Your username:  " + userName;
var userNameToChat = userLabel.innerHTML.slice(16, userLabel.length)
var alertSound = document.getElementById("alertSound");
var userJoinedSound = document.getElementById("userJoinedSound");
var timerSound = document.getElementById("timer");
var nextArtistSound = document.getElementById("nextArtistSound");
var endOfRoundSound = document.getElementById("endOfRoundSound");

socket.emit('add_user', userNameToChat, getWord());
//socket.emit('next artist on load', getWord());
socket.emit('user_joined', "[Server] " + userNameToChat + " has joined the game!");

socket.on('user_joined', function(msg, users){
	userJoinedSound.play();
	$('#txtAreaChat').append(msg + '\n')
	refreshPlayerList(users);

});
	
socket.on('user_left', function(msg){
	$('#txtAreaChat').append(msg + '\n')
});
	
socket.on('chat message',function (msg){
	$('#txtAreaChat').append(msg + '\n');
	$('#txtAreaChat').scrollTop($('#txtAreaChat')[0].scrollHeight);
});

socket.on('game message', function(msg, usernames,isCorrect){

	if(isCorrect){alertSound.play();}
	$("#txtAreaGame").append(msg);
	$('#txtAreaGame').scrollTop($('#txtAreaGame')[0].scrollHeight);
	refreshPlayerList(usernames);


});

socket.on('fire off timer', function(time, isClicked){
	timerSound.load();
	timerSound.play();

	var counter; 
	var count = time;
	$("#timerOnFirstGuess").show();
	
	$("#btnSkip").prop("disabled", true);

	counter = setInterval(function(){
		timer();		
		$("#timerOnFirstGuess").html(count / 100);
	}, 10);

	function timer()
	{
		if (count <= 0)
		{
			document.getElementById("timer").pause();
			$("#timerOnFirstGuess").hide(); 
			clearInterval(counter);
			resetCanvas();
			return;
		}
		count--;
	}
	
});		
	
socket.on('del_user', function(usernames, msg){
	$("#txtAreaChat").append(msg);
	$('#txtAreaChat').scrollTop($('#txtAreaChat')[0].scrollHeight);
	refreshPlayerList(usernames);
});
	
socket.on('add_user', function(name, word, isArtist){
	
	if(isArtist){
		addArtistPrivileges();
		$("#assignedWord").html(word);

	}
	else{
		removeArtistPrivileges();
		$("#assignedWord").html("");

	}


});

socket.on('draw', function(data){
	canvas.loadFromJSON(data);
	canvas.forEachObject(function(o){
		o.selectable = false;
	});		
	canvas.renderAll();
});

$(window).on('beforeunload', function(){
    socket.emit('del_user', userNameToChat);
});

socket.on('next round', function(usernames, word, isArtist){
	$("#btnSkip").prop("disabled", false);
	if(isArtist){
		addArtistPrivileges();
		nextArtistSound.play();
	}
	else{
		removeArtistPrivileges();
		endOfRoundSound.play();

	}
	$("#assignedWord").html(word);
	refreshPlayerList(usernames);
	resetCanvas();
});

/*********** SOCIAL CHAT ***********/	
$('#formChat').submit(function(){
	socket.emit('chat message', updateTime() + $('#txtChat').val());
	$('#txtChat').val('');
	return false;
 });


/*********** GAME CHAT ***********/		
$('#formGame').submit(function(){
	
	socket.emit('game message', userNameToChat, $('#txtGame').val(), getWord());

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

	name.sort(function(a,b){
		return b.points-a.points;
	})
		
	for(var i = 0; i < name.length; i++){
		if(name[i].isCorrect){
			$('#listPlayers').append($('<li style = "color: red" class = "list-group-item">').text(name[i].username + " " + "(" + name[i].points + ")"));
		}
		else if(name[i].isDrawing){
			$('#listPlayers').append($('<li style = "color: green" class = "list-group-item">').text(name[i].username + " " + "(" + name[i].points + ")"));			
		}
		else{
			$('#listPlayers').append($('<li style = "color: black" class = "list-group-item">').text(name[i].username + " " + "(" + name[i].points + ")"));
		}
	}
	
}

function generateRandomUser(){
	var num = (Math.floor((Math.random() * 1000) + 1)).toString();
	var user = "guest_user" + num;
	return user;
}

function addArtistPrivileges(){
	$(".drawingTools").show();
	$("#txtGame").prop("disabled", true);
	canvas.isDrawingMode = true;
	canvas.hoverCursor = "crosshair";
}

function removeArtistPrivileges(){
	$(".drawingTools").hide();
	$("#txtGame").prop("disabled", false);
	canvas.isDrawingMode = false;
	canvas.hoverCursor = "default";	
}

function getWord(){
	var rand = (Math.floor((Math.random() * words.length) + 1));
	return words[rand];
}
