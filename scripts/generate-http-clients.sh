#!/usr/bin/env bash
# Pin and verify the generator; generate full HTTP clients without hand lists.
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
tool="$root/target/http-clients/openapi-generator-7.25.0.jar"
mkdir -p "$(dirname "$tool")"
if [[ ! -f "$tool" ]]; then
  curl -fsSL 'https://repo.maven.apache.org/maven2/org/openapitools/openapi-generator-cli/7.25.0/openapi-generator-cli-7.25.0.jar' -o "$tool"
fi
python3 - "$tool" <<'PY'
import hashlib,sys
with open(sys.argv[1],'rb') as jar:
    digest = hashlib.sha256()
    for chunk in iter(lambda: jar.read(1024 * 1024), b''):
        digest.update(chunk)
    assert digest.hexdigest()=='41ce4f6b07f196676439d710759fa1ced7a08066d06ff1bf314681470289efae', 'Generator checksum mismatch'
PY
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
