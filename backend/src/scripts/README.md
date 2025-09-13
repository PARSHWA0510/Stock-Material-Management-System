# Scripts Documentation

This directory contains various utility scripts to help debug, test, and manage the stock management system.

## Directory Structure

```
src/scripts/
├── README.md                    # This documentation
├── testStockData.ts            # Basic stock data testing
├── testStockCalculation.ts     # Calculation consistency testing
├── testAllStock.ts            # Comprehensive stock analysis
├── populateStockTransactions.ts # Data population
└── addMoreTestData.ts         # Additional test data
```

## Available Test Scripts

### 1. Stock Data Testing
```bash
npm run test:stock-data
```
**File:** `src/testStockData.ts`

**Purpose:** Shows all stock transactions and calculates current stock levels.

**Output:**
- Lists all stock transactions in chronological order
- Shows current stock levels by material and godown
- Displays total values for each stock item

### 2. Stock Calculation Testing
```bash
npm run test:stock-calculation
```
**File:** `src/testStockCalculation.ts`

**Purpose:** Compares different stock calculation methods to ensure consistency.

**Output:**
- Tests inventory API calculation logic
- Tests material issues API calculation logic (old and new)
- Verifies all methods return the same result
- Shows detailed transaction breakdown for specific material/godown

### 3. Comprehensive Stock Analysis
```bash
npm run test:all-stock
```
**File:** `src/testAllStock.ts`

**Purpose:** Provides a complete overview of all stock across all materials and godowns.

**Output:**
- Lists all materials and godowns
- Shows stock levels for each material in each godown
- Provides summary by godown
- Shows last transaction details

## Data Management Scripts

### 4. Populate Stock Transactions
```bash
npm run db:populate-stock
```
**File:** `src/populateStockTransactions.ts`

**Purpose:** Creates stock transactions from existing purchase bills and material issues.

**What it does:**
- Clears existing stock transactions
- Processes all purchase bills to create IN transactions
- Handles direct-to-site deliveries (IN + OUT transactions)
- Processes material issues to create OUT transactions
- Shows final stock balances

### 5. Add Test Data
```bash
npm run db:add-test-data
```
**File:** `src/addMoreTestData.ts`

**Purpose:** Adds additional test data for more comprehensive testing.

**What it does:**
- Creates additional purchase bills with different scenarios
- Creates additional material issues
- Generates corresponding stock transactions
- Provides more realistic test data

## Usage Examples

### Debug Stock Issues
When you encounter stock validation issues:

1. **Check current stock levels:**
   ```bash
   npm run test:all-stock
   ```

2. **Verify calculation consistency:**
   ```bash
   npm run test:stock-calculation
   ```

3. **See detailed transaction history:**
   ```bash
   npm run test:stock-data
   ```

### Reset and Repopulate Data
If you need to reset stock data:

1. **Clear and repopulate:**
   ```bash
   npm run db:populate-stock
   ```

2. **Add more test data:**
   ```bash
   npm run db:add-test-data
   ```

3. **Verify the results:**
   ```bash
   npm run test:all-stock
   ```

## Troubleshooting

### Common Issues

1. **"Insufficient stock" error when stock should be available:**
   - Run `npm run test:stock-calculation` to verify calculation consistency
   - Check if the godown ID matches between inventory and material issues

2. **Stock levels not updating after transactions:**
   - Run `npm run test:stock-data` to see all transactions
   - Check if transactions are being created correctly

3. **Inconsistent stock levels:**
   - Run `npm run test:all-stock` to see complete overview
   - Compare with inventory API results

### Debug Tips

- All scripts include detailed console output
- Transaction details show dates, quantities, and references
- Stock calculations are broken down step by step
- Error messages include context about what went wrong

## File Structure

```
backend/src/scripts/
├── README.md                    # This documentation
├── testStockData.ts            # Basic stock data testing
├── testStockCalculation.ts     # Calculation consistency testing
├── testAllStock.ts            # Comprehensive stock analysis
├── populateStockTransactions.ts # Data population
└── addMoreTestData.ts         # Additional test data
```

## Notes

- All scripts use the same Prisma client and database connection
- Scripts are safe to run multiple times (except populate scripts which clear data)
- All calculations match the production API logic
- Scripts include proper error handling and cleanup
