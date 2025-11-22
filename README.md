# 📦 Stock Material Management System

A comprehensive stock/inventory management system built with React, Node.js, and PostgreSQL.

## 🚀 Features

- **Material Management**: Add, edit, and manage materials with HSN/SAC codes
- **Purchase Bills**: Record material inward with support for direct-to-site delivery
- **Material Issues**: Track material outward to sites
- **Inventory Tracking**: Real-time stock levels per godown
- **Reports**: Site-wise materials, godown availability, and material history
- **Role-based Access**: Admin and Storekeeper roles with different permissions

## 🛠 Tech Stack

- **Frontend**: React + TypeScript + Vite
- **Backend**: Node.js + Express + TypeScript
- **Database**: PostgreSQL + Prisma ORM
- **Authentication**: JWT-based

## 📋 Prerequisites

- Node.js (v20.15.0 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

> **📖 Windows Users:** See [WINDOWS_SETUP.md](./WINDOWS_SETUP.md) for detailed Windows installation instructions.
> 
> **🚀 Quick Setup:** Run `setup-windows.ps1` as Administrator for automated installation using Chocolatey!

## 🚀 Quick Start

### 1. Clone and Setup

```bash
git clone <repository-url>
cd Stock-Material-Management-System
```

### 2. Backend Setup

```bash
cd backend
npm install

# Copy environment file
cp env.example .env

# Edit .env file with your database credentials
# DATABASE_URL="postgresql://username:password@localhost:5432/stock_management?schema=public"

# Generate Prisma client
npm run db:generate

# Run database migrations
npm run db:migrate

# Seed the database with initial data
npm run db:seed

# Start development server
npm run dev
```

### 3. Frontend Setup

```bash
cd frontend
npm install

# Start development server
npm run dev
```

### 4. Access the Application

- Frontend: http://localhost:5173
- Backend API: http://localhost:3001
- Database Studio: `npm run db:studio` (from backend directory)

## 🔐 Default Login Credentials

- **Admin**: admin@example.com / admin123
- **Storekeeper**: storekeeper@example.com / admin123

## 📊 Database Schema

The system includes the following main entities:

- **Users**: Admin and Storekeeper roles
- **Companies**: Supplier information
- **Materials**: Master list of materials with HSN/SAC codes
- **Sites**: Project locations
- **Godowns**: Storage locations
- **Purchase Bills**: Material inward transactions
- **Material Issues**: Material outward transactions
- **Stock Transactions**: Automated ledger entries

## 🔄 Key Business Logic

### Direct-to-Site Delivery
When a purchase bill is marked as "delivered to site":
1. System creates an IN transaction (virtual ledger entry)
2. Immediately creates an OUT transaction to the site
3. Net effect: No change to godown stock, but site report shows consumption

### Stock Management
- All transactions are recorded in the stock_transactions table
- Real-time balance calculation
- Prevents negative stock issues

## 📁 Project Structure

```
Stock-Material-Management-System/
├── backend/
│   ├── src/
│   │   ├── controllers/     # API route handlers
│   │   ├── middleware/      # Auth, validation middleware
│   │   ├── routes/          # API routes
│   │   ├── scripts/         # Utility and test scripts
│   │   │   ├── README.md    # Scripts documentation
│   │   │   ├── index.ts     # Scripts runner
│   │   │   ├── test*.ts     # Test scripts
│   │   │   └── *.ts         # Data management scripts
│   │   ├── services/        # Business logic
│   │   ├── types/           # TypeScript type definitions
│   │   └── utils/           # Utility functions
│   ├── prisma/
│   │   └── schema.prisma    # Database schema
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/           # Page components
│   │   ├── services/        # API service calls
│   │   ├── types/           # TypeScript type definitions
│   │   └── utils/           # Utility functions
│   └── package.json
└── README.md
```

## 🛠 Utility Scripts

The backend includes a comprehensive set of utility scripts for testing and data management:

### Quick Access
```bash
# List all available scripts
npm run scripts

# Run a specific script
npm run scripts test-all-stock
```

### Available Scripts
- **`test-stock-data`**: Show all transactions and stock levels
- **`test-stock-calculation`**: Verify calculation consistency
- **`test-all-stock`**: Comprehensive stock analysis
- **`populate-stock`**: Create stock transactions from existing data
- **`add-test-data`**: Add additional test data

### Individual Script Commands
```bash
# Test scripts
npm run test:stock-data
npm run test:stock-calculation
npm run test:all-stock

# Data management
npm run db:populate-stock
npm run db:add-test-data
```

For detailed documentation, see `backend/src/scripts/README.md`.

## 🚧 Development Status

- [x] Project setup and configuration
- [x] Database schema design
- [x] Backend API implementation
- [x] Frontend-backend integration
- [x] Authentication system
- [x] Complete CRUD operations
- [x] Stock management system
- [x] Utility scripts and testing
- [ ] Advanced reporting features

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the ISC License.

## 📚 Additional Documentation

- [Windows Setup Guide](./WINDOWS_SETUP.md) - Complete setup instructions for Windows
- [GitHub Upload Guide](./GITHUB_UPLOAD.md) - How to upload project to GitHub securely
- [AWS Deployment Guide](./backend/aws-deploy/README.md) - Deploy to AWS Lambda + Aurora
- [Frontend AWS Integration](./frontend/AWS_DEPLOYMENT.md) - Connect frontend to AWS backend