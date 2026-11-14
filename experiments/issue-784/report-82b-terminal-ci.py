"""Join every terminal job and preserved full stream for the current CI cycle."""
from collections import Counter
import gzip
import hashlib
import json
from pathlib import Path

base = Path('ci-logs/issue-784-restart-2')
collection = json.loads((base / 'next-82b-terminal-log-collection.json').read_bytes())
snapshot = collection['snapshot']
assert snapshot['headSha'] == '82bff66b3eaec603e296f1d888fe909dad4743c8'
assert all(job['status'] == 'completed' for job in snapshot['jobs'])
reasons = {
130108033635: 'Strict parity: 441 draft gaps, 12426 carried Rust items; complete canonical comparison exceeded its original 1200000 ms child limit (1200338 ms).',
130108034017: 'All-profile generation exhausted its original 60-minute job before completing Unix/Windows; no complete matrix draft was available for upload.',
130108034114: 'proof-byte-core-stream candidate and schemars full-source cases exceeded 60000 ms; the legacy hash-hook child returned ETIMEDOUT.',
130108034118: 'internal-metadata-digest-adoption.test.mjs:33 provider/affinity parent case: 70946.665 ms against 60000 ms.',
130108034126: 'Owned definition corpus: current forward inventory differs. Ordinary regeneration independently reported zero changes.',
130108034130: 'Owned-profile generation exhausted its original 60-minute job during Unix work; the complete matrix and its upload were unavailable.',
130108034196: 'parse_csv exceeded 900000 ms; split_repository_list lacks checked execution and reports unresolved std imports. Two other whole-source cases exceeded their 60000/90000 ms limits.',
130108034210: 'router-core-json-parse.test.mjs:30 full parent case: 160635.679 ms against 60000 ms.',
130108034238: 'All assertions passed, but owned-core-base64.test.mjs:19 took 69618.764 ms against its original 60000 ms limit.',
130108034294: 'All assertions passed, but derive-bang-context.test.mjs:120 took 141215.622 ms against 60000 ms.',
130108034311: 'Reverse Node bin 1 exhausted its original 15-minute job limit; no complete successful cohort.',
130108034312: 'Forward bin 9 exhausted its original 60-minute job limit. GitHub returns 404 BlobNotFound for its complete log; fallback also reports log not found.',
130108034325: 'Assertions passed; original whole schema, private-data-freeze and router-core-matches cases exceeded 30000/60000/60000 ms.',
130108034362: 'json-source-f64-original-root.test.mjs:19 exceeded 60000 ms, then bin 13 exhausted its original 60-minute job limit.',
130108034374: 'ENOENT: profiles/owned-definitions-matrix-80dc0d37762835fbe925b47e6fad25fee5c1d3c093fafff0512fc2bd3f9ae4e0.json. Native TypeScript cases and ordinary profile strict compilation passed.',
130108034386: 'Assertions passed; executable-checked-source.test.mjs:19 took 71215.055 ms against 60000 ms.',
130108034452: 'Assertions passed; reverse-independent-corpus.test.mjs:95 took 68527.987 ms against 60000 ms.',
130108034460: 'Eight actual-gain-families cases fail their before hook on the current isolated compiler manifest source pin; option-borrowed-str-equality full-parent case took 2187617.484 ms against 60000 ms.',
130108034479: 'Bun reverse bin 7 exhausted its original 15-minute job limit; no complete successful cohort.',
130108034486: 'core-literal-text-adoption.test.mjs:53 exceeded 60000 ms; private-rust-compiler-execution.test.mjs:59 refused the original complete raw source byte bound.',
130108034540: 'native-portable-corpus-concrete-syntax.test.mjs:149 took 121755.257 ms; router-core-unit-matches.test.mjs:109 took 2296986.198 ms. Both have 60000 ms limits; the job then exhausted 60 minutes.',
130108034544: 'runtime-import-parents.test.mjs whole original/current build equality case: 62969.28 ms against 60000 ms. All seven selected files executed.',
130108034572: 'translator.test.mjs deterministic regeneration case: 82682.81 ms against the original Bun 5000 ms default. All seven selected files executed.',
130108034599: 'Reverse Node bin 7 exhausted its original 15-minute job limit; no complete successful cohort.',
130108034607: 'Assertions passed; static-source-lifecycle.test.mjs:37 took 61484.839 ms against 60000 ms.',
130108034629: 'Canonical --check refused stale parity/rust-source-inventory.json. Its complete output packet is retained and reviewed without installing stale source inputs.',
130108034778: 'Bun reverse bin 1 exhausted its original 15-minute job limit; no complete successful cohort.',
130108035101: 'owned-core-ascii.test.mjs:25 complete runtime import/type case: 102806.523 ms against 60000 ms.',
130154524309: 'Aggregate correctly refuses green because required same-commit stages did not all succeed. All 25 Rust jobs remain skipped.',
}
records = []
for row in collection['records']:
    job = row['job']
    assert job['databaseId'] in reasons
    path = Path(row['log'])
    digest = hashlib.sha256()
    line_count = 0
    matches = []
    # Review complete streams in chunks no larger than 1500 lines.
    with gzip.open(path, 'rb') as source:
        while True:
            chunk = []
            for _ in range(1500):
                line = source.readline()
                if not line:
                    break
                chunk.append(line)
            if not chunk:
                break
            for line in chunk:
                digest.update(line)
                line_count += 1
                text = line.decode('utf8').rstrip()
                if any(word in text for word in (
                    'not ok ', 'ENOENT:', 'Observed ', 'Stale ', 'stale ', 'stale:',
                    'complete source byte bound', 'draft-gaps=', 'canonical--check',
                    'current forward inventory differs', 'The operation was canceled.',
                    'log not found', 'BlobNotFound', 'timeoutBudgetMs=',
                    'Native parity inventory:', 'Rust translation inventory:',
                    'Strict native parity failed:',
                    'Independent complete source/deadline audit failed',
                    '"exitCode":1', 'Process completed with exit code 1')):
                    matches.append(dict(line=line_count, text=text))
    assert digest.hexdigest() == row['sha256']
    records.append(dict(job=job['databaseId'], name=job['name'],
        conclusion=job['conclusion'], url=job['url'], path=str(path),
        fullStreamSha256=digest.hexdigest(), lines=line_count,
        validJobLog=row['validJobLog'], findings=matches,
        explanation=reasons[job['databaseId']]))

