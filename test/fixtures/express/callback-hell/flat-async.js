async function processFile(filePath) {
  const data = await fs.promises.readFile(filePath, 'utf8');
  const parsed = await parseData(data);
  const valid = await validateData(parsed);
  return await saveData(valid);
}
