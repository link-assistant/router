"""Retain both complete original Clone test inputs and their unchanged cases."""
import gzip
import hashlib
import json
from pathlib import Path
import subprocess

path = Path('tools/translation/test/clone-enclosing-source-history.test.mjs')
before = subprocess.check_output(['git', 'show', 'HEAD:' + str(path)]).decode()
after = path.read_text()
marker = "const root=new URL('../../../',import.meta.url);"
original_cases = before[before.index(marker):]
assert original_cases == after[after.index(marker):]
assert original_cases.count("\ntest('") == 4
assert original_cases.count('{timeout:60000}') == 4
record = dict(schema='complete-original-clone-receiving-review-v1', path=str(path),
              before=before, after=after, originalCases=original_cases,
              originalCaseSha256=hashlib.sha256(original_cases.encode()).hexdigest(),
              completeCaseCount=4, originalDeadlineMilliseconds=60000,
              currentSourceIndependentlyChecked=True, semanticAuthority=False)
target = Path('ci-logs/issue-784-restart-2/current-struct-ordering-clone-review.json.gz')
with target.open('xb') as stream:
    with gzip.GzipFile(fileobj=stream, mode='wb', mtime=0) as packed:
        packed.write(json.dumps(record, separators=(',', ':')).encode())
print(json.dumps(dict(path=str(target), completeCases=4,
                     originalCaseSha256=record['originalCaseSha256'])))
