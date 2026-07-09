#!/usr/bin/env python3
"""PostToolUse : rappelle la convention esc() (CLAUDE.md, V3 - SECURITY)
quand un sink innerHTML/outerHTML/insertAdjacentHTML est introduit dans v3/."""
import json
import re
import sys

try:
    data = json.load(sys.stdin)
except Exception:
    sys.exit(0)

tool_input = data.get("tool_input", {})
path = str(tool_input.get("file_path", "")).replace("\\", "/")

text = tool_input.get("content") or tool_input.get("new_string") or ""
if not text and isinstance(tool_input.get("edits"), list):
    text = " ".join(e.get("new_string", "") for e in tool_input["edits"])

# Ne concerne que le JS de v3 (hors vendor/ : pdfmake n'est pas notre code)
if not re.search(r"/v3/(?!vendor/).*\.js$", path):
    sys.exit(0)

if not re.search(r"(innerHTML|outerHTML)\s*\+?=|insertAdjacentHTML\s*\(", text):
    sys.exit(0)

msg = (
    "Rappel convention de sécurité v3 (CLAUDE.md, section V3 - SECURITY) : "
    "un sink innerHTML/outerHTML/insertAdjacentHTML vient d'être écrit dans ce fichier. "
    "Tout texte provenant de l'utilisateur ou de la DB (titres de permis, contractor, PA, "
    "raisons de suspension, noms de signature, texte d'événement, champs isolation/SIMOPS) "
    "DOIT passer par esc() avant d'atterrir dans le template — sinon stored-XSS. "
    "Vérifie chaque interpolation ${...} de ce template : donnée user/DB => esc(...) obligatoire. "
    "Si un nouveau champ est ajouté côté écriture, borner la longueur et valider la forme dans "
    "api/_lib/v3/sanitize.js (le maxlength client est cosmétique)."
)

print(json.dumps({
    "hookSpecificOutput": {
        "hookEventName": "PostToolUse",
        "additionalContext": msg,
    }
}))
