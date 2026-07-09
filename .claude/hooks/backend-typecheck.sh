#!/bin/bash
# PostToolUse : type-check du backend TypeScript après édition de backend/**/*.ts
# Exit 2 + stderr => les erreurs tsc sont renvoyées à Claude pour correction immédiate.

input=$(cat)
file=$(printf '%s' "$input" | python3 -c 'import json,sys; d=json.load(sys.stdin); print(d.get("tool_input",{}).get("file_path",""))' 2>/dev/null)

case "$file" in
  */backend/*.ts) ;;
  *) exit 0 ;;
esac

root="${CLAUDE_PROJECT_DIR:-$(pwd)}"
# Sans node_modules, npx téléchargerait tsc à chaud : on passe silencieusement.
[ -d "$root/backend/node_modules/typescript" ] || exit 0

out=$(cd "$root/backend" && npx tsc --noEmit --pretty false 2>&1)
status=$?
if [ $status -ne 0 ]; then
  {
    echo "tsc --noEmit a échoué après l'édition de $file :"
    echo "$out" | head -40
  } >&2
  exit 2
fi
exit 0
