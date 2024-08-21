const fs = require('fs');

// Function to read a JSON file and return its content as an object
const readJsonFile = (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      const jsonData = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(jsonData);
    } else {
      console.warn('File does not exist. Returning an empty object.');
      return {}; // Return an empty object if the file does not exist
    }
  } catch (error) {
    console.error('Error reading the JSON file:', error);
    return {}; // Return an empty object in case of an error
  }
};

// Function to write an object to a JSON file
const writeJsonFile = (filePath, data) => {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    console.log('File written successfully!');
  } catch (error) {
    console.error('Error writing to the JSON file:', error);
  }
};

module.exports = { readJsonFile, writeJsonFile }