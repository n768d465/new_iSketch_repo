var socket = io.connect();
var userName = prompt("Welcome! Enter your name: ", generateRandomUser());
var userLabel = document.getElementById('lblUsername');
userLabel.innerHTML = "Your username:  " + userName;
var userNameToChat = userLabel.innerHTML.slice(16, userLabel.length)

socket.emit('user_joined', "[Server] " + userNameToChat + " has joined the game!");
socket.emit('add_user', userNameToChat);
socket.emit('next artist on load', getWord());	// Needs fixing.
//socket.emit('draw', JSON.stringify(canvas));


socket.on('user_joined', function(msg){
	$('#txtAreaChat').append(msg + '\n')
});
	
socket.on('user_left', function(msg){
	$('#txtAreaChat').append(msg + '\n')
});
	
socket.on('chat message',function (msg){
	$('#txtAreaChat').append(msg + '\n');
	$('#txtAreaChat').scrollTop($('#txtAreaChat')[0].scrollHeight);
});

socket.on('game message', function(name, msg, word, points, usernames){
	var alertSound = document.getElementById("alertSound");

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
	
	document.getElementById("timer").load();
	document.getElementById("timer").play();


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
	
socket.on('del_user', function(name){
	refreshPlayerList(name);
});
	
socket.on('add_user', function(name){
	document.getElementById("userJoinedSound").play();
	refreshPlayerList(name);
});

// Needs fixing.
socket.on('next artist on load', function(data, index){
	if(data[0].isDrawing){
		addArtistPrivileges();
		$("#assignedWord").html("Your word is: " + data[1][index] + ". Remember, drawing letters is NOT allowed.");
	}
	else{
		removeArtistPrivileges();
		canvas.clear();	
	}
	
	
});

socket.on('next artist on round end', function(data, users){
	startNextRound(data);
	$("#btnSkip").prop("disabled", false); 
	$('#txtAreaGame').append("[Game] Round has ended. The word was: " + data[3] + "\n");
	$('#txtAreaGame').append("--------------------------------------------------------" + "\n");
	$('#txtAreaGame').scrollTop($('#txtAreaGame')[0].scrollHeight);
	refreshPlayerList(users);

});	

socket.on('next artist on button skip', function(data, index){
	startNextRound(data);
	$('#txtAreaGame').append("[Game] Artist has skipped the round. The word was: " + data[3] + "\n");
	$('#txtAreaGame').append("--------------------------------------------------------" + "\n");
	$('#txtAreaGame').scrollTop($('#txtAreaGame')[0].scrollHeight);

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
	socket.emit('user_left', "[Server] " + userNameToChat + " has left the game.")
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
		document.getElementById("nextArtistSound").play();
		addArtistPrivileges();
		$('#txtAreaChat').append("[Game] You are drawing this round." + "\n");
		$("#assignedWord").html("Your word is: " + arr[2] + ". Remember, drawing letters is NOT allowed.");	
		$('#txtAreaChat').scrollTop($('#txtAreaChat')[0].scrollHeight);
	
	}
	else{
		document.getElementById("endOfRoundSound").play();
		removeArtistPrivileges();
		$('#txtAreaChat').append("[Game] " + arr[1].username  + " is drawing this round." + "\n");
		$("#assignedWord").html("");
		$('#txtAreaChat').scrollTop($('#txtAreaChat')[0].scrollHeight);

	}	
}

