/* Some of these functions come from here:
 * http://fabricjs.com/freedrawing
 */


var canvas = new fabric.Canvas('c');
var hintCount = 0;
canvas.isDrawingMode = true;

var context = document.getElementById("c").getContext("2d");
canvas.freeDrawingBrush.color = "#fff";
canvas.freeDrawingBrush.width = 4;

colors.onchange = function(){
	canvas.freeDrawingBrush.color = this.value;
}


$("#btnColors").click(() => {
	$("#colors").focus();
	$("#colors").click();
});

$("#btnEraser").click(() =>{
	canvas.freeDrawingBrush.color = "#333";
});

$("#btnUndo").click(() =>{

	socket.emit('draw', undoDrawing());

});

$("#btnHint").click(()=>{
	hintCount++;
	socket.emit('give hint', hintCount, clientName);
});

lineWidth.onchange = function(){
    canvas.freeDrawingBrush.width = parseInt(this.value, 10) || 1;
    this.previousSibling.innerHTML = this.value;
}

$('#btnClearCanvas').click(() => {
	socket.emit('draw', clearCanvas());
});

$('#btnSkip').click(() => {
	socket.emit('skip round', clientName, getWord());
});

/* Found this timer from a stack overflow question.
 * Unfortunately I cannot find the exact question right now.
 */
function timer()
{
    if (count <= 0)
    {
        clearInterval(counter);
        return;
     }
     count--;

	 return count;
}

function resetCanvas(){
    canvas.clear();
    canvas.freeDrawingBrush.width = 4;
    canvas.freeDrawingBrush.color = "#000";
	canvas.backgroundColor="#333";
	canvas.renderAll();
}

function clearCanvas(){
	canvas.clear();
	canvas.backgroundColor="#333";
	return canvas.renderTop();
}

function undoDrawing(){
	canvas._objects.pop();
	return canvas.renderAll();
}

$('#myModal').on('shown.bs.modal', function () {
  $('#myInput').focus()
})

canvas.backgroundColor="#333";
canvas.renderAll();
