#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
clients="$root/target/http-clients"
python3 "$root/scripts/check-http-client-parity.py"
cp "$root/experiments/issue-697/http-clients/go_test.go" "$clients/go/router_probe_test.go"
(cd "$clients/go" && GOMAXPROCS=2 go mod tidy && GOMAXPROCS=2 go test -p 2 -run '^$' ./...)
if command -v composer >/dev/null; then
  composer_command=(composer)
else
  composer_command=(php "$root/experiments/issue-697/tools/composer.phar")
fi
(cd "$clients/php" && "${composer_command[@]}" install --no-interaction --no-progress)
while IFS= read -r -d '' file; do php -l "$file" >/dev/null; done < <(find "$clients/php/lib" -name '*.php' -print0)
mkdir -p "$clients/java/src/test/java/router/client"
cp "$root/experiments/issue-697/http-clients/RouterProbe.java" "$clients/java/src/test/java/router/client/RouterProbe.java"
maven="${ROUTER_MAVEN:-mvn}"
(cd "$clients/java" && MAVEN_OPTS='-Xmx512m' "$maven" -q -DskipTests -Dmaven.javadoc.skip=true test-compile dependency:build-classpath -Dmdep.outputFile=target/classpath)
"${ROUTER_PYTHON:-python3}" "$root/experiments/issue-697/http-clients/run.py"
