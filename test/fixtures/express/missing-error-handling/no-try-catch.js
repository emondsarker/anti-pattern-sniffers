const express = require('express');
const app = express();

app.get('/users/:id', async (req, res) => {
  const user = await db.findUser(req.params.id);
  const posts = await db.findPosts(user.id);
  res.json({ user, posts });
});

app.post('/users', async (req, res) => {
  const user = await db.createUser(req.body);
  await emailService.sendWelcome(user.email);
  res.status(201).json(user);
});
