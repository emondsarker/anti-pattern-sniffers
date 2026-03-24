const express = require('express');
const app = express();

app.get('/users/:id', async (req, res, next) => {
  const user = await db.findUser(req.params.id);
  res.json(user);
});

// Centralized error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});
