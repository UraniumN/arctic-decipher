# smoke.ps1 — Windows PowerShell smoke test for Tracer
$ErrorActionPreference = "Stop"
$TRACER = if ($env:TRACER) { $env:TRACER } else { "http://localhost:8000" }
$IK = if ($env:IK) { $env:IK } else { "ik" }
$RK = if ($env:RK) { $env:RK } else { "rk" }

Write-Host "-- health"
Invoke-RestMethod -Uri "$TRACER/health" | ConvertTo-Json

Write-Host "`n-- db"
Invoke-RestMethod -Uri "$TRACER/health/db" -Headers @{ "x-read-key" = $RK } | ConvertTo-Json

Write-Host "`n-- bad key (expect 401)"
try {
    Invoke-WebRequest -Uri "$TRACER/events" -Method POST -Headers @{ "Content-Type" = "application/json" } -Body '{"events":[]}' -UseBasicParsing
    Write-Host "Warning: expected 401 but request succeeded"
} catch {
    Write-Host "Got expected status code: $($_.Exception.Response.StatusCode.value__)"
}

Write-Host "`n-- register canary"
Invoke-RestMethod -Uri "$TRACER/canaries" -Method POST -Headers @{ "Content-Type" = "application/json"; "x-ingest-key" = $IK } -Body '{"canaries":[{"token":"tok_ab12cd","service":"svc_export"}]}' | ConvertTo-Json

Write-Host "`n-- ingest export+leak flow"
$now = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
$e1 = [guid]::NewGuid().ToString()
$e2 = [guid]::NewGuid().ToString()
$e3 = [guid]::NewGuid().ToString()
$e4 = [guid]::NewGuid().ToString()

$batch = @{
    events = @(
        @{ event_id = $e1; ts = $now; actor = "p_aaaaaaaaaa"; action = "request"; target = "svc_export"; data_id = "S1001"; status = 200 },
        @{ event_id = $e2; ts = $now; actor = "svc_students"; action = "transfer"; target = "svc_export"; data_id = "S1001"; status = 200 },
        @{ event_id = $e3; ts = $now; actor = "svc_fees"; action = "transfer"; target = "svc_export"; data_id = "S1001"; status = 200 },
        @{ event_id = $e4; ts = $now; actor = "svc_export"; action = "publish"; target = "public_bucket"; data_id = "S1001"; status = 200 }
    )
} | ConvertTo-Json -Depth 5

Invoke-RestMethod -Uri "$TRACER/events" -Method POST -Headers @{ "Content-Type" = "application/json"; "x-ingest-key" = $IK } -Body $batch | ConvertTo-Json

Write-Host "`n-- verify (expect gaps: [])"
Invoke-RestMethod -Uri "$TRACER/verify" -Headers @{ "x-read-key" = $RK } | ConvertTo-Json -Depth 5

Write-Host "`n-- investigate (expect svc_export on top, canary owner svc_export)"
$inv = @{
    data_id = "S1001"
    exposure = "public_bucket"
    leaked_text = '{"note_ref":"tok_ab12cd@trap.test"}'
} | ConvertTo-Json

Invoke-RestMethod -Uri "$TRACER/investigate" -Method POST -Headers @{ "Content-Type" = "application/json"; "x-read-key" = $RK } -Body $inv | ConvertTo-Json -Depth 5
