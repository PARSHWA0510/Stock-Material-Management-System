"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const inventoryController_1 = require("../controllers/inventoryController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_1.authenticateToken);
// Get inventory levels
router.get('/', inventoryController_1.getInventory);
// Get stock transactions
router.get('/transactions', inventoryController_1.getStockTransactions);
exports.default = router;
//# sourceMappingURL=inventory.js.map