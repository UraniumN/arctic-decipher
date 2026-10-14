# demo.ps1 — Full demo flow in Windows PowerShell
$ErrorActionPreference = "Stop"

$ERP = if ($env:ERP) { $env:ERP } else { "http://localhost:3001" }
$TRACER = if ($env:TRACER) { $env:TRACER } else { "http://localhost:8000" }
$RK = if ($env:RK) { $env:RK } else { "rk" }
$AK = if ($env:AK) { $env:AK } else { "ak" }

Write-Host "═══════════════════════════════════════════════════════════"
Write-Host "  LeakTrace Demo (PowerShell)"
Write-Host "═══════════════════════════════════════════════════════════"

Write-Host "`nStep 1: Register canary tokens"
Invoke-RestMethod -Uri "$ERP/admin/register-canaries" -Method POST -Headers @{ "x-admin-key" = $AK } | ConvertTo-Json

Write-Host "`nStep 2: Various users access S1001"
Invoke-RestMethod -Uri "$ERP/students/S1001" -Headers @{ "x-user-id" = "clerk01" } | Out-Null
Invoke-RestMethod -Uri "$ERP/students/S1001" -Headers @{ "x-user-id" = "dean01" } | Out-Null
Write-Host "  clerk01 and dean01 read student data"

Write-Host "`nStep 3: intern01 exports S1001"
$exportRes = Invoke-RestMethod -Uri "$ERP/export/S1001" -Method POST -Headers @{ "x-user-id" = "intern01" }
$exportRes | ConvertTo-Json -Depth 5

Write-Host "`nStep 4: Data leaks to public bucket"
$leakRes = Invoke-RestMethod -Uri "$ERP/leak/S1001" -Method POST
$leakRes | ConvertTo-Json -Depth 5

Write-Host "`nStep 5: Check chain integrity (should be clean)"
Invoke-RestMethod -Uri "$TRACER/verify" -Headers @{ "x-read-key" = $RK } | ConvertTo-Json -Depth 5

Write-Host "`nStep 6: Investigate the leak"
$invBody = @{
    data_id = "S1001"
    exposure = "public_bucket"
    leaked_text = ($leakRes.leaked | ConvertTo-Json -Compress)
} | ConvertTo-Json

Invoke-RestMethod -Uri "$TRACER/investigate" -Method POST -Headers @{ "Content-Type" = "application/json"; "x-read-key" = $RK } -Body $invBody | ConvertTo-Json -Depth 5

Write-Host "`nStep 7: Reveal identities (custodian)"
Invoke-RestMethod -Uri "$ERP/custodian/reveal" -Headers @{ "x-admin-key" = $AK } | ConvertTo-Json

Write-Host "`n═══════════════════════════════════════════════════════════"
Write-Host "  Demo complete! Open the dashboard to visualize results."
Write-Host "═══════════════════════════════════════════════════════════"
