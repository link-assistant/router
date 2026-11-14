"""Stage the independent header fixture repair, retaining other working drafts."""
import subprocess
from pathlib import Path

path = 'tools/translation/test/router-core-vectors.test.mjs'
before = subprocess.check_output(['git', 'show', 'HEAD:' + path], text=True)
current = Path(path).read_text()
line = "import {composeUpstreamHeaderPrivacySource} from './fixtures/upstream-header-privacy-source-composition.mjs';\n"
start = "test('the complete actual upstream-header module retains its original function and yields an independently checked owned candidate', async () => {"
assert before.count(start) == current.count(start) == 1
assert not before.startswith(line) and current.startswith(line)
after = line + before[:before.index(start)] + current[current.index(start):]
assert after != before
blob = subprocess.check_output(['git', 'hash-object', '-w', '--stdin'], input=after, text=True).strip()
subprocess.run(['git', 'update-index', '--cacheinfo', '100644', blob, path], check=True)
