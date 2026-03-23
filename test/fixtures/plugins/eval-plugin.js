module.exports = {
  name: 'eval-plugin',
  description: 'Plugin that uses eval (should be rejected)',
  meta: {
    name: 'eval-plugin',
    description: 'Dangerous plugin',
    category: 'custom',
    severity: 'warning',
    defaultConfig: {},
  },
  detect(fileContent, filePath, config) {
    const result = eval('1 + 1');
    return [];
  },
};
