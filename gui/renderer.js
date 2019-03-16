// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.


//var Dygraph = require('dygraphs');
//var DGSync = require("./node_modules/dygraphs/src/extras/synchronizer.js");
const { ipcRenderer, remote } = require('electron');

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

// wrap initHantekMessage in function call
function startHantek(mode = '', relative = false){
    ipcRenderer.send('initHantekMessage', {
      mode: mode,
      relative: relative,
    });
}

/*
// assign an event to the clear button
document.getElementById("btnClear").addEventListener('click',()=>{
    graphData = [];
    graphTop.updateOptions( { 'file': graphData } );
    graphBot.updateOptions( { 'file': graphData } );
    var tableBody = document.getElementById("bodyTableReadings");
    tableBody.innerHTML = "";
});
*/

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

// trigger the file load operation
document.getElementById('menuFileOpen').addEventListener('click', function(evt){
    $(evt.target).closest('.ui.dropdown').dropdown('hide');
    $(evt.target).dropdown('clear');
    ipcRenderer.send('openFileMessage');
});
    
ipcRenderer.on('loadDataMessage', (event, data) => {

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
    graphTop.updateOptions( { file: data.readings, series:data.series, labels:data.columns, dateWindow: null, valueRange: null } );
    graphBot.updateOptions( { file: data.readings, series:data.series, labels:data.columns, dateWindow: null, valueRange: null } );
});

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
        console.log(tableHeight);
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
                interactionModel: Dygraph.defaultInteractionModel, // keeps drag-to-zoom even when the range selector is set.
                highlightCallback: graphHighlight,
                underlayCallback: drawLines,
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
                interactionModel: Dygraph.defaultInteractionModel, // keeps drag-to-zoom even when the range selector is set.
                highlightCallback: graphHighlight,
                underlayCallback: drawLines,
            });

    sync = Dygraph.synchronize([graphTop, graphBot], {
        zoom: true,
        selection: true,
        range: false,
    });

    // initialise the semantic dropdown controls.
    $('.ui.dropdown').dropdown();

};

function drawLines(ctx, area, g) {
    
    if (typeof(g) == 'undefined') return;  // won't be set on the initial draw.

    var range = g.xAxisRange();
    var vals = [125,225];
    for (var i = 0; i < vals.length; i++) {
        if (!vals[i]) continue;
        var x1 = range[0];
        var y1 = vals[i];
        var x2 = range[1];
        var y2 = vals[i];

        var p1 = g.toDomCoords(x1, y1);
        var p2 = g.toDomCoords(x2, y2);

        var c = Dygraph.toRGB_(g.getColors()[0]);
        c.r = Math.floor(255 - 0.5 * (255 - c.r));
        c.g = Math.floor(255 - 0.5 * (255 - c.g));
        c.b = Math.floor(255 - 0.5 * (255 - c.b));
        var color = 'rgb(' + c.r + ',' + c.g + ',' + c.b + ')';
        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.0;
        ctx.beginPath();
        ctx.moveTo(p1[0], p1[1]);
        ctx.lineTo(p2[0], p2[1]);
        ctx.closePath();
        ctx.stroke();
        ctx.restore();
    }
}
