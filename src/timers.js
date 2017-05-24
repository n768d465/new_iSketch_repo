var alarmCounter;
var roundCounter;
var alarmTimer = function(count) {
    if (count <= 0) {
        document.getElementById("timer").pause();
        $("#timerOnFirstGuess").hide();
        clearInterval(alarmCounter);
        resetCanvas();
        return;
    }

}

var startAlarmTimer = function(count) {
    socket.emit('get word', getWord());
    clearInterval(roundCounter);
    $("#timerOnRoundStart").empty();
    alarmCounter = setInterval(function() {
        alarmTimer(count--);
        $("#timerOnFirstGuess").html(count / 100);
    }, 10);
}

var startNormalTimer = function(time) {
    socket.emit('get word', getWord());
    clearInterval(roundCounter);

    $("#timerOnRoundStart").empty();

    var startTime = time;
    
    roundCounter = setInterval(function() {
        time -= 1000;
        var minutes = Math.floor((time % (1000 * 60 * 60)) / (1000 * 60));
        var seconds = Math.floor((time % (1000 * 60)) / 1000);

        if (seconds <= 9) {
            $("#timerOnRoundStart").empty().append(minutes + ":" + '0' + seconds);
            console.log(time);

        } else {
            $("#timerOnRoundStart").empty().append(minutes + ":" + seconds);
            console.log(time);

        }

        if (time <= 0) {
            $("#timerOnRoundStart").hide();
            clearInterval(time);
            resetCanvas();
            return;
        }
    }, 1000)

}
