module.exports = {
  name: 'crashing-plugin',
  description: 'Plugin that throws an error',
  meta: {
    name: 'crashing-plugin',
    description: 'Crashes',
    category: 'custom',
    severity: 'error',
    defaultConfig: {},
  },
  detect(fileContent, filePath, config) {
    throw new Error('Plugin crashed intentionally');
  },
};
