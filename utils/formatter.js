const formatOutput = (output) => {
    const formatted = {};
    output.split('\n').forEach(line => {
      // Split the line into key and value
      const [key, value] = line.split(':').map(part => part.trim());
  
      if (key && value) {
          // Convert keys to camelCase for the JavaScript object
          const camelCaseKey = key.replace(/(\s+|-)(.)/g, (match, p1, p2) => p2.toUpperCase()).replace(/\s+|-/g, '');
          formatted[camelCaseKey] = value;
      }
    });
    return formatted
}
  
const formatMemOutput = (output) => {
    const memoryInfo = {};
    const lines = output.split('\n');
  
    // Get the headers from the first line
    const headers = lines[0].split(/\s+/).slice(1); // Remove the first 'header' entry which is usually empty
    headers[0] = "total"; // The first header is usually "total", correcting it as per 'free' command
  
    // Parse the memory values from the second line
    const memoryValues = lines[1].split(/\s+/);
    const memoryType = memoryValues[0];
    const memoryData = memoryValues.slice(1);
  
    // Create a memory object with the headers as keys and the corresponding values
    memoryInfo[memoryType.toLowerCase()] = {};
    headers.forEach((header, index) => {
        memoryInfo[memoryType.toLowerCase()][header.toLowerCase()] = memoryData[index];
    });
  
    // Parse the swap values from the third line, if it exists
    if (lines[2]) {
        const swapValues = lines[2].split(/\s+/);
        const swapType = swapValues[0];
        const swapData = swapValues.slice(1);
  
        memoryInfo[swapType.toLowerCase()] = {};
        headers.forEach((header, index) => {
            memoryInfo[swapType.toLowerCase()][header.toLowerCase()] = swapData[index];
        });
    }
    return memoryInfo
}
  
const formatDiskOutput = (output) => {
    const lines = output.split('\n');
    const headers = lines[0].split(/\s+/).map(header => header.toLowerCase());
    const diskInfo = [];
  
    // Parse each line of the output (starting from the second line)
    lines.slice(1).forEach(line => {
        const values = line.split(/\s+/);
        const entry = {};
        headers.forEach((header, index) => {
            entry[header] = values[index];
        });
        diskInfo.push(entry);
    });
    return diskInfo
}

module.exports = {formatOutput, formatMemOutput, formatDiskOutput}
  