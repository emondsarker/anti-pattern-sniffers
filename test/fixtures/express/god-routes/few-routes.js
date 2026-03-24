const express = require('express');
const router = express.Router();

router.get('/health', (req, res) => { res.sendStatus(200); });
router.get('/version', (req, res) => { res.json({ version: '1.0.0' }); });
router.get('/status', (req, res) => { res.json({ status: 'ok' }); });

module.exports = router;
