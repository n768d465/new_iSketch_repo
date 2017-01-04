var canvas = new fabric.Canvas('c');
canvas.isDrawingMode = true;

canvas.freeDrawingBrush.width = 3;

$('#btnClearCanvas').click(function(){
	socket.emit('draw', canvas.clear());
});