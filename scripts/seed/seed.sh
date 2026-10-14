#!/usr/bin/env bash
# seed.sh — Seed the system with demo data
# Usage: bash scripts/seed/seed.sh
set -e

ERP=${ERP:-http://localhost:3001}
AK=${AK:-ak}

PY="python3"
if ! command -v python3 &> /dev/null; then
  PY="python"
fi

echo "Seeding LeakTrace with demo data..."

echo ""
echo "1. Register canary tokens..."
curl -sf -X POST -H "x-admin-key: $AK" $ERP/admin/register-canaries | $PY -m json.tool

echo ""
echo "2. Read S1001 as clerk01..."
curl -sf -H "x-user-id: clerk01" $ERP/students/S1001 > /dev/null
curl -sf -H "x-user-id: clerk01" $ERP/fees/S1001 > /dev/null
echo "  Done."

echo ""
echo "3. Read S1001 as dean01..."
curl -sf -H "x-user-id: dean01" $ERP/students/S1001 > /dev/null
echo "  Done."

echo ""
echo "4. Export S1001 as intern01..."
curl -sf -X POST -H "x-user-id: intern01" $ERP/export/S1001 > /dev/null
echo "  Done."

echo ""
echo "5. Read S1002 as clerk01..."
curl -sf -H "x-user-id: clerk01" $ERP/students/S1002 > /dev/null
echo "  Done."

echo ""
echo "Seeding complete."
