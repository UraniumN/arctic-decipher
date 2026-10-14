#!/usr/bin/env bash
# demo.sh — Full demo flow: seed, leak, tamper, investigate
# Usage: bash scripts/demo/demo.sh
set -e

ERP=${ERP:-http://localhost:3001}
TRACER=${TRACER:-http://localhost:8000}
RK=${RK:-rk}; AK=${AK:-ak}

PY="python3"
if ! command -v python3 &> /dev/null; then
  PY="python"
fi

echo "═══════════════════════════════════════════════════════════"
echo "  LeakTrace Demo"
echo "═══════════════════════════════════════════════════════════"

echo ""
echo "Step 1: Register canary tokens"
curl -sf -X POST -H "x-admin-key: $AK" $ERP/admin/register-canaries
echo ""

echo ""
echo "Step 2: Various users access S1001"
curl -sf -H "x-user-id: clerk01" $ERP/students/S1001 > /dev/null
curl -sf -H "x-user-id: dean01" $ERP/students/S1001 > /dev/null
echo "  clerk01 and dean01 read student data"

echo ""
echo "Step 3: intern01 exports S1001"
curl -sf -X POST -H "x-user-id: intern01" $ERP/export/S1001 | $PY -m json.tool

echo ""
echo "Step 4: Data leaks to public bucket"
LEAKED=$(curl -sf -X POST $ERP/leak/S1001)
echo "$LEAKED" | $PY -m json.tool

echo ""
echo "Step 5: Check chain integrity (should be clean)"
curl -sf -H "x-read-key: $RK" $TRACER/verify | $PY -m json.tool

echo ""
echo "Step 6: Investigate the leak"
curl -sf -X POST $TRACER/investigate \
  -H "content-type: application/json" \
  -H "x-read-key: $RK" \
  -d '{"data_id":"S1001","exposure":"public_bucket","leaked_text":"{\"note_ref\":\"tok_ab12cd@trap.test\"}"}' \
  | $PY -m json.tool

echo ""
echo "Step 7: Reveal identities (custodian)"
curl -sf -H "x-admin-key: $AK" $ERP/custodian/reveal | $PY -m json.tool

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  Demo complete! Open the dashboard to visualize results."
echo "═══════════════════════════════════════════════════════════"
