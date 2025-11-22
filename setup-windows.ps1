# Chocolatey Setup Script for Stock Material Management System
# This script automates the installation of all prerequisites on Windows

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "⚠️  This script requires Administrator privileges." -ForegroundColor Yellow
    Write-Host "Please run PowerShell as Administrator and try again." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Cyan
    exit 1
}

Write-Host "🚀 Starting Stock Material Management System Setup..." -ForegroundColor Green
Write-Host ""

# Function to check if a command exists
function Test-Command {
    param($command)
    $null = Get-Command $command -ErrorAction SilentlyContinue
    return $?
}

# Step 1: Install Chocolatey (if not already installed)
Write-Host "📦 Step 1: Checking Chocolatey installation..." -ForegroundColor Cyan
if (Test-Command choco) {
    Write-Host "✅ Chocolatey is already installed" -ForegroundColor Green
    choco --version
} else {
    Write-Host "📥 Installing Chocolatey..." -ForegroundColor Yellow
    Set-ExecutionPolicy Bypass -Scope Process -Force
    [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
    iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
    
    if (Test-Command choco) {
        Write-Host "✅ Chocolatey installed successfully!" -ForegroundColor Green
        # Refresh environment variables
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
    } else {
        Write-Host "❌ Chocolatey installation failed. Please install manually from https://chocolatey.org/install" -ForegroundColor Red
        exit 1
    }
}
Write-Host ""

# Step 2: Install Node.js
Write-Host "📦 Step 2: Installing Node.js..." -ForegroundColor Cyan
if (Test-Command node) {
    $nodeVersion = node --version
    Write-Host "✅ Node.js is already installed: $nodeVersion" -ForegroundColor Green
    
    # Check if version is 20.15.0 or higher
    $version = [version]($nodeVersion -replace 'v', '')
    $requiredVersion = [version]"20.15.0"
    if ($version -lt $requiredVersion) {
        Write-Host "⚠️  Node.js version is below 20.15.0. Upgrading..." -ForegroundColor Yellow
        choco upgrade nodejs -y
    }
} else {
    Write-Host "📥 Installing Node.js 20.15.0 or higher..." -ForegroundColor Yellow
    choco install nodejs-lts -y
    
    # Refresh environment variables
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
    
    if (Test-Command node) {
        Write-Host "✅ Node.js installed successfully!" -ForegroundColor Green
        node --version
        npm --version
    } else {
        Write-Host "⚠️  Node.js installed but not in PATH. Please restart your terminal." -ForegroundColor Yellow
    }
}
Write-Host ""

# Step 3: Install PostgreSQL
Write-Host "📦 Step 3: Installing PostgreSQL..." -ForegroundColor Cyan
if (Test-Command psql) {
    Write-Host "✅ PostgreSQL is already installed" -ForegroundColor Green
    psql --version
} else {
    Write-Host "📥 Installing PostgreSQL..." -ForegroundColor Yellow
    Write-Host "⚠️  Note: You will be prompted to set a password for the 'postgres' user" -ForegroundColor Yellow
    Write-Host "⚠️  Remember this password - you'll need it for the DATABASE_URL in .env file" -ForegroundColor Yellow
    Write-Host ""
    
    choco install postgresql -y --params '/Password:postgres' --params '/Port:5432'
    
    # Refresh environment variables
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
    
    if (Test-Command psql) {
        Write-Host "✅ PostgreSQL installed successfully!" -ForegroundColor Green
        
        # Start PostgreSQL service
        Write-Host "🔄 Starting PostgreSQL service..." -ForegroundColor Cyan
        Start-Service postgresql-x64-* -ErrorAction SilentlyContinue
    } else {
        Write-Host "⚠️  PostgreSQL installed but not in PATH. Please restart your terminal." -ForegroundColor Yellow
    }
}
Write-Host ""

# Step 4: Install Git
Write-Host "📦 Step 4: Installing Git..." -ForegroundColor Cyan
if (Test-Command git) {
    Write-Host "✅ Git is already installed" -ForegroundColor Green
    git --version
} else {
    Write-Host "📥 Installing Git..." -ForegroundColor Yellow
    choco install git -y
    
    # Refresh environment variables
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
    
    if (Test-Command git) {
        Write-Host "✅ Git installed successfully!" -ForegroundColor Green
        git --version
    } else {
        Write-Host "⚠️  Git installed but not in PATH. Please restart your terminal." -ForegroundColor Yellow
    }
}
Write-Host ""

# Step 5: Install Cursor (Code Editor)
Write-Host "📦 Step 5: Installing Cursor..." -ForegroundColor Cyan
$cursorPath = "$env:LOCALAPPDATA\Programs\cursor\Cursor.exe"
if (Test-Path $cursorPath) {
    Write-Host "✅ Cursor is already installed" -ForegroundColor Green
} else {
    Write-Host "📥 Installing Cursor..." -ForegroundColor Yellow
    
    # Check if Cursor package exists in Chocolatey
    $cursorAvailable = choco search cursor --exact 2>&1 | Select-String -Pattern "cursor"
    
    if ($cursorAvailable) {
        choco install cursor -y
    } else {
        Write-Host "⚠️  Cursor not available in Chocolatey. Installing from official website..." -ForegroundColor Yellow
        $cursorUrl = "https://download.todesktop.com/230313mzl4w4u92/Cursor-0.42.7-x64.exe"
        $installerPath = "$env:TEMP\Cursor-Setup.exe"
        
        Write-Host "📥 Downloading Cursor installer..." -ForegroundColor Cyan
        Invoke-WebRequest -Uri $cursorUrl -OutFile $installerPath
        
        Write-Host "📦 Installing Cursor (this may take a moment)..." -ForegroundColor Cyan
        Start-Process -FilePath $installerPath -ArgumentList "/S" -Wait
        
        Remove-Item $installerPath -ErrorAction SilentlyContinue
    }
    
    if (Test-Path $cursorPath) {
        Write-Host "✅ Cursor installed successfully!" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Cursor installation completed. Please verify manually." -ForegroundColor Yellow
    }
}
Write-Host ""

# Step 6: Verify all installations
Write-Host "🔍 Step 6: Verifying installations..." -ForegroundColor Cyan
Write-Host ""

$allInstalled = $true

if (Test-Command node) {
    Write-Host "✅ Node.js: $(node --version)" -ForegroundColor Green
} else {
    Write-Host "❌ Node.js: Not found" -ForegroundColor Red
    $allInstalled = $false
}

if (Test-Command npm) {
    Write-Host "✅ npm: $(npm --version)" -ForegroundColor Green
} else {
    Write-Host "❌ npm: Not found" -ForegroundColor Red
    $allInstalled = $false
}

if (Test-Command psql) {
    Write-Host "✅ PostgreSQL: $(psql --version)" -ForegroundColor Green
} else {
    Write-Host "⚠️  PostgreSQL: Not in PATH (may need terminal restart)" -ForegroundColor Yellow
}

if (Test-Command git) {
    Write-Host "✅ Git: $(git --version)" -ForegroundColor Green
} else {
    Write-Host "⚠️  Git: Not in PATH (may need terminal restart)" -ForegroundColor Yellow
}

if (Test-Path $cursorPath) {
    Write-Host "✅ Cursor: Installed" -ForegroundColor Green
} else {
    Write-Host "⚠️  Cursor: Please verify installation" -ForegroundColor Yellow
}

Write-Host ""

# Final instructions
if ($allInstalled) {
    Write-Host "🎉 All prerequisites installed successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 Next Steps:" -ForegroundColor Cyan
    Write-Host "1. If you see any 'Not in PATH' warnings, please restart your terminal" -ForegroundColor White
    Write-Host "2. Follow the WINDOWS_SETUP.md guide for project setup" -ForegroundColor White
    Write-Host "3. Remember your PostgreSQL password (default: postgres if used above)" -ForegroundColor White
    Write-Host ""
    Write-Host "💡 Quick Start:" -ForegroundColor Cyan
    Write-Host "   cd backend" -ForegroundColor White
    Write-Host "   npm install" -ForegroundColor White
    Write-Host "   copy env.example .env" -ForegroundColor White
    Write-Host "   # Edit .env with your PostgreSQL password" -ForegroundColor White
    Write-Host "   npx prisma migrate deploy" -ForegroundColor White
    Write-Host "   npm run db:seed" -ForegroundColor White
    Write-Host "   npm run dev" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host "⚠️  Some installations may need a terminal restart to work properly." -ForegroundColor Yellow
    Write-Host "Please restart your terminal and run the verification again." -ForegroundColor Yellow
}

Write-Host "✨ Setup script completed!" -ForegroundColor Green
