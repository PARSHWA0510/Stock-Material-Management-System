"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const materialIssuesController_1 = require("../controllers/materialIssuesController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_1.authenticateToken);
// Get all material issues
router.get('/', materialIssuesController_1.getAllMaterialIssues);
// Get material issue by ID
router.get('/:id', materialIssuesController_1.getMaterialIssueById);
// Create material issue
router.post('/', [
    (0, express_validator_1.body)('siteId').notEmpty().isUUID(),
    (0, express_validator_1.body)('fromGodownId').optional().isUUID(),
    (0, express_validator_1.body)('issueDate').isISO8601().toDate(),
    (0, express_validator_1.body)('items').isArray({ min: 1 }),
    (0, express_validator_1.body)('items.*.materialId').notEmpty().isUUID(),
    (0, express_validator_1.body)('items.*.quantity').isNumeric().isFloat({ min: 0.01 }),
    (0, express_validator_1.body)('items.*.unit').notEmpty().trim(),
    (0, express_validator_1.body)('items.*.rate').isNumeric().isFloat({ min: 0 }),
    (0, express_validator_1.body)('items.*.gstPercent').isNumeric().isFloat({ min: 0, max: 100 }),
    (0, express_validator_1.body)('items.*.totalExclGst').isNumeric().isFloat({ min: 0 }),
    (0, express_validator_1.body)('items.*.totalInclGst').isNumeric().isFloat({ min: 0 })
], materialIssuesController_1.createMaterialIssue);
// Delete material issue (Admin only)
router.delete('/:id', materialIssuesController_1.deleteMaterialIssue);
exports.default = router;
