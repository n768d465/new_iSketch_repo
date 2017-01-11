var canvas = new fabric.Canvas('c');
canvas.isDrawingMode = true;

canvas.freeDrawingBrush.width = 4;


var changeColor = $('#colors');
var changeWidth = $('#lineWidth');

var countOnGuess = 50;
var countOnRoundStart = 50000;
var isTimerZero = false;   
//var counter = setInterval(timerOnCorrectGuess, 10); //10 will  run it every 100th of a second
var isClicked = false;


colors.onchange = function(){
	canvas.freeDrawingBrush.color = this.value;
}

lineWidth.onchange = function(){
    canvas.freeDrawingBrush.width = parseInt(this.value, 10) || 1;
    this.previousSibling.innerHTML = this.value;	
}

$('#btnClearCanvas').click(function(){
	socket.emit('draw', canvas.clear());
});

$('#btnSkip').click(function(){
	socket.emit('next artist on button skip', getWord());
});


function timer(count)
{
    if (count <= 0)
    {
        clearInterval(counter);
        return;
     }
     count--;
	 
	 return count;
}
