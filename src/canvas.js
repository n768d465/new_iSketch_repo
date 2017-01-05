var canvas = new fabric.Canvas('c');
canvas.isDrawingMode = true;

canvas.freeDrawingBrush.width = 4;

var changeColor = $('#colors');
var changeWidth = $('#lineWidth');

colors.onchange = function(){
	canvas.freeDrawingBrush.color = this.value;
	console.log(this.color);
}

lineWidth.onchange = function(){
    canvas.freeDrawingBrush.width = parseInt(this.value, 10) || 1;
    this.previousSibling.innerHTML = this.value;	
}

$('#btnClearCanvas').click(function(){
	socket.emit('draw', canvas.clear());
});