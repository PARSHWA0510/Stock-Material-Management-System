"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const godownsController_1 = require("../controllers/godownsController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_1.authenticateToken);
// Get all godowns
router.get('/', godownsController_1.getAllGodowns);
// Create godown (Admin only)
router.post('/', (0, auth_1.requireRole)(['ADMIN']), [
    (0, express_validator_1.body)('name').notEmpty().trim(),
    (0, express_validator_1.body)('address').optional().trim()
], godownsController_1.createGodown);
// Update godown (Admin only)
router.put('/:id', (0, auth_1.requireRole)(['ADMIN']), [
    (0, express_validator_1.body)('name').optional().trim(),
    (0, express_validator_1.body)('address').optional().trim()
], godownsController_1.updateGodown);
// Delete godown (Admin only)
router.delete('/:id', (0, auth_1.requireRole)(['ADMIN']), godownsController_1.deleteGodown);
exports.default = router;
//# sourceMappingURL=godowns.js.map