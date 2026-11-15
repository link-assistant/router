"""Restore a verified producer predecessor and author only the parser change.

The wider draft changed the public binding report and failed its original
method-owner contract. Its complete proposal and failures remain retained.
"""
import gzip
import hashlib
import json
from pathlib import Path
import subprocess

path = Path('tools/translation/project.mjs')
packed = Path('ci-logs/issue-784-restart-2/ordinary-enclosing-complete-proposal.json.gz').read_bytes()
assert hashlib.sha256(packed).hexdigest() == '9c7a70f7cab5dec927693ff5e4ef3a71de33746b3c8f58c4a56ba4c89ba7315d'
plan = json.loads(gzip.decompress(packed))
assert plan['typescriptVersion'] == '5.9.3'
assert len(plan['files']) == 1
row = plan['files'][0]
assert str(path) == row['path']
assert path.read_text() == row['after']
assert row['inverse'] == row['before']
for stage in row['stages']:
    assert json.loads(stage['beforeMeta'])['source'] == stage['before']
    assert json.loads(stage['afterMeta'])['source'] == stage['after']
before = row['selection']['ingressBoundary']['after']
assert row['selection']['ordinaryEnclosing']['inverse'] == before
original = subprocess.check_output([
    'git', 'show', '7283f934747bb46ed61766cf944b1a6c41426191:' + str(path),
], text=True)
assert before == original
profile_path = Path('tools/translation/source-profiles/ordinary-parser-enclosing-namespace/source-rules.json')
old_profile = profile_path.read_bytes()
assert hashlib.sha256(old_profile).hexdigest() == '66f2764b80638425f39db9ac5dd92f665a2ef01fe89e3d7a72e30f6c66b4e1aa'
profile = json.loads(old_profile)
after = before
for edit in profile['edits']:
    assert after.count(edit['before']) == 1
    after = after.replace(edit['before'], edit['after'])
inverse = after
for edit in reversed(profile['edits']):
    assert inverse.count(edit['after']) == 1
    inverse = inverse.replace(edit['after'], edit['before'])
assert inverse == before
sha = lambda text: hashlib.sha256(text.encode()).hexdigest()
profile.update(beforeSha256=sha(before), afterSha256=sha(after))
raw = (json.dumps(profile, ensure_ascii=False, indent=2) + '\n').encode()
assert path.read_text() == row['after'] and profile_path.read_bytes() == old_profile
# Replay the complete already checked generated predecessor, with no text
# editing of the generated module. The real producer installs the new output.
path.write_text(before)
profile_path.write_bytes(raw)
print(json.dumps(dict(profile=str(profile_path), bytes=len(raw),
                      sha256=hashlib.sha256(raw).hexdigest(),
                      restoredPredecessorSha256=sha(before),
                      afterSha256=sha(after), rejectedPublicReportChange=True)))
