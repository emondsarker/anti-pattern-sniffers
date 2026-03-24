const express = require('express');
const app = express();

app.post('/users', (req, res) => {
  const user = {
    email: req.body.email,
    name: req.body.name,
    age: req.body.age,
  };
  db.createUser(user);
  res.json(user);
});

app.get('/search', (req, res) => {
  const results = db.search(req.query.q);
  res.json(results);
});
