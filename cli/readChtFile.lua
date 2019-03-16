
function explode(div,str) -- credit: http://richard.warburton.it
  if (div=='') then return false end
  local pos,arr = 0,{}
  -- for each divider found
  for st,sp in function() return string.find(str,div,pos,true) end do
  table.insert(arr,string.sub(str,pos,st-1)) -- Attach chars left of current divider
  pos = sp + 1 -- Jump past current divider
end
table.insert(arr,string.sub(str,pos)) -- Attach chars right of last divider
return arr
end

function table.slice(tbl, first, last, step)
  local sliced = {}

  for i = first or 1, last or #tbl, step or 1 do
    sliced[#sliced+1] = tbl[i]
  end

  return sliced
end

function getReadings(filename)

  local chtFile = assert(io.open(filename, "r"))
  local chtData = chtFile:read("*all")
  chtFile:close()
  local chtArray = explode(",", chtData)

-- sometimes the comments in the chart files contain commas,
-- so they appear to span multiple slots in the file.  
-- the trick is to scan the file backwards until a field
-- contains a forward slash.  That field is the date, and is
-- directly after the comments.
  local dateIndex = nil
  local dataEnd = -10
  for i = #chtArray, 1, -1 do

    -- while we are looping, find the end of the 
    -- chart data.
    -- print (i, ": ", chtArray[i])
    local chtVal = tonumber(chtArray[i])
    if (dataEnd <- 0) and chtVal and chtVal > 0 then
      dataEnd = dataEnd + 1
      if dataEnd == 0 then
        dataEnd = i
        -- print ("dataEnd " .. i)
      end
    end

    if chtArray[i]:find("/") then
      dateIndex = i
      break
    end
  end

  local readings = {}

-- trim the chart array to valid data only
  chtArray = table.slice(chtArray,1,dataEnd+1)
  --print ("Length " .. #chtArray)

  local commentsArray = table.slice(chtArray,1,dateIndex-1)
  local comments = table.concat(commentsArray, ",") 
  -- print ("Comments: " .. comments)
  readings["comments"] = comments

  local dateStr = chtArray[dateIndex]:gsub('"', "")
  local dateArray = explode(" ", dateStr)
  local dateFields = explode("/", dateArray[1])
  local timeFields = explode(":", dateArray[2])
  local hour
  if dateArray[3]:find("PM") then
    hour = tonumber(timeFields[1]) + 12
  else
    hour = tonumber(timeFields[1])
  end

  local year = tonumber(dateFields[3])
  local month = tonumber(dateFields[2])
  local dom = tonumber(dateFields[1])
  local minute = tonumber(timeFields[2])
  local second = tonumber(timeFields[3])

  local startTime = os.time({year=year,month=month,day=dom,hour=hour,min=minute,sec=second})

  --print (os.date("%Y-%m-%dT%H:%M:%S", startTime))

-- function for local use only.
  local readIndex = dateIndex + 1
  local function readValue()
    if readIndex < dataEnd - 1 then
        readIndex = readIndex + 1
        return tonumber(chtArray[readIndex - 1])
    end
  end

  local chartMode = readValue() -- mode 4 is a 3 phase chart.

  local lowCalDigits = {}
  local highCalDigits = {}
  local readingCodes = {}

  if chartMode == 1 then
    table.insert(readingCodes,"V")
    numTraces = 1
    table.insert(lowCalDigits,readValue())
    table.insert(highCalDigits,readValue())
    lowCalValue = 180
    highCalValue = 280
  elseif chartMode == 2 then
    table.insert(readingCodes,"VAF")
    numTraces = 1
    table.insert(lowCalDigits,readValue())
    table.insert(highCalDigits,readValue())
    lowCalValue = 0
    highCalValue = 12
  elseif chartMode == 3 or chartMode == 5 then
    table.insert(readingCodes,"V")
    numTraces = 1
    table.insert(lowCalDigits,readValue())
    table.insert(highCalDigits,readValue())
    lowCalValue = 0
    highCalValue = 12
  elseif chartMode == 4 then
    table.insert(readingCodes,"IA")
    table.insert(readingCodes,"IB")
    table.insert(readingCodes,"IC")
    numTraces = 1
    for i=1,3 do
      table.insert(lowCalDigits,readValue())
      table.insert(highCalDigits,readValue())
    end
    lowCalValue = 0
    highCalValue = 2000
  end

  local multipliers = {}
  for i=1,#lowCalDigits do
    multipliers[i] = (highCalValue - lowCalValue)/(highCalDigits[1] - lowCalDigits[i])
  end


  local pos = 1
  local maxmin = 1
  readValue() -- discard the first reading
  readValue() -- discard the first reading
  local val = readValue()
  while val do
    realval = (val-lowCalDigits[pos]) * multipliers[pos] + lowCalValue
    table.insert(readings, {os.date("%Y-%m-%dT%H:%M:%SZ", startTime), tonumber(string.format("%0.1f",realval)), readingCodes[pos]})

    if chartMode == 4 then
        pos = pos + 1
        if pos > #multipliers then
          pos = 1
          startTime = startTime + 60
        end
    else
        maxmin = maxmin + 1
        if maxmin > 2 then
          maxmin = 1
          startTime = startTime + 60
        end
    end
    val = readValue()
  end

  return readings
end

-- main script starts here
local data = getReadings(arg[1])
io.write('{ "comments":' .. data["comments"] .. ', "readings":[\n') 
local isfirst = true;
for _, v in ipairs(data) do
    if isfirst then
        isfirst = false
    else
        io.write(",\n")
    end
    io.write('["' .. v[1] .. '",' .. v[2] .. ',"' .. v[3] .. '"]')
end
io.write("\n")
print(']}')








