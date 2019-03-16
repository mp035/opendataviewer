const electron = require('electron');
// Module to control application life.
const app = electron.app;


// for communcating between renderer and main
const ipcMain = electron.ipcMain;

// save dialog to allow saving of data files
const dialog = electron.dialog;

// fs module to do the actual saving
var fs = require('fs'); // Load the File System to execute our common tasks (CRUD)

// Module to create native browser window.
const BrowserWindow = electron.BrowserWindow;

const path = require('path');
const url = require('url');

const {spawn} = require("child_process");


// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;

function createWindow () {
    // Create the browser window.
    mainWindow = new BrowserWindow({width: 1024, height: 700});

    // and load the index.html of the app.
    mainWindow.loadURL(url.format({
        pathname: path.join(__dirname, 'index.html'),
        protocol: 'file:',
        slashes: true
    }));

    // remove the menu bar from the app.
    mainWindow.setMenuBarVisibility(false);

    // Open the DevTools.
    // mainWindow.webContents.openDevTools()

    // Emitted when the window is closed.
    mainWindow.on('closed', function () {
        // Dereference the window object, usually you would store windows
        // in an array if your app supports multi windows, this is the time
        // when you should delete the corresponding element.
        mainWindow = null
    });

    require('./appmenu');
}

function startHantek(mode = "", relative = false){
    if(hantek){
        // kill the process if it is running
        hantek.kill();
    }

    var htargs = [];
    if (relative){
        htargs.push('-r');
    }
    if (mode){
        htargs.push('-m');
        htargs.push(mode);
    }

    hantek = spawn('../cli/hantek', htargs);

    mainWindow.webContents.send('statusMessage', { 'data': "Hantek process (re)started.\n" });

    hantek.on('exit', function (code, signal) {
        try{
            mainWindow.webContents.send('statusMessage', { 'data': `Hantek process exited with code ${code} and signal ${signal}\n` });
        }catch(err){
            console.log(err.message);
        }
    });

    hantek.stdout.on('data', (data) => {
        try{
            mainWindow.webContents.send('readingMessage', { 'data': data });
        }catch(err){
            console.log(err.message);
        }
    });

    hantek.stderr.on('data', (data) => {
        try{
            mainWindow.webContents.send('errorMessage', { 'data': data });
        }catch(err){
            console.log(err.message);
        }
    });


}

function killHantek(){
    if(hantek){
        // kill the process if it is running
        hantek.kill();
    }
}

ipcMain.on('saveDataResponse', (event, data) => {
    dialog.showSaveDialog({filters:[{name:"Comma Separated Variable", extensions:["csv","txt"] }]},(fileName) => {
        if (fileName === undefined){
            console.log("You didn't save the file");
            return;
        }

        // fileName is a string that contains the path and filename created in the save file dialog.  
        fs.writeFile(fileName, data, (err) => {
            if(err){
                dialog.showMessageBox({ message: "An error occurred saving the file: "+ err.message, buttons: ["OK"] });
            }else{
                dialog.showMessageBox({ message: "The file has been successfully saved.", buttons: ["OK"] });
            }
        });
    }); 
});