report = dict(schema='terminal-82b-complete-failure-set-review-v1',
    headSha=snapshot['headSha'], mergeSha='a3154a334b5fd6916b1f1c5c9d114bed665fefc4',
    runId=42895668515, jobConclusions=dict(Counter(j['conclusion'] for j in snapshot['jobs'])),
    completeFailureSetKnown=True, allAvailableNonpassingLogsReviewed=True,
    allNonpassingLogsAvailable=False, missingWholeJobLog=130108034312,
    originalBoundsChanged=False, semanticAuthority=False, runtimeParity=False,
    records=records)
raw = json.dumps(report, separators=(',', ':')).encode()
target = base / 'next-82b-terminal-complete-failure-review.json.gz'
target.write_bytes(gzip.compress(raw, mtime=0))
assert gzip.decompress(target.read_bytes()) == raw
lines = [
 '# Terminal CI cycle for 82bff66b3', '',
 '[PR #785](https://github.com/link-assistant/router/pull/785) remains draft.',
 'The complete [run 42895668515](https://github.com/link-assistant/router/actions/runs/42895668515)',
 'started 2026-11-10 20:28:46 UTC and ended 21:51:29 UTC. Its published head is',
 '`82bff66b3eaec603e296f1d888fe909dad4743c8`; Actions tested merge',
 '`a3154a334b5fd6916b1f1c5c9d114bed665fefc4`. All 75 jobs are terminal:',
 '20 failed, nine cancelled, 21 successful, 25 skipped. No run was cancelled by this task.',
 '',
 'Every non-passing job is listed below. Complete available logs were downloaded,',
 'decompressed, hashed and reviewed. Forward bin 9 is an external evidence gap:',
 'two direct log API requests return HTTP 404 `BlobNotFound`, and the run/job',
 'fallback returns `log not found`. Its terminal metadata is retained; its absent',
 'log cannot establish which individual cases ran or failed. This is not a missing',
 'CI credential and supplies no reason to skip any mandatory check.',
 '',
 '| Job | Result | Failure and original bound | Retained complete log lines |',
 '| --- | --- | --- | --- |',
]
for row in records:
    numbers = ', '.join(str(r['line']) for r in row['findings']) or 'No matching scalar summary; inspect full stream'
    lines.append(f"| [{row['name'].split(' / ',1)[-1]}]({row['url']}) | {row['conclusion']} | {row['explanation']} | {numbers} |")
lines.extend([
 '', 'All 41 published artifacts were collected: 40 complete ZIPs and the complete',
 'canonical ZIP in lossless XZ storage. All ordinary members were reopened,',
 'CRC checked, length/hash joined and reviewed, including the last bin 12 TAP.',
 'The canonical packet contains 2873 complete nested gzip members, totalling',
 '320408245 decoded bytes. Whole ZIP SHA256 is',
 '`e5625dbfdd44ef27e0df0696fbe20cf96edf0e14719b6b05c7417fd0fabf54d4`.',
 'All nested streams and complete source/output joins were reviewed. Only',
 '`parity/rust-source-inventory.json` differs among its checked-in outputs, but',
 'the current `tools/translation/project.mjs` also differs from the packet input.',
 'These unqualified old-source outputs were not installed.',
 '', 'Native Node/Bun tests passed. Those successes do not waive the original',
 'case deadlines, missing owned-profile outputs, raw private compiler bound,',
 'freshness failures or strict parity requirements. Strict parity still reports',
 '441 draft gaps and 12426 carried Rust items. No Rust check or local Rust tool',
 'was run. There is no green current complete JavaScript gate.',
 '', 'The full per-job findings and exact complete-log hashes are retained in',
 '[the compressed review](../../../ci-logs/issue-784-restart-2/next-82b-terminal-complete-failure-review.json.gz).',
 'The evidence is diagnostic, not a completion or executable-authority claim.',
])
Path('docs/case-studies/issue-784/ci-82b-terminal-20261110.md').write_text('\n'.join(lines)+'\n')
print(json.dumps(dict(jobs=len(records), report=str(target), reportBytes=len(raw))))
