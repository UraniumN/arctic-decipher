#!/usr/bin/env bash
# smoke.sh — Imitates the ERP's export-then-leak flow without needing the ERP.
# Usage: TRACER=http://localhost:8000 IK=ik RK=rk bash smoke.sh
set -e

T=${TRACER:-http://localhost:8000}; IK=${IK:-ik}; RK=${RK:-rk}
J='content-type: application/json'
now=$(date +%s)
uuid() { python3 -c 'import uuid;print(uuid.uuid4())' 2>/dev/null || python -c 'import uuid;print(uuid.uuid4())'; }

echo "-- health";       curl -s $T/health
echo; echo "-- db";     curl -s -H "x-read-key: $RK" $T/health/db
echo; echo "-- bad key"; curl -s -o /dev/null -w "%{http_code}\n" -X POST $T/events -H "$J" -d '{"events":[]}'

echo "-- register canary"
curl -s -X POST $T/canaries -H "$J" -H "x-ingest-key: $IK" \
  -d '{"canaries":[{"token":"tok_ab12cd","service":"svc_export"}]}'

echo; echo "-- ingest export+leak flow"
curl -s -X POST $T/events -H "$J" -H "x-ingest-key: $IK" -d "{\"events\":[
 {\"event_id\":\"$(uuid)\",\"ts\":$now,\"actor\":\"p_aaaaaaaaaa\",\"action\":\"request\",\"target\":\"svc_export\",\"data_id\":\"S1001\"},
 {\"event_id\":\"$(uuid)\",\"ts\":$now,\"actor\":\"svc_students\",\"action\":\"transfer\",\"target\":\"svc_export\",\"data_id\":\"S1001\"},
 {\"event_id\":\"$(uuid)\",\"ts\":$now,\"actor\":\"svc_fees\",\"action\":\"transfer\",\"target\":\"svc_export\",\"data_id\":\"S1001\"},
 {\"event_id\":\"$(uuid)\",\"ts\":$now,\"actor\":\"svc_export\",\"action\":\"publish\",\"target\":\"public_bucket\",\"data_id\":\"S1001\"}]}"

echo; echo "-- verify (expect gaps: [])"
curl -s -H "x-read-key: $RK" $T/verify

echo; echo "-- investigate (expect svc_export on top, canary owner svc_export)"
curl -s -X POST $T/investigate -H "$J" -H "x-read-key: $RK" \
  -d '{"data_id":"S1001","exposure":"public_bucket","leaked_text":"{\"note_ref\":\"tok_ab12cd@trap.test\"}"}'
echo
