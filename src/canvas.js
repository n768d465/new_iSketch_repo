/* Some of these functions come from here: 
 * http://fabricjs.com/freedrawing
 */


var canvas = new fabric.Canvas('c');
canvas.isDrawingMode = true;

var context = document.getElementById("c").getContext("2d");
canvas.freeDrawingBrush.color = "#fff";
canvas.freeDrawingBrush.width = 4;

colors.onchange = function(){
	canvas.freeDrawingBrush.color = this.value;
}


lineWidth.onchange = function(){
    canvas.freeDrawingBrush.width = parseInt(this.value, 10) || 1;
    this.previousSibling.innerHTML = this.value;	
}

$('#btnClearCanvas').click(() => {
	socket.emit('draw', canvas.clear());
});

$('#btnSkip').click(() => {
	socket.emit('next artist on button skip', getWord());
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
    canvas.freeDrawingBrush.color = "#fff";
}
