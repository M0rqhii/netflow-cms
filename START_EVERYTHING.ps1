$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

powershell -ExecutionPolicy Bypass -File ".\scripts\start-dev.ps1"
