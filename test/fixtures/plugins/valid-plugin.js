module.exports = {
  name: 'no-inline-styles',
  description: 'Detects inline style usage in JSX',
  meta: {
    name: 'no-inline-styles',
    description: 'Flags components using inline style objects in JSX',
    category: 'custom',
    severity: 'info',
    defaultConfig: { maxAllowed: 0 },
  },
  detect(fileContent, filePath, config) {
    const detections = [];
    const regex = /style=\{\{/g;
    let match;
    while ((match = regex.exec(fileContent)) !== null) {
      let line = 1;
      for (let i = 0; i < match.index; i++) {
        if (fileContent[i] === '\n') line++;
      }
      detections.push({
        snifferName: 'no-inline-styles',
        filePath,
        line,
        column: 1,
        message: 'Inline style object detected',
        severity: config.severity || 'info',
        suggestion: 'Extract styles to a CSS module or styled component.',
      });
    }
    return detections;
  },
};
