// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process under electron only.

let $ = require('jquery');
        require('bootstrap');
        require('floatthead');

//const { ipcRenderer, remote } = nodeRequire('electron');
window.Dygraph = require('dygraphs');
//require("./node_modules/dygraphs/src/extras/synchronizer.js");
require("./synchronizer.js"); // the original synchronizer is a bit broken. This one is fixed.
require("./chtloader.js");
        
// keep readings global so that
// we can access them in timer based routines.
var readingTotal = 0.0;
var readingCount = 0;
var readingUnit = "";
var graphData = [[new Date(), 0]];
var graphTop;
var graphBot;
var readingInterval = 1;
var readingIntervalCount = 0;
var graphMap = {};


// assign an event to the clear button
document.getElementById("menuFileClose").addEventListener('click',()=>{
    graphData = [];
    graphTop.updateOptions( { 'file': graphData } );
    graphBot.updateOptions( { 'file': graphData } );
    var tableBody = document.getElementById("bodyTableReadings");
    tableBody.innerHTML = "";
});

/*
// IPC
ipcRenderer.on('errorMessage', (event, props) => {
    var errorString = new TextDecoder("utf-8").decode(props.data);
    console.log("OpenLogger Error: " + errorString)
});

ipcRenderer.on('statusMessage', (event, props) => {
    console.log("OpenLogger Status: " + props.data)
});

ipcRenderer.on('saveDataMessage', (event, props) => {
    var tableBody = document.getElementById("bodyTableReadings");
    var dataToSave = "date,value,unit\n";
    for (var i = 0, row; row = tableBody.rows[i]; i++) {
        //iterate through rows
        //rows would be accessed using the "row" variable assigned in the for loop
        dataToSave += row.cells[0].textContent + "," + 
            row.cells[1].textContent + "," + 
            row.cells[2].textContent + "\n";
    }
    console.log(dataToSave);
    ipcRenderer.send('saveDataResponse', dataToSave);
});

// set various graph options from appmenu.js
ipcRenderer.on('setGraphOptionsMessage', (event, data) => {
    graphTop.updateOptions( data );
    graphBot.updateOptions( data );
    resetGraphSize(true);
});
*/

// trigger the file load operation
document.getElementById('menuFileOpen').addEventListener('click', function(evt){
    fileElem = document.getElementById("fileOpenElem");
    if (fileElem) {
        fileElem.click();
    }
    return;
    //ipcRenderer.send('openFileMessage');
});


// load the files after the user has selected them
document.getElementById('fileOpenElem').addEventListener('change', function(evt){
    if (! this.files) return;

    document.getElementById("div_t").style.display="none";
    document.getElementById("div_gt").style.display="none";
    document.getElementById("div_gb").style.display="none";
    document.getElementById("mainLoader").style.display="block";
    var file = this.files[0];
    setTimeout(function(){processChtFile(file, displayChartData);}, 10);
    document.getElementById('fileOpenElem').value = "";
    
});

function displayChartData(data){

    document.getElementById("commentsTextArea").value = data.comments;

    var tableDiv = document.getElementById("div_t");
    tableDiv.style.display="block";
    tableDiv.scrollTop = 0;
    var $table = $('#tableReadings');
    $table.floatThead('destroy');
    var tableHead = document.getElementById("headTableReadings");
    var tableBody = document.getElementById("bodyTableReadings");
    while (tableHead.firstChild) {
        tableHead.removeChild(tableHead.firstChild);
    }
    while (tableBody.firstChild) {
        tableBody.removeChild(tableBody.firstChild);
    }
    
    data.columns.forEach(function (column){
        var th = document.createElement('th');
        th.innerHTML = column;
        tableHead.appendChild(th);
    });

    graphMap = {}
    data.readings.forEach(function(reading){

        var graphRow = "";
        var row = tableBody.insertRow(-1);
        var dateTime = row.insertCell(-1);
        reading[0] = new Date(reading[0]);
        dateTime.innerHTML = reading[0].toLocaleString();

        graphMap[reading[0].getTime()] = row;

        reading.forEach(function(value, index){
            if (index > 0){
                var cell = row.insertCell(-1);
                cell.innerHTML = value;
            }
        });

    });
    
    $table.floatThead({scrollContainer:function(table){return $('#div_t')}, position:'fixed'});

    document.getElementById("div_gt").style.display="block";
    graphTop.updateOptions( { file: data.readings, series:data.series, labels:data.columns, dateWindow: null, valueRange: null } );
    document.getElementById("div_gb").style.display="block";
    graphBot.updateOptions( { file: data.readings, series:data.series, labels:data.columns, dateWindow: null, valueRange: null } );
    document.getElementById("mainLoader").style.display="none";
}

