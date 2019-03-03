/* Some of these functions come from here:
 * http://fabricjs.com/freedrawing
 */

const defaultBackgroundColor = "#fff";
const defaultBrushColor = "#000";

var canvas = new fabric.Canvas('c', {width: 575, height:575});
var hintCount = 0;
canvas.isDrawingMode = true;

var context = document.getElementById("c").getContext("2d");
canvas.freeDrawingBrush.color = defaultBrushColor;
canvas.freeDrawingBrush.width = 4;

colors.onchange = function(){
	canvas.freeDrawingBrush.color = this.value;
}

$("#btnColors").click(() => {
	$("#colors").focus();
	$("#colors").click();
});

$("#btnEraser").click(() =>{
	canvas.freeDrawingBrush.color = defaultBackgroundColor;
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
    $("#spanTool").html(canvas.freeDrawingBrush.width);
}

$('#btnClearCanvas').click(() => {
	socket.emit('draw', clearCanvas());
});

$('#btnSkip').click(() => {
	socket.emit('skip round', clientName, getWord());
});

function resetCanvas(){
    canvas.clear();
    canvas.freeDrawingBrush.width = 4;
    canvas.freeDrawingBrush.color = "#000";
	canvas.backgroundColor=defaultBackgroundColor;
	canvas.renderAll();
}

function clearCanvas(){
	canvas.clear();
	canvas.backgroundColor=defaultBackgroundColor;
	return canvas.renderTop();
}

function undoDrawing(){
	canvas._objects.pop();
	return canvas.renderAll();
}

$('#myModal').on('shown.bs.modal', function () {
  $('#myInput').focus()
})

/*canvas.on('mouse:up', function() {
  canvas.getObjects().forEach(o => {
    o.fill = 'blue'
  });
  canvas.renderAll();
})*/

canvas.backgroundColor=defaultBackgroundColor;
canvas.renderAll();
