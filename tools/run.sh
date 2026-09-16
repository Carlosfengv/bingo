#!/usr/bin/env bash
# Rebuild the maintained recovery inputs into an isolated output directory.
set -euo pipefail

repo_root="$(cd "$(dirname "$0")/.." && pwd)"
output="${1:-$repo_root/recovered-source}"

case "$output" in
  "$repo_root"|"$repo_root/"|"$repo_root/_raw"|"$repo_root/_raw/"*)
    echo "Refusing to write recovery output into the maintained source or _raw tree." >&2
    exit 2
    ;;
esac

node "$repo_root/tools/rebuild.mjs" --raw "$repo_root/_raw" --output "$output"
echo "Recovered source written to $output"