/*
// handle dragbar between graphs.
var handle = document.querySelector('#graphHandle');
var wrapper = handle.closest('.graphWrapper');
var boxTop = wrapper.querySelector('#div_gt');
var boxBottom = wrapper.querySelector('#div_gb');
var isHandleDragging = false;

document.addEventListener('mousedown', function(e) {
  // If mousedown event is fired from .handle, toggle flag to true
  if (e.target === handle) {
    isHandleDragging = true;
  }
});

document.addEventListener('mousemove', function(e) {
    // Don't do anything if dragging flag is false
    if (!isHandleDragging) {
        return false;
    }

    // Get offset
    var containerOffsetTop = wrapper.offsetTop;
    var containerHeight = wrapper.clientHeight;

    // Get x-coordinate of pointer relative to container
    var pointerRelativeYpos = e.clientY - containerOffsetTop;

    boxTop.style.height = (pointerRelativeYpos - 10) + 'px';
    boxBottom.style.height = (containerHeight - pointerRelativeYpos - 10) + 'px';

    graphTop.resize();
    graphBot.resize();

});

function resetGraphSize(force = false){
 // Get offset
    var containerOffsetTop = wrapper.offsetTop;
    var containerHeight = wrapper.clientHeight;

    if(force && graphTop && graphBot){
        boxTop.style.height = '10px';
        boxBottom.style.height = '10px';
        graphTop.resize();
        graphBot.resize();
    }

    boxTop.style.height = (containerHeight/2 - 10) + 'px';
    boxBottom.style.height = (containerHeight/2 - 10) + 'px';

    if(graphTop)
    graphTop.resize();
    if(graphBot)
    graphBot.resize();
}
resetGraphSize();

window.addEventListener('resize', function(e){
    //e.preventDefault();
    resetGraphSize();
});

document.addEventListener('mouseup', function(e) {
  // Turn off dragging flag when user mouse is up
  isHandleDragging = false;
});
*/


var lastRow = null;
var highLightTimer = null;
function highLightRow(x){
    if (graphMap[x]){
        var highLightRow = graphMap[x];
        var topPos = graphMap[x].offsetTop;
        var tableHeight = document.getElementById('div_t').clientHeight;
        document.getElementById('div_t').scrollTop = topPos - (tableHeight/2);
        lastRow = graphMap[x];
        graphMap[x].classList.add("highLightedRow");
    }
}

function graphHighlight(event, x, points, row, seriesName){
    // event: the JavaScript mousemove event
    // x: the x-coordinate of the highlighted points
    // points: an array of highlighted points: [ {name: 'series', yval: y-value}, … ]
    // row: integer index of the highlighted row in the data table, starting from 0
    // seriesName: name of the highlighted series, only present if highlightSeriesOpts is set.
    if (lastRow){
        lastRow.classList.remove("highLightedRow");
    }

    if (highLightTimer){
        clearTimeout(highLightTimer);
    }

    highLightTimer = setTimeout(function(){ highLightRow(x) }, 250);
}

function getEventCanvasCoords(event, g){
    var pos = Dygraph.findPos(g.graphDiv);
    var canvasx = Dygraph.pageX(event) - pos.x;
    var canvasy = Dygraph.pageY(event) - pos.y;
    return [canvasx, canvasy];
}

function getEventDataCoords(event, g){
    var canvasPoint = getEventCanvasCoords(event, g);
    return g.toDataCoords(canvasPoint[0], canvasPoint[1]);
}

function eventIsOnLimitBar(event, g){
    if(g.limitBars){
        for(var i = 0; i < g.limitBars.length; i++){
            var x = g.xAxisRange()[0];
            var y = g.limitBars[i];
            var limitBarCanvasY = g.toDomCoords(x, y)[1];
            var clickCanvasY = getEventCanvasCoords(event, g)[1];
            if (Math.abs(limitBarCanvasY - clickCanvasY) < 10){
                return i;
            }
        }
    }
    return false;
}

function pointIsInRect(point, rect){
    return point[0] > rect.x &&
        point[0] < rect.x + rect.width &&
        point[1] > rect.y &&
        point[1] < rect.y + rect.height;
}

