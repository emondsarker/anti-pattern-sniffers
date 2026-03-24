const express = require('express');
const router = express.Router();

router.get('/users', (req, res) => res.json([]));
router.post('/users', (req, res) => res.json({}));
router.get('/users/:id', (req, res) => res.json({}));
router.put('/users/:id', (req, res) => res.json({}));
router.delete('/users/:id', (req, res) => res.json({}));
router.get('/posts', (req, res) => res.json([]));
router.post('/posts', (req, res) => res.json({}));
router.get('/posts/:id', (req, res) => res.json({}));
router.put('/posts/:id', (req, res) => res.json({}));
router.delete('/posts/:id', (req, res) => res.json({}));
router.get('/comments', (req, res) => res.json([]));
router.post('/comments', (req, res) => res.json({}));

module.exports = router;
