/* Some of these functions come from here: 
 * http://fabricjs.com/freedrawing
 */


var canvas = new fabric.Canvas('c');
canvas.isDrawingMode = true;

canvas.freeDrawingBrush.width = 4;

var changeColor = $('#colors');
var changeWidth = $('#lineWidth');

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

/* Found this timer from a stack overflow question.
 * Unfortunately I cannot find the exact question right now.
 */
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