function eventIsOnLimitTextBox(event, g){
    if(g.limitBars){
        for(var i = 0; i < g.limitBars.length; i++){
            var textarea = getLimitTextArea(g, i);
            var eventCoords = getEventCanvasCoords(event, g);
            if (pointIsInRect(eventCoords, textarea)){
                return i;
            }
        }
    }
    return false;
}

function limitInputKeyPressHandler(evt, graph){
    console.log(evt);
    if (evt.key == "Enter") {
            graph.limitBars[graph.editingLimitBars] = parseFloat(document.getElementsByClassName("limitInputBox")[0].value);
            $(".limitInputBox").remove();
            graph.updateOptions({});
        return false;
    }
    return true;
}

var interactionModel = {
    willDestroyContextMyself: true,
    mousedown: function (event, g, context) {

        $(".limitInputBox").remove();
        g.editingLimitBars = eventIsOnLimitTextBox(event,g); 
        
        if(g.editingLimitBars === false){
            g.draggingLimitBars = eventIsOnLimitBar(event, g);
            if(g.draggingLimitBars !== false){
                // prevents mouse drags from selecting page text.
                if (event.preventDefault) {
                    event.preventDefault();  // Firefox, Chrome, etc.
                } else {
                    event.returnValue = false;  // IE
                    event.cancelBubble = true;
                }
                isDrawing = true;
            } else {
                return Dygraph.defaultInteractionModel.mousedown(event, g, context);
            }
        } else {
            g.draggingLimitBars = false;
            var textArea = getLimitTextArea(g, g.editingLimitBars);
            var textBox = document.createElement('input');
            textBox.classList.add('limitInputBox');
            textBox.type = "number";
            textBox.style.display = "block";
            textBox.style.position = "relative";
            textBox.style.top = textArea.y + "px";
            textBox.style.left = textArea.x + "px";
            textBox.style.width = textArea.width + "px";
            textBox.value =  g.limitBars[g.editingLimitBars].toFixed(1);
            g.graphDiv.appendChild(textBox);
            textBox.addEventListener('keypress', (evt)=>{limitInputKeyPressHandler(evt, g);});
            setTimeout(function(){textBox.focus();}, 0);
        }
        
    },
    mousemove: function (event, g, context) {
        if(g.draggingLimitBars !== false){
            xy = getEventDataCoords(event, g);
            g.limitBars[g.draggingLimitBars] = xy[1];
            g.updateOptions({});
        } else {
            if(eventIsOnLimitTextBox(event, g) !== false){
                g.graphDiv.style.cursor = 'text';
            } else if(eventIsOnLimitBar(event, g) !== false){
                g.graphDiv.style.cursor = 'ns-resize';
            } else {
                g.graphDiv.style.cursor = 'default';
            }
        }
    },
    mouseup: function(event, g, context) {
        g.draggingLimitBars = false;
        //Dygraph.defaultInteractionModel.mouseup(event, g, context);
    },
    mouseout: function(event, g, context) {
        g.draggingLimitBars = false;
        //Dygraph.defaultInteractionModel.mouseout(event, g, context);
    },
    dblclick: function(event, g, context) {
        Dygraph.defaultInteractionModel.dblclick(event, g, context);
    },
    mousewheel: function(event, g, context) {
        //Dygraph.defaultInteractionModel.mousewheel(event, g, context);
    },
    touchstart: function touchstart(event, g, context) {
        DygraphInteraction.startTouch(event, g, context);
    },
    touchmove: function touchmove(event, g, context) {
        DygraphInteraction.moveTouch(event, g, context);
    },
    touchend: function touchend(event, g, context) {
        DygraphInteraction.endTouch(event, g, context);
    },


};

    window.onload = function() {

        graphTop = new Dygraph(document.getElementById("div_gt"), graphData,
            {
                drawPoints: false,
                showRoller: false,
                valueRange: null,
                labels: ['Time', 'Value'],
                labelsSeparateLines: true,
                legend: "always",
                showRangeSelector: true,
                //interactionModel: Dygraph.defaultInteractionModel, // keeps drag-to-zoom even when the range selector is set.
                interactionModel: interactionModel, 
                highlightCallback: graphHighlight,
                underlayCallback: drawLines,
                drawCallback: drawLimitTextBox,
            });
        graphBot = new Dygraph(document.getElementById("div_gb"), graphData,
            {
                drawPoints: false,
                showRoller: false,
                valueRange: null,
                labels: ['Time', 'Value'],
                labelsSeparateLines: true,
                legend: "always",
                showRangeSelector: true,
                //interactionModel: Dygraph.defaultInteractionModel, // keeps drag-to-zoom even when the range selector is set.
                interactionModel: interactionModel, 
                highlightCallback: graphHighlight,
                underlayCallback: drawLines,
                drawCallback: drawLimitTextBox,
            });

        sync = Dygraph.synchronize([graphTop, graphBot], {
            zoom: true,
            selection: true,
            range: false,
        });

        graphTop.limitBars = [120, 220]
        graphBot.limitBars = [125, 225]
        graphTop.draggingLimitBars = false;
        graphBot.draggingLimitBars = false;
        graphTop.editingLimitBars = false;
        graphBot.editingLimitBars = false;

    };

