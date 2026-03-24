const express = require('express');
const router = express.Router();

router.get('/users', (req, res) => { res.json([]); });
router.post('/users', (req, res) => { res.json({}); });
router.put('/users/:id', (req, res) => { res.json({}); });
router.delete('/users/:id', (req, res) => { res.sendStatus(204); });
router.get('/posts', (req, res) => { res.json([]); });
router.post('/posts', (req, res) => { res.json({}); });
router.put('/posts/:id', (req, res) => { res.json({}); });
router.delete('/posts/:id', (req, res) => { res.sendStatus(204); });
router.get('/comments', (req, res) => { res.json([]); });
router.post('/comments', (req, res) => { res.json({}); });
router.get('/tags', (req, res) => { res.json([]); });
router.get('/categories', (req, res) => { res.json([]); });
router.get('/search', (req, res) => { res.json([]); });
router.get('/health', (req, res) => { res.sendStatus(200); });
router.get('/metrics', (req, res) => { res.json({}); });

module.exports = router;
