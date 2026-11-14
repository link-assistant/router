#!/usr/bin/env python3
"""Run the existing complete Node source-DATA child with a lower heap only."""
import hashlib
import json
import os
from pathlib import Path
import sys

arguments = sys.argv[1:]
assert len(arguments) == 4
assert arguments[:3] == ['--max-old-space-size=512', '--input-type=module', '--eval']
source = arguments[3]
assert "if(process.versions.bun)throw TypeError('Node source DATA requires Node')" in source
node = Path(__file__).resolve().parent / 'toolchain/node20/bin/node'
print(json.dumps({'schema': 'lower-node-source-data-heap-diagnostic-v1',
                  'originalArgumentsPrefix': arguments[:3], 'evalBytes': len(source.encode()),
                  'evalSha256': hashlib.sha256(source.encode()).hexdigest(),
                  'beforeOldSpaceMiB': 512, 'afterOldSpaceMiB': 320,
                  'completeEvalSourcePreserved': True}), file=sys.stderr, flush=True)
os.execv(str(node), [str(node), '--max-old-space-size=320', *arguments[1:]])