ipcMain.on('openFileMessage', (event, data) => {

    dialog.showOpenDialog({filters:[{name:"Chart Files", extensions:["cht","log"] }]},(fileName) => {

        if (fileName === undefined){
            console.log("You didn't load the file");
            return;
        } else {
            console.log("File selected.");
            // Read File Synchrously
            var content = fs.readFileSync(fileName[0], "utf8");
            //console.log(content);
            var chtArray = content.split(",");
            //console.log(chtArray);

            // sometimes the comments in the chart files contain commas,
            // so they appear to span multiple slots in the file.  
            // the trick is to scan the file backwards until a field
            // contains a forward slash.  That field is the date, and is
            // directly after the comments.
            var dateIndex = null;
            var dataEnd = -10;
            for (var i = chtArray.length-1; i >= 0; i--){
                // convert numeric array items to numbers and
                // find the end of the chart data.      
                //console.log(i, ": ", chtArray[i]);
                if (chtArray[i].includes("/")) {
                    console.log("dateIndex: ", i);
                    dateIndex = i;
                    break
                } 

                var chtVal = parseInt(chtArray[i])
                if (!isNaN(chtVal)){
                    chtArray[i] = chtVal;
                    if ((dataEnd < 0) && chtVal > 0) {
                        dataEnd = dataEnd + 1;
                        if (dataEnd == 0) {
                            dataEnd = i;
                            console.log("dataEnd " , i);
                        }   
                    }
                } 
            }


            // trim the chart array to valid data only
            chtArray = chtArray.slice(0,dataEnd);
            //console.log ("Length ", chtArray.length)

            var commentsArray = chtArray.slice(0,dateIndex);
            var comments = commentsArray.join(",").replace(/^"(.*)"$/, "$1"); 
            // console.log("Comments: ", comments)

            var dateStr = chtArray[dateIndex].replace(/"/g, "");
            var dateArray = dateStr.split(" ");
            var dateFields = dateArray[0].split("/");
            var timeFields = dateArray[1].split(":");
            var hour
            if (dateArray[2].includes("PM")) {
                hour = parseInt(timeFields[0]) + 12;
            } else {
                hour = parseInt(timeFields[0]);
            }
            var year = parseInt(dateFields[2])
            var month = parseInt(dateFields[1])
            var dom = parseInt(dateFields[0])
            var minute = parseInt(timeFields[1])
            var second = parseInt(timeFields[2])

            var startTime = new Date(year,month-1,dom,hour,minute,second);

            //print (os.date("%Y-%m-%dT%H:%M:%S", startTime))

            // function for local use only.
            var readIndex = dateIndex + 1
            function readValue() {
                if (readIndex < dataEnd - 1) {
                    readIndex = readIndex + 1
                    return parseInt(chtArray[readIndex - 1])
                }
                return null;
            }

            var chartMode = readValue() // mode 4 is a 3 phase chart.

            var lowCalDigits = []
            var highCalDigits = []
            var columns = ["Date/Time"]
            var series;

            if (chartMode == 1) {
                columns.push("V");
                colors.push("red");
                series = {
                    V: {
                        color: 'red',
                    }
                }
                lowCalDigits.push(readValue());
                highCalDigits.push(readValue());
                lowCalValue = 180;
                highCalValue = 280;
            } else if (chartMode == 2) {
                columns.push("V");
                series = {
                    V: {
                        color: 'red',
                    }
                };
                lowCalDigits.push(readValue());
                highCalDigits.push(readValue());
                lowCalValue = 0;
                highCalValue = 12;
            } else if (chartMode == 3 || chartMode == 5) {
                columns.push("V");
                series = {
                    V: {
                        color: 'green',
                    }
                };
                lowCalDigits.push(readValue());
                highCalDigits.push(readValue());
                lowCalValue = 0;
                highCalValue = 12;
            } else if (chartMode == 4) {
                columns.push("IA");
                columns.push("IB");
                columns.push("IC");
                series = {
                    IA: {
                        color: 'red',
                    },
                    IB: {
                        color: 'black',
                    },
                    IC: {
                        color: 'blue',
                    },
                };
                for (var i=0;i < 3; i++){
                    lowCalDigits.push(readValue());
                    highCalDigits.push(readValue());
                }    
                lowCalValue = 0;
                highCalValue = 2000;
            }

            var multipliers = [];
            for (var i=0; i < lowCalDigits.length; i++) {
                multipliers[i] = (highCalValue - lowCalValue)/(highCalDigits[i] - lowCalDigits[i]);
            }

            var readings = [];
            var maxmin = 0;
            var val = 0;
            if (chartMode != 4){
                val = readValue(); // discard the first reading
                val = readValue(); // discard the first reading
            }
            var lastVal = (highCalValue - lowCalValue) / 2 + lowCalValue;
            while (val != null) {

                if (chartMode == 4) {
                    var ia = readValue();
                    var ib = readValue();
                    var ic = readValue();
                    val = ic;
                    ia = Math.max(0,(ia-lowCalDigits[0]) * multipliers[0] + lowCalValue);
                    ib = Math.max(0,(ib-lowCalDigits[1]) * multipliers[1] + lowCalValue);
                    ic = Math.max(0,(ic-lowCalDigits[2]) * multipliers[2] + lowCalValue);
                    readings.push ([startTime, parseFloat(ia.toFixed()), parseFloat(ib.toFixed()), parseFloat(ic.toFixed())]);
                    startTime = new Date(startTime.getTime() + 60000);
                } else if (chartMode == 2 || chartMode == 3) {
                    var max = readValue();
                    var min = readValue();
                    var val = max;
                    var realval = (val-lowCalDigits[0]) * multipliers[0] + lowCalValue;
                    realval = (realval < 0) ? 0 : realval;
                    readings.push ([startTime, parseFloat(realval.toFixed(1))]);
                    startTime = new Date(startTime.getTime() + 60000);
                } else {
                    var max = readValue();
                    var min = readValue();
                    var val = (Math.abs(max-lastVal) > Math.abs(min-lastVal)) ? max : min;
                    lastVal = val;
                    var realval = (val-lowCalDigits[0]) * multipliers[0] + lowCalValue;
                    readings.push ([startTime, parseFloat(realval.toFixed(1))]);
                    startTime = new Date(startTime.getTime() + 60000);
                }    
            }

            var data = {readings:readings, comments:comments, columns:columns, series:series};

            mainWindow.webContents.send('loadDataMessage', data);
        }

    });

});


















// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow)

// Quit when all windows are closed.
app.on('window-all-closed', function () {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }

})

app.on('activate', function () {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
