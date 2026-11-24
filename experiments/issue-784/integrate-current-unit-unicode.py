"""Join current callers while retaining historical producer APIs and cases."""
from pathlib import Path

changes = {}


def edit(name, before, after):
    path = Path(name)
    text = changes.get(path, path.read_text())
    if text.count(before) != 1:
        raise RuntimeError('Unique source anchor required: ' + name + ': ' + before)
    changes[path] = text.replace(before, after)


base = 'tools/translation/'
for name in ['prepare-core-ascii-sources.mjs', 'prepare-source-proof-preservation.mjs',
             'prepare-executable-checked-source.mjs', 'prepare-source-lifetime-refusal-batches.mjs',
             'prepare-primitive-identity-boundary.mjs']:
    edit(base + name, "import {composeCoreUnitMatches} from './prepare-core-unit-matches.mjs';",
         "import {composeCurrentCoreUnitMatches as composeCoreUnitMatches} from './prepare-current-core-unit-unicode.mjs';")
edit(base + 'prepare-core-matches-sources.mjs',
     "import {composeCoreUnitMatches,prepareCoreUnitMatches} from './prepare-core-unit-matches.mjs';",
     "import {prepareCoreUnitMatches} from './prepare-core-unit-matches.mjs';\nimport {composeCurrentCoreUnitMatches as composeCoreUnitMatches} from './prepare-current-core-unit-unicode.mjs';")
edit(base + 'prepare-core-vector-sources.mjs',
     "(await import('./prepare-core-unit-matches.mjs')).composeCoreUnitMatches(base.sources, {root})",
     "(await import('./prepare-current-core-unit-unicode.mjs')).composeCurrentCoreUnitMatches(base.sources, {root})")

indices = {'router-core-ascii': (1, 2), 'source-proof-preservation': (1, 3),
           'router-core-matches': (6, 9), 'executable-checked-source': (6, 10),
           'source-lifetime-refusal-batches': (7, 11), 'primitive-identity-boundary': (5, 8)}
for name, (unit_index, length) in indices.items():
    filename = base + 'test/' + name + '.test.mjs'
    path = Path(filename)
    text = path.read_text()
    # Shift only explicit current-layer indices/counts. No case, assertion or
    # original declared deadline is removed, selected out or raised.
    import re
    text = re.sub(r'current\.layers\[(\d+)\]', lambda m: 'current.layers[' +
                  str(int(m[1]) + (int(m[1]) > unit_index)) + ']', text)
    text = re.sub(r'current\.layers\.slice\(0,(\d+)\)', lambda m: 'current.layers.slice(0,' +
                  str(int(m[1]) + (int(m[1]) > unit_index)) + ')', text)
    old = 'assert.equal(current.layers.length,' + str(length) + ')'
    if text.count(old) != 1:
        raise RuntimeError('Unique complete layer count required: ' + filename)
    text = text.replace(old, 'assert.equal(current.layers.length,' + str(length + 1) + ')')
    old = 'assert.equal(current.layers.slice(0,-1).length,' + str(length - 1) + ')'
    if old in text:
        text = text.replace(old, 'assert.equal(current.layers.slice(0,-1).length,' + str(length) + ')')
    text = "import {assertCurrentCoreUnicodeSourceComposition} from './current-unit-unicode-source-composition.mjs';\n" + text
    marker = 'assertUnitMatchesSourceComposition(current.layers[' + str(unit_index) + ']'
    start = text.index(marker)
    end = text.index(';', start) + 1
    extra = ('\n assertCurrentCoreUnicodeSourceComposition(current.layers[' + str(unit_index + 1) +
             '],Object.fromEntries(current.layers.slice(0,' + str(unit_index + 1) +
             ').flatMap(layer=>layer.files.map(row=>[row.path,row]))),finalSources);')
    changes[path] = text[:end] + extra + text[end:]

filename = base + 'test/router-core-vectors.test.mjs'
edit(filename, "import {composeCoreUnitMatches} from '../prepare-core-unit-matches.mjs';",
     "import {composeCurrentCoreUnitMatches as composeCoreUnitMatches} from '../prepare-current-core-unit-unicode.mjs';\nimport {assertCurrentCoreUnicodeSourceComposition} from './current-unit-unicode-source-composition.mjs';")
edit(filename, '  assertUnitMatchesSourceComposition(unit.layers[0], base.sources, facades.sources);',
     '  assertUnitMatchesSourceComposition(unit.layers[0], base.sources, facades.sources);\n  assert.equal(unit.layers.length,2);assertCurrentCoreUnicodeSourceComposition(unit.layers[1], {...base.sources,...Object.fromEntries(unit.layers[0].files.map(row=>[row.path,row]))}, facades.sources);')

