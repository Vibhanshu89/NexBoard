const express = require('express');
const router = express.Router();
const whiteboardController = require('../controllers/whiteboardController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/:roomId', whiteboardController.getWhiteboard);
router.post('/:roomId/save', whiteboardController.saveWhiteboard);
router.delete('/:roomId/clear', whiteboardController.clearWhiteboard);
router.post('/:roomId/chat', whiteboardController.addChatMessage);
router.get('/:roomId/chat', whiteboardController.getChatHistory);

module.exports = router;
