#!/usr/bin/env python3
"""Require every OpenAPI operation in each generated HTTP client's API."""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
spec = json.loads((ROOT / "openapi/router.yaml").read_text())
operations = {
    operation["operationId"]
    for methods in spec["paths"].values()
    for operation in methods.values()
}
sources = {
    "go": list((ROOT / "target/http-clients/go").glob("api_*.go")),
    "php": list((ROOT / "target/http-clients/php/lib/Api").glob("*.php")),
    "java": list((ROOT / "target/http-clients/java/src/main/java/router/client/api").glob("*.java")),
}
declarations = {
    "go": r"func\s+\([^)]*\)\s+(\w+)\s*\(",
    "php": r"public\s+function\s+(\w+)\s*\(",
    "java": r"public\s+(?:static\s+)?[\w<>, ?\[\].]+?\s+(\w+)\s*\(",
}
for language, paths in sources.items():
    source = "\n".join(path.read_text() for path in paths)
    exports = set(re.findall(declarations[language], source))
    missing = []
    for operation in sorted(operations):
        pieces = operation.split("_")
        name = pieces[0] + "".join(piece[:1].upper() + piece[1:] for piece in pieces[1:])
        if language == "go":
            name = name[:1].upper() + name[1:]
        if name not in exports:
            missing.append(operation)
    if missing:
        raise SystemExit(f"{language} client omitted operations: {', '.join(missing)}")
    print(f"{language}: all {len(operations)} HTTP operations present")
