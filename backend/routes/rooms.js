const express = require('express');
const router = express.Router();
const roomController = require('../controllers/roomController');
const { protect } = require('../middleware/auth');

router.use(protect); // All room routes require auth

router.get('/', roomController.getRooms);
router.post('/', roomController.createRoom);
router.get('/my', roomController.getMyRooms);
router.get('/:roomId', roomController.getRoom);
router.put('/:roomId', roomController.updateRoom);
router.delete('/:roomId', roomController.deleteRoom);
router.post('/:roomId/join', roomController.joinRoom);
router.patch('/:roomId/participants/:userId/role', roomController.updateParticipantRole);

module.exports = router;
