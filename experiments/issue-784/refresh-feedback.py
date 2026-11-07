"""Preserve every GitHub feedback type and explicit child issue at final review."""
import json
import subprocess
from datetime import datetime, timezone
from pathlib import Path

root = Path('docs/case-studies/issue-784/raw')
queries = {
    'refreshed-issue-comments': 'issues/784/comments',
    'refreshed-pr-comments': 'issues/785/comments',
    'refreshed-pr-inline-comments': 'pulls/785/comments',
    'refreshed-pr-reviews': 'pulls/785/reviews',
    'refreshed-sub-issues': 'issues/784/sub_issues',
}
rows = []
for label, endpoint in queries.items():
    raw = subprocess.check_output(['gh', 'api', 'repos/link-assistant/router/' + endpoint,
                                   '--paginate', '--slurp'])
    pages = json.loads(raw)
    values = [row for page in pages for row in page]
    path = root / (label + '.json')
    path.write_text(json.dumps(values, indent=2) + '\n')
    rows.append({'path': str(path), 'count': len(values)})
receipt = {'checkedAt': datetime.now(timezone.utc).isoformat(), 'completeLists': rows}
(root / 'feedback-refresh.json').write_text(json.dumps(receipt, indent=2) + '\n')
print(json.dumps(receipt))
