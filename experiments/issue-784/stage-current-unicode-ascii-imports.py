"""Stage only current asset imports while other reviewed layers remain draft."""
import difflib
from pathlib import Path
import subprocess

paths = ['tools/translation/' + name + '.mjs' for name in [
    'prepare-core-matches-sources', 'prepare-core-vector-sources',
    'prepare-executable-checked-source', 'prepare-primitive-identity-boundary',
    'prepare-source-lifetime-refusal-batches', 'test/router-core-vectors.test']]
patch = []
for path in paths:
    before = subprocess.check_output(['git', 'show', 'HEAD:' + path]).decode()
    after = before.replace("'./prepare-core-ascii-assets.mjs'",
                           "'./prepare-current-core-ascii-assets.mjs'")
    after = after.replace("'./prepare-core-ascii-base-assets.mjs'",
                          "'./prepare-current-core-ascii-base-assets.mjs'")
    after = after.replace("'../prepare-core-ascii-assets.mjs'",
                          "'../prepare-current-core-ascii-assets.mjs'")
    after = after.replace("'../prepare-core-ascii-base-assets.mjs'",
                          "'../prepare-current-core-ascii-base-assets.mjs'")
    assert after != before, 'Expected explicit current asset imports: ' + path
    patch.extend(difflib.unified_diff(before.splitlines(True), after.splitlines(True),
                                      fromfile='a/' + path, tofile='b/' + path))
target = Path('ci-logs/issue-784-restart-2/current-unicode-ascii-imports-only.patch')
target.write_text(''.join(patch))
subprocess.run(['git', 'apply', '--cached', str(target)], check=True)
print('Staged current asset imports in ' + str(len(paths)) + ' complete source files')
