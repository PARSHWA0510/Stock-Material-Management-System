"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const purchaseBillsController_1 = require("../controllers/purchaseBillsController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_1.authenticateToken);
// Get all purchase bills
router.get('/', purchaseBillsController_1.getAllPurchaseBills);
// Get purchase bill by ID
router.get('/:id', purchaseBillsController_1.getPurchaseBillById);
// Create purchase bill
router.post('/', [
    (0, express_validator_1.body)('companyId').notEmpty().isUUID(),
    (0, express_validator_1.body)('invoiceNumber').notEmpty().trim(),
    (0, express_validator_1.body)('gstinNumber').optional().trim(),
    (0, express_validator_1.body)('billDate').isISO8601().toDate(),
    (0, express_validator_1.body)('deliveredToType').isIn(['GODOWN', 'SITE']),
    (0, express_validator_1.body)('deliveredToId').notEmpty().isUUID(),
    (0, express_validator_1.body)('items').isArray({ min: 1 }),
    (0, express_validator_1.body)('items.*.materialId').notEmpty().isUUID(),
    (0, express_validator_1.body)('items.*.quantity').isNumeric().isFloat({ min: 0.01 }),
    (0, express_validator_1.body)('items.*.unit').notEmpty().trim(),
    (0, express_validator_1.body)('items.*.rate').isNumeric().isFloat({ min: 0 }),
    (0, express_validator_1.body)('items.*.gstPercent').isNumeric().isFloat({ min: 0, max: 100 }),
    (0, express_validator_1.body)('items.*.totalExclGst').isNumeric().isFloat({ min: 0 }),
    (0, express_validator_1.body)('items.*.totalInclGst').isNumeric().isFloat({ min: 0 }),
    (0, express_validator_1.body)('items.*.locationInGodown').optional().trim()
], purchaseBillsController_1.createPurchaseBill);
// Delete purchase bill (Admin only)
router.delete('/:id', purchaseBillsController_1.deletePurchaseBill);
exports.default = router;
