"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const dotenv_1 = __importDefault(require("dotenv"));
const client_1 = require("@prisma/client");
// Import routes
const auth_1 = __importDefault(require("./routes/auth"));
const materials_1 = __importDefault(require("./routes/materials"));
const companies_1 = __importDefault(require("./routes/companies"));
const sites_1 = __importDefault(require("./routes/sites"));
const godowns_1 = __importDefault(require("./routes/godowns"));
const purchaseBills_1 = __importDefault(require("./routes/purchaseBills"));
const materialIssues_1 = __importDefault(require("./routes/materialIssues"));
const inventory_1 = __importDefault(require("./routes/inventory"));
const reports_1 = __importDefault(require("./routes/reports"));
// Load environment variables
dotenv_1.default.config();
const app = (0, express_1.default)();
const prisma = new client_1.PrismaClient();
const PORT = process.env.PORT || 3001;
// Middleware
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true
}));
app.use((0, morgan_1.default)('combined'));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});
// API routes
app.use('/api/auth', auth_1.default);
app.use('/api/materials', materials_1.default);
app.use('/api/companies', companies_1.default);
app.use('/api/sites', sites_1.default);
app.use('/api/godowns', godowns_1.default);
app.use('/api/purchase-bills', purchaseBills_1.default);
app.use('/api/material-issues', materialIssues_1.default);
app.use('/api/inventory', inventory_1.default);
app.use('/api/reports', reports_1.default);
// Default API route
app.use('/api', (req, res) => {
    res.json({ message: 'Stock Material Management API', version: '1.0.0' });
});
// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Something went wrong!' });
});
// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({ message: 'Route not found' });
});
// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('Shutting down gracefully...');
    await prisma.$disconnect();
    process.exit(0);
});
process.on('SIGTERM', async () => {
    console.log('Shutting down gracefully...');
    await prisma.$disconnect();
    process.exit(0);
});
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
});
exports.default = app;