function drawLines(ctx, area, g) {

    if (typeof(g) == 'undefined') return;  // won't be set on the initial draw.
    if (! g.limitBars) return;
    var range = g.xAxisRange();
    var c = Dygraph.toRGB_(g.getColors()[0]);
    c.r = Math.floor(255 - 0.5 * (255 - c.r));
    c.g = Math.floor(255 - 0.5 * (255 - c.g));
    c.b = Math.floor(255 - 0.5 * (255 - c.b));
    var color = 'rgb(' + c.r + ',' + c.g + ',' + c.b + ')';
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.0;
    for (var i = 0; i < g.limitBars.length; i++) {
        var x1 = range[0];
        var y1 = g.limitBars[i];
        var x2 = range[1];
        var y2 = g.limitBars[i];

        var p1 = g.toDomCoords(x1, y1);
        var p2 = g.toDomCoords(x2, y2);

        ctx.beginPath();
        ctx.moveTo(p1[0], p1[1]);
        ctx.lineTo(p2[0], p2[1]);
        ctx.closePath();
        ctx.stroke();
    }
    ctx.restore();
}

function getLimitTextArea(graph, limitBarNumber){
    var pos = graph.toDomCoords(graph.xAxisRange()[0], graph.limitBars[limitBarNumber]);
    var textarea = {x: pos[0] + 30, y: pos[1] - 15, width:70, height: 30};
    
    return textarea;
}

function drawLimitTextBox(graph) {

    if (! graph.limitBars) return;

    var area = graph.getArea();
    var ctx = graph.hidden_ctx_;

    var c = Dygraph.toRGB_(graph.getColors()[0]);
    c.r = Math.floor(255 - 0.5 * (255 - c.r));
    c.g = Math.floor(255 - 0.5 * (255 - c.g));
    c.b = Math.floor(255 - 0.5 * (255 - c.b));
    var color = 'rgb(' + c.r + ',' + c.g + ',' + c.b + ')';
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.0;
    ctx.font = '18px sans-serif';

    for(var i = 0; i < graph.limitBars.length; i++){

        var text = graph.limitBars[i].toFixed(1);
        var textarea = getLimitTextArea(graph, i);
        var points = [[textarea.x, textarea.y], [textarea.x,  textarea.y + textarea.height], [textarea.x + textarea.width, textarea.y + textarea.height], [textarea.x + textarea.width, textarea.y]];
        ctx.clearRect(textarea.x, textarea.y, textarea.width, textarea.height);
        ctx.beginPath();
        ctx.moveTo(points[0][0], points[0][1]);
        for (var j = 1; j<points.length; j++){
            ctx.lineTo(points[j][0], points[j][1]);
        }
        ctx.closePath();
        ctx.stroke();

        ctx.fillText(text, textarea.x + 3, textarea.y + textarea.height - 9);

    }
    ctx.restore();
}


var desired_range = null, animate;
function approach_range() {
    if (!desired_range) return;
    // go halfway there
    var range = graphTop.xAxisRange();
    if (Math.abs(desired_range[0] - range[0]) < 60 &&
        Math.abs(desired_range[1] - range[1]) < 60) {
        graphTop.updateOptions({dateWindow: desired_range});
        // (do not set another timeout.)
    } else {
        var new_range;
        new_range = [0.5 * (desired_range[0] + range[0]),
            0.5 * (desired_range[1] + range[1])];
        graphTop.updateOptions({dateWindow: new_range});
        animate();
    }
}
animate = function() {
    setTimeout(approach_range, 50);
};

var zoom = function(evt) {
    var res = evt.target.dataset.value;
    var w = graphTop.xAxisRange();
    desired_range = [ w[0], w[0] + res * 1000 * 3600 ];
    animate();
};

var periodButtons = document.getElementsByClassName('view-period');
for(var i=0; i<periodButtons.length; i++){
    periodButtons[i].addEventListener('click', zoom);
}


