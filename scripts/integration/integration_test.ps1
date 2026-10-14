# integration_test.ps1 — End-to-end connectivity and flow test in Windows PowerShell
$ErrorActionPreference = "Stop"

$TRACER = if ($env:TRACER) { $env:TRACER } else { "http://localhost:8000" }
$ERP = if ($env:ERP) { $env:ERP } else { "http://localhost:3001" }
$RK = if ($env:RK) { $env:RK } else { "rk" }
$IK = if ($env:IK) { $env:IK } else { "ik" }
$AK = if ($env:AK) { $env:AK } else { "ak" }

Write-Host "═══════════════════════════════════════════════════════════"
Write-Host "  LeakTrace Integration Test (PowerShell)"
Write-Host "═══════════════════════════════════════════════════════════"

Write-Host "`n1. Tracer health..."
Invoke-RestMethod -Uri "$TRACER/health" | ConvertTo-Json

Write-Host "`n2. Tracer DB health..."
Invoke-RestMethod -Uri "$TRACER/health/db" -Headers @{ "x-read-key" = $RK } | ConvertTo-Json

Write-Host "`n3. Ingest key enforced..."
try {
    Invoke-WebRequest -Uri "$TRACER/events" -Method POST -Headers @{ "Content-Type" = "application/json" } -Body '{"events":[]}' -UseBasicParsing
    Write-Error "FAIL: Expected 401 but request succeeded"
    exit 1
} catch {
    $code = $_.Exception.Response.StatusCode.value__
    Write-Host "  Expected 401, got: $code"
    if ($code -ne 401) {
        Write-Error "FAIL: Expected 401, got $code"
        exit 1
    }
}

Write-Host "`n4. ERP health..."
Invoke-RestMethod -Uri "$ERP/health" | ConvertTo-Json

Write-Host "`n5. Register canaries via ERP admin..."
Invoke-RestMethod -Uri "$ERP/admin/register-canaries" -Method POST -Headers @{ "x-admin-key" = $AK } | ConvertTo-Json

Write-Host "`n6. Read student S1001 as clerk01..."
Invoke-RestMethod -Uri "$ERP/students/S1001" -Headers @{ "x-user-id" = "clerk01" } | ConvertTo-Json

Write-Host "`n7. Export S1001 as intern01..."
Invoke-RestMethod -Uri "$ERP/export/S1001" -Method POST -Headers @{ "x-user-id" = "intern01" } | ConvertTo-Json -Depth 5

Write-Host "`n8. Simulate leak S1001..."
$leakRes = Invoke-RestMethod -Uri "$ERP/leak/S1001" -Method POST
$leakRes | ConvertTo-Json -Depth 5

Write-Host "`n9. Verify chain (expect clean)..."
Invoke-RestMethod -Uri "$TRACER/verify" -Headers @{ "x-read-key" = $RK } | ConvertTo-Json -Depth 5

Write-Host "`n10. Investigate S1001..."
$invBody = @{
    data_id = "S1001"
    exposure = "public_bucket"
    leaked_text = ($leakRes.leaked | ConvertTo-Json -Compress)
} | ConvertTo-Json

Invoke-RestMethod -Uri "$TRACER/investigate" -Method POST -Headers @{ "Content-Type" = "application/json"; "x-read-key" = $RK } -Body $invBody | ConvertTo-Json -Depth 5

Write-Host "`n11. Custodian reveal..."
Invoke-RestMethod -Uri "$ERP/custodian/reveal" -Headers @{ "x-admin-key" = $AK } | ConvertTo-Json

Write-Host "`n═══════════════════════════════════════════════════════════"
Write-Host "  All checks passed ✓"
Write-Host "═══════════════════════════════════════════════════════════"
