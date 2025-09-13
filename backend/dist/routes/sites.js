"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const sitesController_1 = require("../controllers/sitesController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_1.authenticateToken);
// Get all sites
router.get('/', sitesController_1.getAllSites);
// Create site (Admin only)
router.post('/', (0, auth_1.requireRole)(['ADMIN']), [
    (0, express_validator_1.body)('name').notEmpty().trim(),
    (0, express_validator_1.body)('address').optional().trim()
], sitesController_1.createSite);
// Update site (Admin only)
router.put('/:id', (0, auth_1.requireRole)(['ADMIN']), [
    (0, express_validator_1.body)('name').optional().trim(),
    (0, express_validator_1.body)('address').optional().trim()
], sitesController_1.updateSite);
// Delete site (Admin only)
router.delete('/:id', (0, auth_1.requireRole)(['ADMIN']), sitesController_1.deleteSite);
exports.default = router;
//# sourceMappingURL=sites.js.map