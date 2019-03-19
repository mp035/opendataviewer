(function(){

    function processChtFile(file, outputFunc){

        if (file === undefined){
            console.log("You didn't load the file");
            return;
        } else {
            var reader = new FileReader();

            reader.onload = function(e) {
                // Read File Asynchrously
                var content = reader.result;
                var chtArray = content.split(",");

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
                    if (chtArray[i].includes("/")) {
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
                            }   
                        }
                    } 
                }


                // trim the chart array to valid data only
                chtArray = chtArray.slice(0,dataEnd);

                var commentsArray = chtArray.slice(0,dateIndex);
                var comments = commentsArray.join(",").replace(/^"(.*)"$/, "$1"); 

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

                var data = {readings:readings, comments:comments, columns:columns, series:series, filename:file.name, filepath:file.path};
                outputFunc(data);
            }

            reader.readAsText(file)

        }

    }

    function processJlgFile(file, outputFunc){

        if (file === undefined){
            console.log("You didn't load the file");
            return;
        } else {
            var reader = new FileReader();

            reader.onload = function(e) {
                // Read File Asynchrously
                var content = reader.result;
                var data = JSON.parse(pako.inflate(content, { to: 'string' }));
                outputFunc(data);
            }
        }
        //reader.readAsBinaryString(file)
        reader.readAsText(file)
    }

    function getValueFromHeader(nodeName, headerText){
        nodeName = nodeName.toUpperCase();
        var searchString = "<TYPE>1<\\/TYPE>.*<" + nodeName + ">(.*)<\\/" + nodeName + ">";
        var regex = new RegExp(searchString);
        var value = headerText.match(regex);
        return value ? value[1] : false;
    }

    function processLogFile(file, outputFunc){
        
        if (file === undefined){
            console.log("You didn't load the file");
            return;
        } else {
            var reader = new FileReader();

            reader.onload = function(e) {
                // Read File Asynchrously

                // get the header string from the file.
                var result = new Uint8Array(reader.result);
                var logEndMatch = "</LOG>";
                var header = "";

                for (var i = 0; i < result.length - logEndMatch.length; i++){
                //for (var i = 0; i<1600; i++){
                    testStr = new TextDecoder("utf-8").decode(result.slice(i, i + logEndMatch.length));
                    if (testStr == logEndMatch){
                        header = new TextDecoder("utf-8").decode(result.slice(0, i + logEndMatch.length));
                        break;
                    }
                }

                var unitId = parseInt(getValueFromHeader("UNITID", header));
                var model = getValueFromHeader("MODEL", header);
                var startTime = new Date(getValueFromHeader("START", header));
                var comments = getValueFromHeader("COMMENTS", header);
                var seekValue = parseInt(getValueFromHeader("SEEK", header));

                // a couple of regex's to sanity check the data structure of the file.
                var singlePhaseDataStruct = /<DATASTRUCT><0><TYPE>PERIOD<\/TYPE><SIZE>8<\/SIZE><\/0><1><TYPE>READING<\/TYPE><NUMBER>0<\/NUMBER><AVGSIZE>0<\/AVGSIZE><MAXSIZE>16<\/MAXSIZE><MINSIZE>16<\/MINSIZE><\/1><\/DATASTRUCT>/
                var threePhaseDataStruct = /<DATASTRUCT><0><TYPE>PERIOD<\/TYPE><SIZE>8<\/SIZE><\/0><1><TYPE>READING<\/TYPE><NUMBER>0<\/NUMBER><AVGSIZE>0<\/AVGSIZE><MAXSIZE>16<\/MAXSIZE><MINSIZE>0<\/MINSIZE><\/1><2><TYPE>READING<\/TYPE><NUMBER>1<\/NUMBER><AVGSIZE>0<\/AVGSIZE><MAXSIZE>16<\/MAXSIZE><MINSIZE>0<\/MINSIZE><\/2><3><TYPE>READING<\/TYPE><NUMBER>2<\/NUMBER><AVGSIZE>0<\/AVGSIZE><MAXSIZE>16<\/MAXSIZE><MINSIZE>0<\/MINSIZE><\/3><\/DATASTRUCT>/

                // model SC01 unit id 1 is mains voltage voltlogger
                // model SC01 unit id 2 is aflc voltage voltlogger
                // model SC02 unit id 3 is men voltage safelogger
                // model FL01 unit id 4 is 3 phase current flexilogger
                // model PL01 unit id 4 is power logger (not supported)
                var highCalValue = 0;
                var lowCalValue = 0;
                var highCalDigits = [];
                var lowCalDigits = [];
                var columns = ["Date/Time"]
                var series;

                if (model == "FL01" && unitId == 4){
                    // flexilogger.
                    if (! header.match(threePhaseDataStruct)){
                        throw "ERROR! Data structure does not match!";
                    }
                    
                    var calValues = header.match(/<TRACE><0><NUMBER>0<\/NUMBER><NAME>IA<\/NAME><HIGHCALDIGITS>(.*)<\/HIGHCALDIGITS><LOWCALDIGITS>(.*)<\/LOWCALDIGITS><HIGHCALVALUE>2000<\/HIGHCALVALUE><LOWCALVALUE>0<\/LOWCALVALUE><SURGEVAR>0<\/SURGEVAR><SAGVAR>0<\/SAGVAR><SCALEMAX>2000<\/SCALEMAX><SCALEMIN>0<\/SCALEMIN><CHARTINDEX>1<\/CHARTINDEX><\/0><1><NUMBER>1<\/NUMBER><NAME>IB<\/NAME><HIGHCALDIGITS>(.*)<\/HIGHCALDIGITS><LOWCALDIGITS>(.*)<\/LOWCALDIGITS><HIGHCALVALUE>2000<\/HIGHCALVALUE><LOWCALVALUE>0<\/LOWCALVALUE><SURGEVAR>0<\/SURGEVAR><SAGVAR>0<\/SAGVAR><SCALEMAX>2000<\/SCALEMAX><SCALEMIN>0<\/SCALEMIN><CHARTINDEX>1<\/CHARTINDEX><\/1><2><NUMBER>2<\/NUMBER><NAME>IC<\/NAME><HIGHCALDIGITS>(.*)<\/HIGHCALDIGITS><LOWCALDIGITS>(.*)<\/LOWCALDIGITS><HIGHCALVALUE>2000<\/HIGHCALVALUE><LOWCALVALUE>0<\/LOWCALVALUE><SURGEVAR>0<\/SURGEVAR><SAGVAR>0<\/SAGVAR><SCALEMAX>2000<\/SCALEMAX><SCALEMIN>0<\/SCALEMIN><CHARTINDEX>1<\/CHARTINDEX><\/2><\/TRACE>/);
                    calValues = calValues.slice(1, calValues.length);
                    if (calValues.length != 6) {
                        throw "ERROR! Calibration data is not of the correct length";
                    }
                    for (var i = 0; i < calValues.length; i+= 2){
                        highCalDigits.push(calValues[i]);
                        lowCalDigits.push(calValues[i+1]);
                    }
                    highCalValue = 2000;
                    lowCalValue = 0;
                    
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
                } else if (
                    (model == "SC01" && unitId == 1) || 
                    (model == "SC01" && unitId == 2) || 
                    (model == "SC02" && unitId == 3) 
                ){
                    // voltlogger and safelogger
                    if (! header.match(singlePhaseDataStruct)) {
                        throw "ERROR! Data structure does not match!";
                    } 
                    
                    highCalDigits.push(parseInt(getValueFromHeader("HIGHCALDIGITS", header)));
                    lowCalDigits.push(parseInt(getValueFromHeader("LOWCALDIGITS", header)));
                    highCalValue = parseInt(getValueFromHeader("HIGHCALVALUE", header));
                    lowCalValue = parseInt(getValueFromHeader("LOWCALVALUE", header));
                    
                    columns.push("V");
                    series = {
                        V: {
                            color: 'red',
                        }
                    }

                } else {
                    throw "ERROR! The device that recorded this file is not supported."
                }

                var multipliers = [];
                for (var i=0; i < lowCalDigits.length; i++) {
                    multipliers[i] = (highCalValue - lowCalValue)/(highCalDigits[i] - lowCalDigits[i]);
                }

                var position = seekValue;
                // a functin for local use only
                function readValues(){
                    var values = [];
                    var blockSize = 5;
                    if (model == "FL01"){
                       blockSize = 7 
                    }
                    if (position > result.length - blockSize) {
                        return null;
                    }
                    for (var i = position + 1; i < position + blockSize; i+=2){
                        values.push(result[i] + result[i+1] * 256);
                    }
                    position += blockSize;
                    return values;
                }


                var readings = [];
                var val = [0,0,0];
                if (model != "FL01"){
                    val = readValues(); // discard the first reading
                }
                val = readValues();
                var lastVal = (highCalValue - lowCalValue) / 2 + lowCalValue;
                while (val != null) {

                    if (unitId == 4) {
                        var ia = val[0];
                        var ib = val[1];
                        var ic = val[2];
                        ia = Math.max(0,(ia-lowCalDigits[0]) * multipliers[0] + lowCalValue);
                        ib = Math.max(0,(ib-lowCalDigits[1]) * multipliers[1] + lowCalValue);
                        ic = Math.max(0,(ic-lowCalDigits[2]) * multipliers[2] + lowCalValue);
                        readings.push ([startTime, parseFloat(ia.toFixed()), parseFloat(ib.toFixed()), parseFloat(ic.toFixed())]);
                        startTime = new Date(startTime.getTime() + 60000);
                    } else if (unitId == 2 || unitId == 3) {
                        var max = val[0];
                        var min = val[1];
                        console.log(max);
                        var realmax = (max-lowCalDigits[0]) * multipliers[0] + lowCalValue;
                        console.log(realmax);
                        realmax = (realmax < 0) ? 0 : realmax;
                        readings.push ([startTime, parseFloat(realmax.toFixed(1))]);
                        startTime = new Date(startTime.getTime() + 60000);
                    } else {
                        var max = val[0];
                        var min = val[1];
                        var recordedVal = (Math.abs(max-lastVal) > Math.abs(min-lastVal)) ? max : min;
                        lastVal = recordedVal;
                        var realval = (recordedVal-lowCalDigits[0]) * multipliers[0] + lowCalValue;
                        readings.push ([startTime, parseFloat(realval.toFixed(1))]);
                        startTime = new Date(startTime.getTime() + 60000);
                    }    
                    val = readValues();
                }

                var data = {readings:readings, comments:comments, columns:columns, series:series, filename:file.name, filepath:file.path};
                outputFunc(data);
                
            }
        }
        //reader.readAsBinaryString(file)
        //reader.readAsText(file)
        reader.readAsArrayBuffer(file)
    }

    window.processChtFile = processChtFile;
    window.processLogFile = processLogFile;
    window.processJlgFile = processJlgFile;


})();
