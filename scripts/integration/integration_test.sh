#!/usr/bin/env bash
# integration_test.sh — End-to-end connectivity and flow test
# Usage: bash scripts/integration/integration_test.sh
set -e

TRACER=${TRACER:-http://localhost:8000}
ERP=${ERP:-http://localhost:3001}
RK=${RK:-rk}; IK=${IK:-ik}; AK=${AK:-ak}

PY="python3"
if ! command -v python3 &> /dev/null; then
  PY="python"
fi

echo "═══════════════════════════════════════════════════════════"
echo "  LeakTrace Integration Test"
echo "═══════════════════════════════════════════════════════════"

echo ""
echo "1. Tracer health..."
curl -sf $TRACER/health | $PY -m json.tool
echo ""

echo "2. Tracer DB health..."
curl -sf -H "x-read-key: $RK" $TRACER/health/db | $PY -m json.tool
echo ""

echo "3. Ingest key enforced..."
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST $TRACER/events \
  -H "content-type: application/json" -d '{"events":[]}')
echo "  Expected 401, got: $STATUS"
[ "$STATUS" = "401" ] || { echo "FAIL"; exit 1; }
echo ""

echo "4. ERP health..."
curl -sf $ERP/health | $PY -m json.tool
echo ""

echo "5. Register canaries via ERP admin..."
curl -sf -X POST -H "x-admin-key: $AK" $ERP/admin/register-canaries | $PY -m json.tool
echo ""

echo "6. Read student S1001 as clerk01..."
curl -sf -H "x-user-id: clerk01" $ERP/students/S1001 | $PY -m json.tool
echo ""

echo "7. Export S1001 as intern01..."
curl -sf -X POST -H "x-user-id: intern01" $ERP/export/S1001 | $PY -m json.tool
echo ""

echo "8. Simulate leak S1001..."
LEAKED=$(curl -sf -X POST $ERP/leak/S1001)
echo "$LEAKED" | $PY -m json.tool
echo ""

echo "9. Verify chain (expect clean)..."
curl -sf -H "x-read-key: $RK" $TRACER/verify | $PY -m json.tool
echo ""

echo "10. Investigate S1001..."
curl -sf -X POST $TRACER/investigate \
  -H "content-type: application/json" \
  -H "x-read-key: $RK" \
  -d "{\"data_id\":\"S1001\",\"exposure\":\"public_bucket\",\"leaked_text\":$(echo $LEAKED | $PY -c 'import sys,json;d=json.load(sys.stdin);print(json.dumps(json.dumps(d.get(\"leaked\",d))))')}" \
  | $PY -m json.tool
echo ""

echo "11. Custodian reveal..."
curl -sf -H "x-admin-key: $AK" $ERP/custodian/reveal | $PY -m json.tool
echo ""

echo "═══════════════════════════════════════════════════════════"
echo "  All checks passed ✓"
echo "═══════════════════════════════════════════════════════════"
