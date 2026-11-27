#!/usr/bin/env bash
# Pin and verify the generator; generate full HTTP clients without hand lists.
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
version=7.28.0
artifact="openapi-generator-cli-$version.jar"
artifact_path="org/openapitools/openapi-generator-cli/$version/$artifact"
tool="$root/target/http-clients/openapi-generator-$version.jar"
mkdir -p "$(dirname "$tool")"
candidate="$tool"
if [[ ! -f "$tool" ]]; then
  candidate="$(mktemp "$tool.XXXXXX")"
  trap 'rm -f -- "$candidate"' EXIT
  # The mirror serves the Maven release archive with the checksum below.
  curl -fsSL --proto '=https' --proto-redir '=https' \
    "https://maven-central.storage-download.googleapis.com/maven2/$artifact_path" -o "$candidate" ||
    curl -fsSL --proto '=https' --proto-redir '=https' \
      "https://repo.maven.apache.org/maven2/$artifact_path" -o "$candidate"
fi
python3 - "$candidate" <<'PY'
import hashlib
import sys

with open(sys.argv[1], 'rb') as jar:
    digest = hashlib.sha256()
    for chunk in iter(lambda: jar.read(1024 * 1024), b''):
        digest.update(chunk)
if digest.hexdigest() != '5790e99b92fb0d3c423aebe524222fbb7b835e7088bafcc4f241f93f73845b00':
    sys.exit('Generator checksum mismatch')
PY
if [[ "$candidate" != "$tool" ]]; then
  mv -- "$candidate" "$tool"
fi
java -Xmx512m -jar "$tool" validate -i "$root/openapi/router.yaml"
for language in php go java; do
  properties='packageName=router,hideGenerationTimestamp=true'
  if [[ "$language" == go ]]; then properties+=',enumClassPrefix=true'; fi
  if [[ "$language" == php ]]; then properties+=',invokerPackage=LinkAssistant\Router'; fi
  if [[ "$language" == java ]]; then properties+=',invokerPackage=router.client,apiPackage=router.client.api,modelPackage=router.client.model'; fi
  generated="$(mktemp -d "$root/target/http-clients/generated-$language-XXXXXX")"
  java -Xmx512m -jar "$tool" generate -i "$root/openapi/router.yaml" -g "$language" \
    -o "$generated" --global-property apiTests=false,modelTests=false \
    --additional-properties "$properties"
  rm -rf "$root/target/http-clients/$language"
  mv "$generated" "$root/target/http-clients/$language"
done
