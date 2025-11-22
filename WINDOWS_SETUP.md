# Windows Setup Guide - Stock Material Management System

This guide will help you set up the project on a Windows machine.

## 🚀 Quick Setup (Automated)

### Option 1: Automated Installation with Chocolatey (Recommended)

**Prerequisites:** Run PowerShell as Administrator

1. **Run the setup script:**
   ```powershell
   # Navigate to project directory
   cd Stock-Material-Management-System
   
   # Run the setup script
   .\setup-windows.ps1
   ```

   This script will automatically:
   - Install Chocolatey (if not installed)
   - Install Node.js 20.15.0+
   - Install PostgreSQL
   - Install Git
   - Install Cursor (code editor)

2. **After script completes:**
   - Restart your terminal if prompted
   - Continue with [Project Setup](#project-setup) below

### Option 2: Manual Installation

If you prefer manual installation or the script doesn't work:

## Prerequisites (Manual Installation)

### 1. Install Chocolatey

Chocolatey is a package manager for Windows that makes installing software easier.

**Install Chocolatey:**
```powershell
# Run PowerShell as Administrator
Set-ExecutionPolicy Bypass -Scope Process -Force
[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
```

Verify installation:
```powershell
choco --version
```

### 2. Install Node.js
```powershell
choco install nodejs-lts -y
```

Verify installation:
```powershell
node --version
npm --version
```

### 3. Install PostgreSQL
```powershell
choco install postgresql -y --params '/Password:postgres' --params '/Port:5432'
```

**Important:** Remember the password you set (default: `postgres` in the command above)

Verify installation:
```powershell
psql --version
```

**Start PostgreSQL service:**
```powershell
Start-Service postgresql-x64-*
```

### 4. Install Git (if not already installed)
```powershell
choco install git -y
```

Verify installation:
```powershell
git --version
```

### 5. Install Cursor (Code Editor)
```powershell
# Option 1: Via Chocolatey (if available)
choco install cursor -y

# Option 2: Download from official website
# Visit: https://cursor.sh/
```

**Note:** Cursor is a modern code editor built for AI-assisted development. If not available via Chocolatey, download from [cursor.sh](https://cursor.sh/)

## Project Setup

> **💡 Tip:** If you used the automated setup script, you can skip to Step 2 (Set Up PostgreSQL Database) as all prerequisites are already installed.

### Step 1: Clone or Download the Project

**Option A: If project is on GitHub**
```powershell
git clone <your-repo-url>
cd Stock-Material-Management-System
```

**Option B: If you have the project files**
- Extract the project to a folder (e.g., `C:\Projects\Stock-Material-Management-System`)

### Step 2: Set Up PostgreSQL Database

1. **Open pgAdmin** (or use command line)

2. **Create Database:**
   ```sql
   CREATE DATABASE stock_management;
   ```

   Or using command line:
   ```powershell
   psql -U postgres
   CREATE DATABASE stock_management;
   \q
   ```

3. **Verify Database:**
   ```powershell
   psql -U postgres -d stock_management -c "SELECT version();"
   ```

### Step 3: Configure Backend

1. **Navigate to backend folder:**
   ```powershell
   cd backend
   ```

2. **Install dependencies:**
   ```powershell
   npm install
   ```

3. **Create `.env` file:**
   ```powershell
   # Copy the example file
   copy env.example .env
   ```

4. **Edit `.env` file** (use Notepad or VS Code):
   ```env
   DATABASE_URL="postgresql://postgres:YOUR_POSTGRES_PASSWORD@localhost:5432/stock_management?schema=public"
   JWT_SECRET="your-super-secret-jwt-key-here"
   JWT_EXPIRES_IN="7d"
   PORT=3001
   NODE_ENV="development"
   ```

   **Important:** Replace `YOUR_POSTGRES_PASSWORD` with the password you set during PostgreSQL installation.

5. **Run database migrations:**
   ```powershell
   npx prisma migrate deploy
   ```

6. **Generate Prisma Client:**
   ```powershell
   npx prisma generate
   ```

7. **Seed the database:**
   ```powershell
   npm run db:seed
   ```

   This creates default users:
   - Admin: `admin@example.com` / `admin123`
   - Storekeeper: `storekeeper@example.com` / `admin123`

### Step 4: Configure Frontend

1. **Navigate to frontend folder:**
   ```powershell
   cd ..\frontend
   ```

2. **Install dependencies:**
   ```powershell
   npm install
   ```

3. **Create `.env` file** (if needed):
   ```env
   VITE_API_BASE_URL=http://localhost:3001/api
   ```

   **Note:** The frontend should work without this if backend is on `localhost:3001`

### Step 5: Run the Application

#### Terminal 1 - Backend Server:
```powershell
cd backend
npm run dev
```

You should see:
```
🚀 Server running on port 3001
📊 Health check: http://localhost:3001/health
```

#### Terminal 2 - Frontend Server:
```powershell
cd frontend
npm run dev
```

You should see:
```
Local:   http://localhost:5173/
```

### Step 6: Access the Application

1. Open your browser
2. Navigate to: `http://localhost:5173`
3. Login with:
   - **Email:** `admin@example.com`
   - **Password:** `admin123`

## Troubleshooting

### Issue: PostgreSQL connection error

**Solution:**
1. Make sure PostgreSQL service is running:
   ```powershell
   # Check service status
   Get-Service postgresql*
   ```

2. If not running, start it:
   ```powershell
   Start-Service postgresql-x64-XX  # Replace XX with your version
   ```

3. Verify connection:
   ```powershell
   psql -U postgres -h localhost
   ```

### Issue: Port 3001 already in use

**Solution:**
1. Find process using port 3001:
   ```powershell
   netstat -ano | findstr :3001
   ```

2. Kill the process:
   ```powershell
   taskkill /PID <PID_NUMBER> /F
   ```

### Issue: Port 5173 already in use

**Solution:**
1. Find process using port 5173:
   ```powershell
   netstat -ano | findstr :5173
   ```

2. Kill the process or change port in `vite.config.ts`

### Issue: npm install fails

**Solution:**
1. Clear npm cache:
   ```powershell
   npm cache clean --force
   ```

2. Delete `node_modules` and `package-lock.json`:
   ```powershell
   Remove-Item -Recurse -Force node_modules
   Remove-Item package-lock.json
   ```

3. Reinstall:
   ```powershell
   npm install
   ```

### Issue: Prisma commands not working

**Solution:**
1. Make sure Prisma is installed:
   ```powershell
   npm install prisma @prisma/client --save
   ```

2. Generate Prisma Client:
   ```powershell
   npx prisma generate
   ```

### Issue: Backend exits immediately

**Solution:**
1. Check `.env` file exists and has correct values
2. Make sure `AWS_LAMBDA_FUNCTION_NAME` is NOT set (or is empty)
3. Check backend logs for errors

### Issue: Chocolatey installation fails

**Solution:**
1. Make sure you're running PowerShell as Administrator:
   ```powershell
   # Right-click PowerShell → Run as Administrator
   ```

2. Check execution policy:
   ```powershell
   Get-ExecutionPolicy
   # If Restricted, run:
   Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
   ```

3. Try manual installation from [chocolatey.org/install](https://chocolatey.org/install)

### Issue: PostgreSQL service won't start

**Solution:**
1. Check service status:
   ```powershell
   Get-Service postgresql*
   ```

2. Start service manually:
   ```powershell
   Start-Service postgresql-x64-XX  # Replace XX with your version
   ```

3. If service doesn't exist, check installation:
   ```powershell
   choco list postgresql
   ```

## Windows-Specific Notes

### PowerShell vs Command Prompt
- This guide uses PowerShell commands
- If using Command Prompt, replace:
  - `cd ..\frontend` → `cd ..\frontend`
  - `copy` → `copy` (same)
  - `Remove-Item` → `del` or `rmdir`

### Path Issues
- If you get "command not found" errors, make sure Node.js and PostgreSQL are in your PATH
- Restart terminal after installing Node.js/PostgreSQL

### Line Endings
- Git may change line endings (CRLF vs LF)
- If you see issues, run:
  ```powershell
  git config core.autocrlf true
  ```

## Development Workflow

### Daily Startup:
1. Start PostgreSQL (if not running as service)
2. Open Terminal 1 → `cd backend` → `npm run dev`
3. Open Terminal 2 → `cd frontend` → `npm run dev`
4. Open browser → `http://localhost:5173`

### Database Management:
```powershell
# Open Prisma Studio (database GUI)
cd backend
npx prisma studio

# Run migrations
npx prisma migrate dev

# Reset database (WARNING: deletes all data)
npx prisma migrate reset
```

## Next Steps

- ✅ Backend running on `http://localhost:3001`
- ✅ Frontend running on `http://localhost:5173`
- ✅ Database seeded with test data
- ✅ Ready to develop!

## Chocolatey Commands Reference

### Useful Chocolatey Commands:
```powershell
# List installed packages
choco list --local-only

# Upgrade all packages
choco upgrade all -y

# Search for packages
choco search <package-name>

# Uninstall a package
choco uninstall <package-name> -y

# Update Chocolatey
choco upgrade chocolatey -y
```

### Verify All Installations:
```powershell
# Check Node.js
node --version
npm --version

# Check PostgreSQL
psql --version

# Check Git
git --version

# Check Chocolatey
choco --version
```

## Additional Resources

- [Chocolatey Documentation](https://docs.chocolatey.org/)
- [Node.js Documentation](https://nodejs.org/docs/)
- [PostgreSQL Windows Guide](https://www.postgresql.org/docs/current/installation-windows.html)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Vite Documentation](https://vitejs.dev/)
- [Cursor Editor](https://cursor.sh/)
