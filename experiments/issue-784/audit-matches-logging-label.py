"""Correct an old diagnostic label against all complete original packet bytes."""
import base64
import gzip
import hashlib
import json
from pathlib import Path

source = Path('docs/case-studies/issue-784/evidence/current-default-matches-attempt.json.gz')
packed = source.read_bytes()
raw = gzip.decompress(packed)
packet = json.loads(raw)
rows = []
test_source = None
for row in packet['members']:
    member = base64.b64decode(row['base64'], validate=True)
    assert len(member) == row['bytes']
    assert hashlib.sha256(member).hexdigest() == row['sha256']
    rows.append({key: row[key] for key in ['path', 'bytes', 'sha256']})
    if row['path'] == 'tools/translation/test/router-core-matches.test.mjs':
        test_source = member
assert len(rows) == 11 and test_source is not None
assert test_source == Path('tools/translation/test/router-core-matches.test.mjs').read_bytes()
assert b"const evidence = process.env.ROUTER_CORE_MATCHES_EVIDENCE_DIR ?? mkdtempSync" in test_source
assert b"finally { mkdirSync(evidence, {recursive: true}); writeFileSync" in test_source
assert b'JSON.stringify({name, vectors}' in test_source
assert packet['optionalFullVectorLoggingEnabled'] is False
record = {'schema': 'complete-matches-logging-label-correction-v1',
          'originalPacket': str(source), 'originalPacketBytes': len(packed),
          'originalPacketSha256': hashlib.sha256(packed).hexdigest(),
          'originalDecodedSha256': hashlib.sha256(raw).hexdigest(),
          'originalPacketUnchanged': True, 'verifiedCompleteMembers': rows,
          'fullTestSourceBase64': base64.b64encode(test_source).decode(),
          'fullEvidenceLoggingEnabled': True,
          'originalDisabledLabelWasIncorrect': True,
          'loggingExcludedAsNecessaryCause': False,
          'exactSerializationCallSiteKnown': False, 'receivingPassed': False,
          'auditSourceBase64': base64.b64encode(Path(__file__).read_bytes()).decode()}
target = Path('docs/case-studies/issue-784/evidence/current-matches-logging-label.json.gz')
data = json.dumps(record, separators=(',', ':')).encode()
with target.open('xb') as output:
    output.write(gzip.compress(data, mtime=0))
assert gzip.decompress(target.read_bytes()) == data
print(json.dumps({'verifiedMembers': len(rows), 'originalLabelLoggingEnabled': False,
                  'actualFullEvidenceLoggingEnabled': True, 'packet': str(target),
                  'exactCallSiteKnown': False}))
