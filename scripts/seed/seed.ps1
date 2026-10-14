# seed.ps1 — Seed the system with demo data in Windows PowerShell
$ErrorActionPreference = "Stop"

$ERP = if ($env:ERP) { $env:ERP } else { "http://localhost:3001" }
$AK = if ($env:AK) { $env:AK } else { "ak" }

Write-Host "Seeding LeakTrace with demo data..."

Write-Host "`n1. Register canary tokens..."
Invoke-RestMethod -Uri "$ERP/admin/register-canaries" -Method POST -Headers @{ "x-admin-key" = $AK } | ConvertTo-Json

Write-Host "`n2. Read S1001 as clerk01..."
Invoke-RestMethod -Uri "$ERP/students/S1001" -Headers @{ "x-user-id" = "clerk01" } | Out-Null
Invoke-RestMethod -Uri "$ERP/fees/S1001" -Headers @{ "x-user-id" = "clerk01" } | Out-Null
Write-Host "  Done."

Write-Host "`n3. Read S1001 as dean01..."
Invoke-RestMethod -Uri "$ERP/students/S1001" -Headers @{ "x-user-id" = "dean01" } | Out-Null
Write-Host "  Done."

Write-Host "`n4. Export S1001 as intern01..."
Invoke-RestMethod -Uri "$ERP/export/S1001" -Method POST -Headers @{ "x-user-id" = "intern01" } | Out-Null
Write-Host "  Done."

Write-Host "`n5. Read S1002 as clerk01..."
Invoke-RestMethod -Uri "$ERP/students/S1002" -Headers @{ "x-user-id" = "clerk01" } | Out-Null
Write-Host "  Done."

Write-Host "`nSeeding complete."
