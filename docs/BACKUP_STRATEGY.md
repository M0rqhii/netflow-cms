# Backup Strategy - Netflow CMS

Dokumentacja strategii backup i disaster recovery dla Netflow CMS.

## Spis Treści

1. [Overview](#overview)
2. [Backup Types](#backup-types)
3. [Backup Schedule](#backup-schedule)
4. [Backup Scripts](#backup-scripts)
5. [Restore Procedures](#restore-procedures)
6. [Disaster Recovery](#disaster-recovery)
7. [Monitoring](#monitoring)

---

## Overview

### RTO (Recovery Time Objective)
- **Target**: < 4 hours
- **Maximum**: 8 hours

### RPO (Recovery Point Objective)
- **Target**: < 1 hour
- **Maximum**: 4 hours

### Backup Retention
- **Daily backups**: 30 days
- **Weekly backups**: 12 weeks (3 months)
- **Monthly backups**: 12 months (1 year)

---

## Backup Types

### 1. Database Backups

**Frequency**: Daily
**Method**: PostgreSQL `pg_dump`
**Storage**: Compressed SQL files (.sql.gz)
**Location**: Local + Cloud storage (S3, Azure Blob, etc.)

**Script**: `scripts/backup/backup-db.sh` (Linux/Mac) or `scripts/backup/backup-db.ps1` (Windows)

### 2. Media Files Backups

**Frequency**: Daily
**Method**: File system copy or cloud storage sync
**Storage**: Cloud storage (S3, Azure Blob, etc.)
**Location**: Separate from database backups

### 3. Configuration Backups

**Frequency**: On change
**Method**: Version control (Git)
**Storage**: Git repository
**Location**: GitHub/GitLab

---

## Backup Schedule

### Automated Backups

#### Daily Backups
- **Time**: 02:00 UTC (low traffic period)
- **Type**: Full database backup
- **Retention**: 30 days
- **Automation**: Cron job (Linux) or Task Scheduler (Windows)

#### Weekly Backups
- **Time**: Sunday 02:00 UTC
- **Type**: Full database backup + media files
- **Retention**: 12 weeks
- **Automation**: Cron job

#### Monthly Backups
- **Time**: First day of month, 02:00 UTC
- **Type**: Full database backup + media files + configuration
- **Retention**: 12 months
- **Automation**: Cron job

### Manual Backups

Before major operations:
- Database migrations
- System updates
- Configuration changes

---

## Backup Scripts

### Linux/Mac

```bash
# Daily backup
./scripts/backup/backup-db.sh

# With custom retention
BACKUP_DIR=/backups RETENTION_DAYS=60 ./scripts/backup/backup-db.sh
```

### Windows

```powershell
# Daily backup
.\scripts\backup\backup-db.ps1

# With custom retention
.\scripts\backup\backup-db.ps1 -BackupDir "C:\Backups" -RetentionDays 60
```

### Cron Job Setup (Linux)

```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * /path/to/netflow-cms/scripts/backup/backup-db.sh >> /var/log/netflow-backup.log 2>&1
```

### Task Scheduler Setup (Windows)

1. Open Task Scheduler
2. Create Basic Task
3. Set trigger: Daily at 2:00 AM
4. Action: Start a program
5. Program: `powershell.exe`
6. Arguments: `-File "C:\path\to\netflow-cms\scripts\backup\backup-db.ps1"`

---

## Restore Procedures

### Database Restore

#### Linux/Mac

```bash
# Restore from backup
./scripts/backup/restore-db.sh backups/netflow_cms_20250120_120000.sql.gz
```

#### Windows

```powershell
# Restore from backup (manual)
$env:PGPASSWORD = "your-password"
gunzip -c backups\netflow_cms_20250120_120000.sql.gz | psql -h localhost -U netflow -d netflow_cms
```

### Point-in-Time Recovery

PostgreSQL Point-in-Time Recovery (PITR) requires:
1. Continuous WAL archiving
2. Base backup
3. WAL files

**Configuration** (`postgresql.conf`):
```ini
wal_level = replica
archive_mode = on
archive_command = 'cp %p /backups/wal/%f'
```

---

## Disaster Recovery

### Recovery Scenarios

#### 1. Database Corruption

**Steps**:
1. Stop application
2. Restore from latest backup
3. Verify data integrity
4. Restart application

**Estimated Time**: 1-2 hours

#### 2. Complete Server Failure

**Steps**:
1. Provision new server
2. Install PostgreSQL, Redis, Node.js
3. Restore database backup
4. Restore media files
5. Restore configuration
6. Start application

**Estimated Time**: 2-4 hours

#### 3. Data Loss (Accidental Deletion)

**Steps**:
1. Identify time of deletion
2. Restore from backup before deletion
3. Export missing data
4. Merge with current database (if needed)

**Estimated Time**: 2-6 hours

### Disaster Recovery Plan

1. **Documentation**: Keep recovery procedures documented
2. **Testing**: Test restore procedures quarterly
3. **Monitoring**: Monitor backup success/failure
4. **Alerts**: Set up alerts for backup failures
5. **Training**: Train team on recovery procedures

---

## Monitoring

### Backup Monitoring

#### Check Backup Status

```bash
# List recent backups
ls -lh backups/

# Check backup size
du -sh backups/

# Verify backup integrity
gunzip -t backups/netflow_cms_*.sql.gz
```

#### Automated Monitoring

Set up monitoring for:
- Backup success/failure
- Backup file size (should be consistent)
- Backup age (should be recent)
- Disk space (for backup storage)

### Alerting

Configure alerts for:
- Backup failures
- Backup age > 24 hours
- Disk space < 20%
- Backup file size anomalies

---

## Cloud Storage Integration

### AWS S3

```bash
# Upload backup to S3
aws s3 cp backups/netflow_cms_*.sql.gz s3://netflow-backups/database/

# Download from S3
aws s3 cp s3://netflow-backups/database/netflow_cms_*.sql.gz backups/
```

### Azure Blob Storage

```bash
# Upload backup to Azure
az storage blob upload \
  --account-name netflowstorage \
  --container-name backups \
  --name netflow_cms_*.sql.gz \
  --file backups/netflow_cms_*.sql.gz
```

### Google Cloud Storage

```bash
# Upload backup to GCS
gsutil cp backups/netflow_cms_*.sql.gz gs://netflow-backups/database/
```

---

## Best Practices

1. **Test Restores**: Regularly test restore procedures
2. **Offsite Backups**: Store backups in different location
3. **Encryption**: Encrypt backups at rest
4. **Access Control**: Limit access to backup files
5. **Documentation**: Keep recovery procedures up-to-date
6. **Monitoring**: Monitor backup success/failure
7. **Automation**: Automate backup process
8. **Versioning**: Keep multiple backup versions

---

## Troubleshooting

### Problem: Backup fails

**Check**:
- Database connection
- Disk space
- Permissions
- PostgreSQL version

### Problem: Restore fails

**Check**:
- Backup file integrity
- Database connection
- Disk space
- Permissions

### Problem: Backup too large

**Solutions**:
- Use compression (already enabled)
- Exclude unnecessary tables
- Use incremental backups

---

**Ostatnia aktualizacja**: 2025-01-20
