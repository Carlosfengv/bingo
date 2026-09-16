#!/usr/bin/env bash
# Evaluate an expression in the running app's renderer and print the result.
#
# Relies on the app being launched with BINGO_DEBUG_BRIDGE=1 (see
# src/main/debugBridge.ts). Pass a JS expression; promises are awaited.
#
#   tools/probe.sh 'document.title'
#   tools/probe.sh 'window.api.invoke("bingo:list-projects")'
set -euo pipefail

SCRIPT="${BINGO_DEBUG_SCRIPT:-/tmp/bingo-debug/in.js}"
RESULT="$SCRIPT.out"

rm -f "$RESULT"
mkdir -p "$(dirname "$SCRIPT")"
cat > "$SCRIPT" <<EOF
// nonce $(date +%s%N)
(async () => { return (await (async () => { return ($1); })()); })()
EOF

for _ in $(seq 1 ${PROBE_TRIES:-80}); do
  if [ -f "$RESULT" ]; then
    python3 -c "import json,sys;d=json.load(open('$RESULT'));print(json.dumps(d.get('result') if d.get('ok') else d.get('error'), indent=2, ensure_ascii=False))"
    exit 0
  fi
  sleep 0.25
done

echo "probe timeout: no result from $RESULT" >&2
exit 1
