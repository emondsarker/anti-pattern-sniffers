const fs = require('fs');

function processFile(filePath, callback) {
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) return callback(err);
    parseData(data, (err, parsed) => {
      if (err) return callback(err);
      validateData(parsed, (err, valid) => {
        if (err) return callback(err);
        saveData(valid, (err, result) => {
          if (err) return callback(err);
          callback(null, result);
        });
      });
    });
  });
}
