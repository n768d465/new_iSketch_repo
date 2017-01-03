var canvas = new fabric.Canvas('c');

canvas.isDrawingMode = true;

function fetchCanvasData(){
	var canvasData = JSON.stringify(canvas);
	console.log(canvasData);
	return canvasData;
}

function sendCanvasData(){
	canvas.loadFromJSON(fetchCanvasData());
    return canvas.renderAll();
	
}