filename = base + 'test/router-core-unicode-predicates.test.mjs'
edit(filename, "import {prepareCoreUnicodePredicates,composeCoreUnicodePredicates} from '../prepare-core-unicode-predicates.mjs';",
     "import {composeCoreUnicodePredicates} from '../prepare-core-unicode-predicates.mjs';\nimport {prepareCurrentCoreUnitUnicode} from '../prepare-current-core-unit-unicode.mjs';\nimport {assertCurrentCoreUnicodeSourceComposition} from './current-unit-unicode-source-composition.mjs';\nimport {assertUnitMatchesSourceComposition} from './unit-matches-source-composition.mjs';")
edit(filename, ' const plan=prepareCoreUnicodePredicates();assert.equal(plan.files.length,8);',
     ' const current=prepareCurrentCoreUnitUnicode(),plan=current.layers[1].originalUnicodePlan,finalSources=current.sources;assert.equal(current.layers.length,2);assertUnitMatchesSourceComposition(current.layers[0],{},finalSources);assertCurrentCoreUnicodeSourceComposition(current.layers[1],Object.fromEntries(current.layers[0].files.map(row=>[row.path,row])),finalSources);assert.equal(plan.files.length,8);')
edit(filename, 'assert.equal(row.current,row.after,row.path);',
     'assert.equal(row.current,finalSources[row.path].after,row.path);')

filename = base + 'test/router-core-unit-matches.test.mjs'
edit(filename, "import {prepareCoreUnitMatches,composeCoreUnitMatches} from '../prepare-core-unit-matches.mjs';",
     "import {composeCoreUnitMatches} from '../prepare-core-unit-matches.mjs';\nimport {prepareCurrentCoreUnitUnicode} from '../prepare-current-core-unit-unicode.mjs';\nimport {assertCurrentCoreUnicodeSourceComposition,currentCoreApplicationSourceEquations,currentCoreApplicationSource} from './current-unit-unicode-source-composition.mjs';")
edit(filename, ' const plan=prepareCoreUnitMatches();assert.equal(plan.files.length,7);',
     ' const current=prepareCurrentCoreUnitUnicode(),plan=current.layers[0],finalSources=current.sources;assert.equal(current.layers.length,2);assertCurrentCoreUnicodeSourceComposition(current.layers[1],Object.fromEntries(plan.files.map(row=>[row.path,row])),finalSources);assert.equal(plan.files.length,7);')
edit(filename, 'assert.equal(row.current,row.after,row.path);',
     'assert.equal(row.current,finalSources[row.path].after,row.path);')
edit(filename, 'function physicalApplication(packet){', 'function physicalApplication(packet,equations){')
edit(filename, "row.path==='rust/src/translation_core.rs'?ROUTER_FORMATTING_FACADE_SOURCE:row.source",
     'currentCoreApplicationSource(row,equations)')
edit(filename, " const packet=application();assert.equal(packet.files.length,567);",
     " const packet=application(),equations=currentCoreApplicationSourceEquations();assert.equal(packet.files.length,567);")
old = "for(const row of packet.files){assert.equal(hash(row.source),row.sha256);const physical=readFileSync(new URL(row.path,root),'utf8');if(row.path==='rust/src/translation_core.rs'){assert.equal(physical,ROUTER_FORMATTING_FACADE_SOURCE);assert.equal(physical,row.source+'\\n/// Test checked Copy/no-Drop unit-enum constructors; library internals stay native.\\npub use crate::__router_translation_core_matches as matches_unit;\\n');}else assert.equal(physical,row.source,row.path);}"
new = "for(const row of packet.files){assert.equal(hash(row.source),row.sha256);const physical=readFileSync(new URL(row.path,root),'utf8');assert.equal(physical,currentCoreApplicationSource(row,equations),row.path);if(row.path==='rust/src/translation_core.rs')assert.equal(physical,ROUTER_FORMATTING_FACADE_SOURCE);if(row.path==='rust/src/translation_core/primitives.rs')assert.equal(physical,ROUTER_CORE_PRIMITIVES_SOURCE);}"
edit(filename, old, new)
edit(filename, ' const packet=application(),profile=PRODUCTION_PROFILE,archive=createUnitMatchesDataArchive();',
     ' const packet=application(),equations=currentCoreApplicationSourceEquations(),profile=PRODUCTION_PROFILE,archive=createUnitMatchesDataArchive();')
path = Path(filename)
text = changes[path]
if text.count('physicalApplication(packet);') != 4:
    raise RuntimeError('Every physical application join must remain required')
changes[path] = text.replace('physicalApplication(packet);','physicalApplication(packet,equations);')
edit(filename, " original['src/translation_core.rs']=ROUTER_FORMATTING_FACADE_SOURCE;",
     " original['src/translation_core.rs']=ROUTER_FORMATTING_FACADE_SOURCE;\n original['src/translation_core/primitives.rs']=ROUTER_CORE_PRIMITIVES_SOURCE;\n archive.retain('complete-current-owned-core-source-equations',equations);")

for path, after in changes.items():
    if len(after.splitlines()) >= 1000:
        raise RuntimeError('Source line bound: ' + str(path))
for path, after in changes.items():
    path.write_text(after)
    print(path)
