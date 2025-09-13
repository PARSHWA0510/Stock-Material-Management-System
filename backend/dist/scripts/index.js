#!/usr/bin/env ts-node
"use strict";
/**
 * Stock Management System - Scripts Index
 *
 * This file provides a centralized way to run all utility scripts.
 * Run with: npm run scripts <script-name>
 *
 * Available scripts:
 * - test-stock-data: Basic stock data testing
 * - test-stock-calculation: Calculation consistency testing
 * - test-all-stock: Comprehensive stock analysis
 * - populate-stock: Create stock transactions from existing data
 * - add-test-data: Add additional test data
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = require("child_process");
const path_1 = __importDefault(require("path"));
const scripts = {
    'test-stock-data': 'testStockData.ts',
    'test-stock-calculation': 'testStockCalculation.ts',
    'test-all-stock': 'testAllStock.ts',
    'test-reports': 'testReports.ts',
    'populate-stock': 'populateStockTransactions.ts',
    'add-test-data': 'addMoreTestData.ts'
};
const scriptName = process.argv[2];
if (!scriptName) {
    console.log('📋 Available Scripts:');
    console.log('===================\n');
    Object.keys(scripts).forEach(key => {
        console.log(`  ${key.padEnd(20)} - ${getDescription(key)}`);
    });
    console.log('\nUsage: npm run scripts <script-name>');
    console.log('Example: npm run scripts test-all-stock');
    process.exit(0);
}
if (!scripts[scriptName]) {
    console.error(`❌ Unknown script: ${scriptName}`);
    console.log('\nAvailable scripts:');
    Object.keys(scripts).forEach(key => console.log(`  - ${key}`));
    process.exit(1);
}
const scriptFile = scripts[scriptName];
const scriptPath = path_1.default.join(__dirname, scriptFile);
console.log(`🚀 Running script: ${scriptName}`);
console.log(`📁 File: ${scriptFile}\n`);
try {
    (0, child_process_1.execSync)(`ts-node "${scriptPath}"`, {
        stdio: 'inherit',
        cwd: process.cwd()
    });
}
catch (error) {
    console.error(`❌ Error running script: ${error}`);
    process.exit(1);
}
function getDescription(scriptName) {
    const descriptions = {
        'test-stock-data': 'Show all transactions and stock levels',
        'test-stock-calculation': 'Verify calculation consistency',
        'test-all-stock': 'Comprehensive stock analysis',
        'test-reports': 'Test site-wise material reports logic',
        'populate-stock': 'Create stock transactions from existing data',
        'add-test-data': 'Add additional test data'
    };
    return descriptions[scriptName] || 'No description available';
}
//# sourceMappingURL=index.js.map