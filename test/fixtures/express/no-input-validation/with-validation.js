const express = require('express');
const { body, validationResult } = require('express-validator');
const app = express();

app.post('/users',
  body('email').isEmail(),
  body('name').isString().trim().notEmpty(),
  body('age').isInt({ min: 0 }),
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const user = db.createUser(req.body);
    res.json(user);
  }
);
