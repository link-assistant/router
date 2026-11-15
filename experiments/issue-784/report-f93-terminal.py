"""Write the complete terminal CI inventory from retained whole observations."""
import gzip
import json
from collections import Counter
from pathlib import Path

base = Path('ci-logs/issue-784-restart-2')
with gzip.open(base / 'checkpointf93-terminal-artifact-review.json.gz', 'rt') as source:
    review = json.load(source)
logs = json.loads((base / 'current-f93-completed-logs-10.json').read_bytes())
snapshot = logs['snapshot']
assert logs['completeCycleCollected'] and snapshot['status'] == 'completed'
assert snapshot['headSha'] == review['headSha']
assert review['artifactCount'] == 42 and review['completeMemberReadbackVerified']
notes = {
    130196801765: 'Strict native TypeScript and all three ordinary profiles pass; owned definition matrix is absent (ENOENT).',
    130196801766: 'Grouped method, primitive boundary, vector and lifetime source-history cases fail; original deadlines remain mandatory.',
    130196801783: 'Original 15-minute reverse Node job limit; complete successful bin unavailable.',
    130196801838: 'Progress source history, proof stream and schemars source cases fail; genuine legacy child returns ETIMEDOUT.',
    130196801844: 'Original 60-minute matrix job limit; complete matrix draft unavailable.',
    130196801868: 'Ordinary regeneration reports zero changes; owned definition generation rejects stale forward inventory.',
    130196801891: 'Original 15-minute reverse Node job limit; complete successful bin unavailable.',
    130196801901: 'Original 60-minute owned matrix job limit; complete matrix draft unavailable.',
    130196801950: 'Original 15-minute reverse Bun job limit; complete successful bin unavailable.',
    130196801988: '121 acceptance assertions pass; strict parity fails with 441 draft gaps and one validation error. Canonical child takes 1200191 ms against 1200000 ms.',
    130196802010: 'Genuine canonical generation completes but check rejects stale parity/rust-source-inventory.json.',
    130196802080: 'Static compiler source admission and legacy observation child fail; reverse-independent-corpus exceeds original deadline.',
    130196802128: 'Whole schema and private-data-freeze cases exceed original deadlines.',
    130196802189: 'Original 15-minute reverse Bun job limit; complete successful bin unavailable.',
    130196802222: 'Full corpus native provenance and proof-byte source comparisons exceed original deadlines.',
    130196802243: 'Eight gain-family cases reject the project source pin; qwen source exceeds 60000 ms; method-owner source history fails.',
    130196802258: 'Provider/affinity and full derive parents exceed original deadlines.',
    130196802275: 'json_string exceeds original 60000 ms; later lexical corpus is interrupted at job limit.',
    130196802283: 'Complete native corpus CST case exceeds original deadline.',
    130196802319: 'parse_csv exceeds 900000 ms; split_repository_list has unresolved checked namespaces. Native bulk and original-root recovery deadlines plus project progress source histories fail.',
    130196802425: 'Whole runtime-import parent comparison exceeds original deadline.',
    130196802448: 'Bun native regeneration exceeds original 5000 ms case limit.',
    130196802484: 'safe_number root takes 1916822.436 ms against 60000 ms; original 60-minute job limit interrupts remaining work.',
    130196802488: 'Project facade and source proof history reject the physical project source; 287-case deadline audit itself passes.',
    130196802501: 'Checked source history fails; checked-source and static-lifecycle cases exceed original deadlines.',
    130196802520: 'Whole reverse ASCII case exceeds original deadline.',
    130196802563: 'Whole original Router JSON parse case exceeds original deadline.',
    130196802623: 'Whole reverse JSON scalar fold case exceeds original deadline.',
    130196802658: 'Whole reverse base64 case exceeds original deadline.',
    130235014015: 'Aggregate correctly rejects nonpassing mandatory JavaScript jobs; no Rust stage is admitted.',
}
failed = [job for job in snapshot['jobs'] if job['conclusion'] not in ('success', 'skipped')]
assert len(snapshot['jobs']) == 75 and len(failed) == len(notes) == 30
assert set(notes) == {job['databaseId'] for job in failed}
counts = Counter(job['conclusion'] for job in snapshot['jobs'])
lines = [
    '# Terminal CI cycle for f93b01795', '',
    '[PR #785](https://github.com/link-assistant/router/pull/785) remains draft.',
    '[Run 42921384009](https://github.com/link-assistant/router/actions/runs/42921384009)',
    'started 2026-11-10 23:12:18 UTC and ended 2026-11-11 00:36:31 UTC.',
    'Published head: `f93b01795a935317942adfe7d329f636dcd1848b`.',
    'Tested merge: `987fa0db2ca80765ec26cead46f28eac9c1e8f07`.',
    f'All 75 jobs are terminal: {counts["failure"]} failed, {counts["cancelled"]} cancelled,',
    f'{counts["success"]} successful and {counts["skipped"]} skipped. This task cancelled no run.', '',
    'All 30 nonpassing whole logs and all 42 terminal artifacts have been read',
    'completely, hashed and checked against their custody receipts. The table',
    'uses one-based lines in the complete decoded job logs. Deadline artifacts',
    'also expose synchronous assertion passes that violate original time limits.', '',
    '| Job | Result and observed failure | Complete log lines |',
    '| --- | --- | --- |',
]
for row in logs['records']:
    job = row['job']
    identifier = job['databaseId']
    assert row['fullReadbackVerified'] and row['validJobLog']
    with gzip.open(row['log'], 'rt') as source:
        body = source.read().splitlines()
    markers = [index for index, line in enumerate(body, 1)
               if '##[error]' in line or 'not ok ' in line
               or 'Observed ' in line and 'exceeds unchanged' in line
               or 'ENOENT' in line or 'canonical comparison' in line
               or 'Stale generated' in line or '441 draft' in line]
    assert markers
    name = job['name'].split(' / ')[-1]
    url = f'https://github.com/link-assistant/router/actions/runs/42921384009/job/{identifier}'
    lines.append(f'| [{name}]({url}) | {job["conclusion"]}: {notes[identifier]} | '
                 + ', '.join(map(str, markers)) + ' |')

