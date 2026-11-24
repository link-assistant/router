#!/usr/bin/env python3
"""Draft fresh path membership after a conditional proof without installing it.

The previous index is still retired before the original JSON comparison. A
later resolved declaration can qualify current paths and bindings from scratch.
This script records complete source bytes; it supplies no performance, source
authority, parity, or receiving-test evidence.
"""
from pathlib import Path
import gzip
import hashlib
import json


def digest(data):
    return hashlib.sha256(data).hexdigest()


subject = Path('tools/translation/derive-footprints.mjs')
original = subject.read_bytes()
source = original.decode('utf-8')
before = """// This index lives only between requested-closure construction and the first
// missing/unresolved module. No source hashing or caller callback runs in that
// interval. A miss retires it before the old conditional-proof JSON walk."""
after = """// Each index lives only until a missing/unresolved module. A miss retires it
// before the original conditional-proof JSON walk. A later resolved query may
// qualify current paths and bindings again; it never revives the old snapshot."""
assert source.count(before) == 1
source = source.replace(before, after)
before_query = """            const present=modulePaths?modulePaths.has(JSON.stringify(binding.target)):modules.some(module=>JSON.stringify(['crate',...module.path])===JSON.stringify(binding.target));"""
after_query = """            // The intervening proof comparison can mutate caller-owned paths.
            // Re-enter only through complete fresh native/data qualification.
            modulePaths??=standardModulePathIndex(modules,ancestors);
            const present=modulePaths?modulePaths.has(JSON.stringify(binding.target)):modules.some(module=>JSON.stringify(['crate',...module.path])===JSON.stringify(binding.target));"""
assert source.count(before_query) == 1
source = source.replace(before_query, after_query)
assert source.replace(after_query, before_query).replace(after, before).encode() == original
prefix = Path('ci-logs/issue-784-restart-2/current-derive-path-index-reentry')
candidate = source.encode('utf-8')
record = {'schema': 'derive-module-path-reentry-draft-v1',
          'subject': str(subject), 'beforeSha256': digest(original),
          'afterSha256': digest(candidate), 'before': original.decode(),
          'after': source, 'installed': False, 'receivingChecksRun': False,
          'performanceQualification': False, 'newExecutableFunctions': 0}
candidate_path = prefix.with_suffix('.mjs')
record_path = prefix.with_suffix('.json.gz')
with candidate_path.open('xb') as output:
    output.write(candidate)
with record_path.open('xb') as output:
    output.write(gzip.compress(json.dumps(record).encode(), mtime=0))
assert candidate_path.read_bytes() == candidate
assert json.loads(gzip.decompress(record_path.read_bytes())) == record
print(json.dumps({key: record[key] for key in
                  ('subject', 'beforeSha256', 'afterSha256', 'installed',
                   'receivingChecksRun', 'newExecutableFunctions')}))
