"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const companiesController_1 = require("../controllers/companiesController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_1.authenticateToken);
// Get all companies
router.get('/', companiesController_1.getAllCompanies);
// Create company (Admin only)
router.post('/', (0, auth_1.requireRole)(['ADMIN']), [
    (0, express_validator_1.body)('name').notEmpty().trim(),
    (0, express_validator_1.body)('gstin').optional().trim(),
    (0, express_validator_1.body)('address').optional().trim()
], companiesController_1.createCompany);
// Update company (Admin only)
router.put('/:id', (0, auth_1.requireRole)(['ADMIN']), [
    (0, express_validator_1.body)('name').optional().trim(),
    (0, express_validator_1.body)('gstin').optional().trim(),
    (0, express_validator_1.body)('address').optional().trim()
], companiesController_1.updateCompany);
// Delete company (Admin only)
router.delete('/:id', (0, auth_1.requireRole)(['ADMIN']), companiesController_1.deleteCompany);
exports.default = router;
//# sourceMappingURL=companies.js.map