lines.extend(['', 'Every independently audited production deadline breach is retained below.',
              'The intentional `synchronous overdue` auditor fixture is kept separately',
              'in the complete artifact; its expected failure is not a product regression.', '',
              '| Artifact bin | Original complete case | Observed / original limit (ms) |',
              '| --- | --- | --- |'])
for row in review['records']:
    for audit in row.get('deadlineAudits', []):
        for event in audit['durationBreachRecords']:
            if event['name'] == 'synchronous overdue':
                continue
            path = event['file'].split('/router/router/')[-1]
            lines.append(f'| {row["name"].replace("node-case-deadlines-", "")} | '
                         f'`{path}:{event["line"]}` | {event["durationMs"]} / '
                         f'{event["deadline"]["milliseconds"]} |')
lines.extend(['',
    'The full canonical artifact contains 2873 computed outputs plus its complete',
    '2657740-byte manifest. All 2874 decoded payloads (323066425 bytes) are',
    'retained in a 30020032-byte TAR/XZ with complete member readback. Its SHA256',
    'is `3590623b54b9fe990b757cbc83804bcafe57ecbf46e320d25762c38de0dbc46c`.',
    'Original ZIP and inner gzip containers were verified but are not retained;',
    'the custody receipt states that boundary explicitly. The other 41 artifacts',
    'retain their whole original ZIP containers inside XZ, with every CRC and',
    'member hash verified. These historical outputs are not installed as current.', '',
    'The published inventory has **162 executable production functions out of 2578**,',
    'with **2416 carried**. Across all 6695 top-level functions, 165 are executable.',
    'It still reports `runtimeParity: false`, 12426 carried Rust items and incomplete',
    'library method coverage. This is a published-head observation, not current',
    'working-tree freshness, a new rule gain or complete translation.', '',
    'No missing credential or human access requirement explains these failures.',
    'No mandatory check is skipped or weakened. No Rust tool was run locally and',
    'the failed same-SHA JavaScript aggregate admitted no Rust CI. Genuine current',
    'canonical, owned and profile generation, original deadlines, raw compiler',
    'source admission, strict parity, the complete local gate and universal client',
    'privacy criteria remain unfinished. Focused later passes do not replace them.', '',
    'The [complete review receipt](evidence/current-f93-terminal-review.json.gz)',
    'identifies the immutable observation packet, all original nonpassing logs,',
    'terminal metadata, full artifact custody, full canonical manifest and all',
    'failed/deadline records. Large whole artifact containers remain in local',
    '`ci-logs/issue-784-restart-2`; the packet does not claim to include them.', '',
])
target = Path('docs/case-studies/issue-784/ci-f93-terminal-20261111.md')
with target.open('x') as output:
    output.write('\n'.join(lines))
print(json.dumps(dict(path=str(target), jobs=len(failed), artifacts=42, lines=len(lines))))
