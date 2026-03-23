module.exports = {
  name: 'timeout-plugin',
  description: 'Plugin that never finishes',
  meta: {
    name: 'timeout-plugin',
    description: 'Times out',
    category: 'custom',
    severity: 'warning',
    defaultConfig: {},
  },
  detect(fileContent, filePath, config) {
    while (true) {
      // infinite loop
    }
    return [];
  },
};
