"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const reportsController_1 = require("../controllers/reportsController");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// Get site-wise material reports
router.get('/site-materials', auth_1.authenticateToken, reportsController_1.getSiteMaterialReports);
// Get detailed material history for a specific site and material
router.get('/site-materials/:site_id/:material_id/history', auth_1.authenticateToken, reportsController_1.getSiteMaterialHistory);
exports.default = router;
//# sourceMappingURL=reports.js.map