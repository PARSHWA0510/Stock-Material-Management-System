"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const materialsController_1 = require("../controllers/materialsController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_1.authenticateToken);
// Get all materials
router.get('/', materialsController_1.getAllMaterials);
// Get material by ID
router.get('/:id', materialsController_1.getMaterialById);
// Create material (Admin only)
router.post('/', (0, auth_1.requireRole)(['ADMIN']), [
    (0, express_validator_1.body)('name').notEmpty().trim(),
    (0, express_validator_1.body)('unit').notEmpty().trim(),
    (0, express_validator_1.body)('hsnSac').optional().trim()
], materialsController_1.createMaterial);
// Update material (Admin only)
router.put('/:id', (0, auth_1.requireRole)(['ADMIN']), [
    (0, express_validator_1.body)('name').optional().notEmpty().trim(),
    (0, express_validator_1.body)('unit').optional().notEmpty().trim(),
    (0, express_validator_1.body)('hsnSac').optional().trim()
], materialsController_1.updateMaterial);
// Delete material (Admin only)
router.delete('/:id', (0, auth_1.requireRole)(['ADMIN']), materialsController_1.deleteMaterial);
exports.default = router;
//# sourceMappingURL=materials.js.map