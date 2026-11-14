"""Capture full current issue, PR and published-head CI feedback without overwrite."""
import base64
import argparse
from datetime import datetime, timezone
import gzip
import hashlib
import json
from pathlib import Path
import subprocess

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--label', default='current-alias-checkpoint')
parser.add_argument('--published-head', default='17c7dd9942814f2a6a17eee135016e5941f04f15')
args = parser.parse_args()
assert args.label.isascii() and all(char.isalnum() or char == '-' for char in args.label)
assert len(args.published_head) == 40 and all(char in '0123456789abcdef' for char in args.published_head)
target = Path('docs/case-studies/issue-784/evidence/' + args.label + '-feedback.json.gz')
assert not target.exists()
queries = {
    'issue': ['gh', 'issue', 'view', 'https://github.com/link-assistant/router/issues/784',
              '--json', 'number,title,body,url,state,comments,updatedAt'],
    'pr': ['gh', 'pr', 'view', '785', '--repo', 'link-assistant/router', '--json',
           'number,title,body,url,state,isDraft,baseRefName,baseRefOid,headRefName,headRefOid,updatedAt,mergeable'],
    'recent-runs': ['gh', 'run', 'list', '--repo', 'link-assistant/router', '--branch',
                    'issue-784-1f6838f56841', '--limit', '5', '--json',
                    'databaseId,conclusion,createdAt,headSha'],
}
for label, endpoint in {
        'issue-comments': 'issues/784/comments', 'pr-conversation': 'issues/785/comments',
        'pr-inline': 'pulls/785/comments', 'pr-reviews': 'pulls/785/reviews',
        'sub-issues': 'issues/784/sub_issues',
        'published-head-runs': 'actions/runs?head_sha=' + args.published_head + '&per_page=100',
}.items():
    queries[label] = ['gh', 'api', 'repos/link-assistant/router/' + endpoint, '--paginate', '--slurp']
members = []
for label, command in queries.items():
    raw = subprocess.check_output(command)
    json.loads(raw)
    members.append({'path': label + '.json', 'command': command, 'bytes': len(raw),
                    'sha256': hashlib.sha256(raw).hexdigest(),
                    'base64': base64.b64encode(raw).decode()})
head = subprocess.check_output(['git', 'rev-parse', 'HEAD'], text=True).strip()
main = subprocess.check_output(['git', 'rev-parse', 'origin/main'], text=True).strip()
subprocess.run(['git', 'merge-base', '--is-ancestor', 'origin/main', 'HEAD'], check=True)
packet = {'schema': 'complete-alias-checkpoint-feedback-v1',
          'checkedAt': datetime.now(timezone.utc).isoformat(), 'localHead': head,
          'fetchedMain': main, 'mainIsAncestor': True, 'members': members,
          'fullGateQualified': False}
raw = json.dumps(packet, separators=(',', ':')).encode() + b'\n'
packed = gzip.compress(raw, mtime=0)
assert len(packed) < 100000
with target.open('xb') as output:
    output.write(packed)
assert gzip.decompress(target.read_bytes()) == raw
for row in json.loads(gzip.decompress(target.read_bytes()))['members']:
    restored = base64.b64decode(row['base64'], validate=True)
    assert len(restored) == row['bytes'] and hashlib.sha256(restored).hexdigest() == row['sha256']
print(json.dumps({'path': str(target), 'bytes': len(packed), 'sha256': hashlib.sha256(packed).hexdigest(),
                  'checkedAt': packet['checkedAt'], 'localHead': head, 'fetchedMain': main}))
