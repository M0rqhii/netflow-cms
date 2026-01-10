# Database Backup Script (PowerShell)
# Creates a backup of PostgreSQL database

param(
    [string]$BackupDir = "./backups",
    [int]$RetentionDays = 30
)

$ErrorActionPreference = "Stop"

# Load environment variables
if (Test-Path .env) {
    Get-Content .env | ForEach-Object {
        if ($_ -match '^([^=]+)=(.*)$') {
            [Environment]::SetEnvironmentVariable($matches[1], $matches[2], "Process")
        }
    }
}

# Database connection
$DbHost = $env:DB_HOST ?? "localhost"
$DbPort = $env:DB_PORT ?? "5432"
$DbName = $env:DB_NAME ?? "netflow_cms"
$DbUser = $env:DB_USER ?? "netflow"
$DbPassword = $env:DB_PASSWORD

# Extract from DATABASE_URL if provided
if ($env:DATABASE_URL) {
    $dbUrl = $env:DATABASE_URL
    if ($dbUrl -match 'postgresql://([^:]+):([^@]+)@([^:]+):(\d+)/([^?]+)') {
        $DbUser = $matches[1]
        $DbPassword = $matches[2]
        $DbHost = $matches[3]
        $DbPort = $matches[4]
        $DbName = $matches[5]
    }
}

# Create backup directory
if (-not (Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir | Out-Null
}

$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$BackupFile = Join-Path $BackupDir "netflow_cms_$Timestamp.sql.gz"

Write-Host "Starting database backup..."
Write-Host "Database: $DbName"
Write-Host "Host: $DbHost:$DbPort"
Write-Host "Backup file: $BackupFile"

# Check if pg_dump is available
$pgDump = Get-Command pg_dump -ErrorAction SilentlyContinue
if (-not $pgDump) {
    Write-Error "pg_dump not found. Please install PostgreSQL client tools."
    exit 1
}

# Create backup
$env:PGPASSWORD = $DbPassword
$tempFile = "$BackupFile.tmp"

try {
    pg_dump -h $DbHost -p $DbPort -U $DbUser -d $DbName --no-owner --no-acl --clean --if-exists | Out-File -FilePath $tempFile -Encoding utf8
    
    # Compress using gzip (if available) or 7zip
    $gzip = Get-Command gzip -ErrorAction SilentlyContinue
    if ($gzip) {
        & gzip -c $tempFile > $BackupFile
        Remove-Item $tempFile
    } else {
        # Use 7zip if available
        $7zip = Get-Command 7z -ErrorAction SilentlyContinue
        if ($7zip) {
            & 7z a -tgzip $BackupFile $tempFile | Out-Null
            Remove-Item $tempFile
        } else {
            # No compression available, just rename
            Move-Item $tempFile $BackupFile
        }
    }
    
    $BackupSize = (Get-Item $BackupFile).Length / 1MB
    Write-Host "✅ Backup successful: $BackupFile ($([math]::Round($BackupSize, 2)) MB)"
    
    # Cleanup old backups
    Write-Host "Cleaning up backups older than $RetentionDays days..."
    $cutoffDate = (Get-Date).AddDays(-$RetentionDays)
    Get-ChildItem -Path $BackupDir -Filter "netflow_cms_*.sql.gz" | 
        Where-Object { $_.LastWriteTime -lt $cutoffDate } | 
        Remove-Item
    
    Write-Host "✅ Cleanup complete"
    exit 0
} catch {
    Write-Error "❌ Backup failed: $_"
    if (Test-Path $tempFile) {
        Remove-Item $tempFile
    }
    if (Test-Path $BackupFile) {
        Remove-Item $BackupFile
    }
    exit 1
} finally {
    Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue
}
