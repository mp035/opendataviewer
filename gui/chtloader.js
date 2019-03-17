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

                    var data = {readings:readings, comments:comments, columns:columns, series:series, filename:file.name, filepath:file.path};
                }
                
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

    window.processChtFile = processChtFile;
    window.processJlgFile = processJlgFile;

})();
