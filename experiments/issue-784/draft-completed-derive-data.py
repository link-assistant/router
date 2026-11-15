"""Draft bounded immutable DATA reuse; no source/proof authority or installation."""
import gzip
import hashlib
import json
from pathlib import Path
import re


def digest(value):
    return hashlib.sha256(value.encode()).hexdigest()


base = Path('tools/translation')
files = []
for name in ['source-module-views.mjs', 'derive-footprints.mjs']:
    path = base / name
    before = path.read_text()
    edits = [dict(id='completed-derive-data:import-' + name,
                  before="import {createHash" if name == 'source-module-views.mjs'
                  else "import {createHash,Hash}",
                  after="import {createCompletedDataFreezer} from './private-data-freeze.mjs';\n"
                  + ("import {createHash" if name == 'source-module-views.mjs'
                     else "import {createHash,Hash}"))]
    if name == 'source-module-views.mjs':
        old = """  // These fresh native lexer records contain only four scalar token fields.
  // Customized operations retain the complete original recursive freeze route.
  for(const item of items){
    for(const token of item.tokens)Object.freeze(token);
    Object.freeze(item.tokens);Object.freeze(item);
  }
  return Object.freeze(items);
}"""
        new = """  // Register only bounded, completed immutable DATA costs. The original
  // native loop below remains the fallback; source and semantic joins stay fresh.
  return freezeCompletedItems(items);
}
const freezeCompletedItems=createCompletedDataFreezer(items=>{
  for(const item of items){
    for(const token of item.tokens)Object.freeze(token);
    Object.freeze(item.tokens);Object.freeze(item);
  }
  return Object.freeze(items);
});"""
        edits.append(dict(id='completed-derive-data:retain-original-item-fallback',
                          before=old, after=new))
    else:
        anchor="const contexts=new WeakMap()"
        edits.append(dict(id='completed-derive-data:retain-original-recursive-freezer',
                          before=anchor,
                          after='const freezeCompleted=createCompletedDataFreezer(freeze);\n' + anchor))
        for at, line in enumerate(before.splitlines()):
            if 'freeze(' not in line or line.startswith('const freeze='):
                continue
            after = re.sub(r'(?<![\w.])freeze\(', 'freezeCompleted(', line)
            if after != line:
                edits.append(dict(id='completed-derive-data:consumer-' + str(at + 1),
                                  before=line, after=after))
    after = before
    for edit in edits:
        assert after.count(edit['before']) == 1, edit['id']
        after = after.replace(edit['before'], edit['after'])
    inverse = after
    for edit in reversed(edits):
        assert inverse.count(edit['after']) == 1, edit['id']
        inverse = inverse.replace(edit['after'], edit['before'])
    assert inverse == before and len(after.splitlines()) < 1000
    files.append(dict(path=str(path), before=before, after=after,
                      beforeSha256=digest(before), afterSha256=digest(after), edits=edits))
record = dict(schema='completed-derive-data-draft-v1', files=files,
              phases=['language', 'repository'], installed=False,
              sourceAuthority=False, semanticAuthority=False, runtimeAuthority=False,
              productionExecutableGain=0, deadlineQualified=False)
raw = json.dumps(record, separators=(',', ':')).encode()
out = Path('ci-logs/issue-784-restart-2/completed-derive-data-source-draft.json.gz')
with out.open('xb') as target:
    target.write(gzip.compress(raw, mtime=0))
assert gzip.decompress(out.read_bytes()) == raw
print(json.dumps(dict(path=str(out), sha256=hashlib.sha256(raw).hexdigest(),
                     files=[dict(path=r['path'], edits=len(r['edits']),
                                 before=r['beforeSha256'], after=r['afterSha256']) for r in files])))
