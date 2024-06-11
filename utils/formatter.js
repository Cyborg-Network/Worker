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

const formatCpuOutput = (output) => {
    const cpuUsage = {};
    const matches = output.match(/(\d+\.\d+)%id/);
    if (matches) {
        const idle = parseFloat(matches[1]);
        cpuUsage.usage = (100 - idle).toFixed(2) + '%';
    }
    return cpuUsage;
}
  
const formatMemOutput = (output) => {
    const memoryUsage = {};
    const lines = output.split('\n');
    const memLine = lines[1].split(/\s+/);
    const totalMem = parseFloat(memLine[1]);
    const usedMem = parseFloat(memLine[2]);

    memoryUsage.total = totalMem + ' MB';
    memoryUsage.used = usedMem + ' MB';
    memoryUsage.usage = ((usedMem / totalMem) * 100).toFixed(2) + '%';

    return memoryUsage;
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

module.exports = {formatOutput, formatCpuOutput, formatMemOutput, formatDiskOutput}
  