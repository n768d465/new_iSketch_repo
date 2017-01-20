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

socket.on('game message', function(name, msg, word, points, usernames){

	if(msg.includes(word)){
		$('#txtAreaGame').append(name + " has found the word!" + "\n");
		alertSound.play();	
		refreshPlayerList(usernames);
	
	}
	else if(word.startsWith(msg)){
		console.log("close!");
		document.getElementById("closeAlert").play();
		$('#txtAreaGame').append(msg + " is close!" + "\n");
	}
	else{
		$('#txtAreaGame').append(name + ": " + msg + "\n");	
	}
	$('#txtAreaGame').scrollTop($('#txtAreaGame')[0].scrollHeight);

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
	
socket.on('add_user', function(name, word){
	userJoinedSound.play();
	
	$("#assignedWord").html(word);
	
});

socket.on('next artist on load', function(data, index){	
	if(data[0].isDrawing){
		addArtistPrivileges();
		$("#assignedWord").html("Your word is: " + data[1] + ". Remember, drawing letters is NOT allowed.");
	}
	else{
		removeArtistPrivileges();
		canvas.clear();	
	}	
});

socket.on('next artist on round end', function(data, users){
	startNextRound(data);
	$("#btnSkip").prop("disabled", false); 
	$('#txtAreaGame').append("[Game] Round has ended. The word was: " + data[2] + "\n");
	$('#txtAreaGame').append("--------------------------------------------------------" + "\n");
	$('#txtAreaGame').scrollTop($('#txtAreaGame')[0].scrollHeight);
	refreshPlayerList(users);
});	

socket.on('next artist on button skip', function(data, users){
	startNextRound(data);
	$('#txtAreaGame').append("[Game] Artist has skipped the round. A new artist is selected.\n");
	$('#txtAreaGame').append("--------------------------------------------------------" + "\n");
	$('#txtAreaGame').scrollTop($('#txtAreaGame')[0].scrollHeight);
	refreshPlayerList(users);
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


/*********** SOCIAL CHAT ***********/	
$('#formChat').submit(function(){
	socket.emit('chat message', updateTime() + $('#txtChat').val());
	$('#txtChat').val('');
	return false;
 });


/*********** GAME CHAT ***********/		
$('#formGame').submit(function(){
	
	socket.emit('game message', userNameToChat, $('#txtGame').val());
	socket.emit('next artist on round end', $('#txtGame').val(), getWord());

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

function startNextRound(arr){
	resetCanvas();
	if(arr[0].isDrawing){
		nextArtistSound.play();
		addArtistPrivileges();
		$('#txtAreaGame').append("[Game] You are drawing this round." + "\n");
		socket.emit("chat message", "[Game] " + arr[0].username  + " is drawing this round.");
		$("#assignedWord").html("Your word is: " + arr[1] + ". Remember, drawing letters is NOT allowed.");	
		$('#txtAreaChat').scrollTop($('#txtAreaChat')[0].scrollHeight);
	
	}
	else{
		endOfRoundSound.play();
		removeArtistPrivileges();
		//$('#txtAreaChat').append("[Game] " + arr[0].username  + " is drawing this round." + "\n");
		$("#assignedWord").html("");
		$('#txtAreaChat').scrollTop($('#txtAreaChat')[0].scrollHeight);

	}	
}

