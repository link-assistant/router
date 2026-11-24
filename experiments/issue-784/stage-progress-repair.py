"""Stage authored namespace repair inputs without touching the running compiler.

The packet contains source DATA only. Its receiving producer must perform the
two fixed phases, full CST inverse, and independent native checks before any
derived source is installed. --install installs reviewed author inputs only.
"""
import argparse
import gzip
import hashlib
import json
from pathlib import Path
import subprocess

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--install', action='store_true')
args = parser.parse_args()
root = Path.cwd()
hash_bytes = lambda value: hashlib.sha256(value).hexdigest()
hash_text = lambda value: hash_bytes(value.encode())
base = 'tools/translation/'
staged = {}

def put(path, value):
    assert path not in staged
    raw = value.encode() if isinstance(value, str) else value
    current = (root / path).read_bytes() if (root / path).exists() else None
    staged[path] = dict(before=current, after=raw)

draft = json.loads(gzip.decompress((root / 'ci-logs/issue-784-restart-2/namespace-observer-draft.json.gz').read_bytes()))
profile_root = base + 'source-profiles/namespace-progress-observer/'
sources = []
for at, row in enumerate(draft['files']):
    assert (root / row['path']).read_text() == row['before']
    rules = (json.dumps(row['profile'], indent=2) + '\n').encode()
    archive = gzip.compress(row['before'].encode(), mtime=0)
    rules_name, archive_name = f'{at}-rules.json', f'{at}-original.mjs.gz'
    put(profile_root + rules_name, rules)
    put(profile_root + archive_name, archive)
    sources.append(dict(path=row['path'], archive=archive_name,
        archiveBytes=len(archive), archiveSha256=hash_bytes(archive),
        bytes=len(row['before'].encode()), sha256=hash_text(row['before']),
        rules=rules_name, rulesSha256=hash_bytes(rules)))
manifest = (json.dumps(dict(schema='namespace-progress-observer-originals-v1',
    revision='08554e93489cbd2df7786898cb60bb3bab5e169f', sources=sources), indent=2) + '\n').encode()
put(profile_root + 'manifest.json', manifest)
producer = '''// Authored diagnostic source DATA. Ordinary callback observations stay exact.
import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {ownershipCompiler} from './js-to-rust/vendor/module-syntax.mjs';
import {derivePinnedRepositorySourceEvolution} from './pinned-repository-source-evolution.mjs';
import {transportConcreteSourcePhases} from './concrete-sequential-equations.mjs';
import {verifyNativeCopiedModuleBindings} from './source-copy-native-bindings.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const PROFILE=new URL('./source-profiles/namespace-progress-observer/',import.meta.url);
const MANIFEST='@MANIFEST@';
const hash=value=>createHash('sha256').update(value).digest('hex');
const fail=message=>{throw new TypeError('Namespace observer source: '+message);};
export function prepareNamespaceProgressObserver({root=ROOT}={}){
 root=resolve(root);const manifestBytes=readFileSync(new URL('manifest.json',PROFILE));
 if(hash(manifestBytes)!==MANIFEST)fail('complete original manifest differs');
 const manifest=JSON.parse(manifestBytes),ts=ownershipCompiler(),files=[],inputs=[];
 if(manifest.schema!=='namespace-progress-observer-originals-v1'||manifest.sources.length!==2)
  fail('complete original source universe differs');
 for(const input of manifest.sources){
  const packed=readFileSync(new URL(input.archive,PROFILE));
  if(packed.length!==input.archiveBytes||hash(packed)!==input.archiveSha256)
   fail('complete original archive differs');
  const bytes=gunzipSync(packed,{maxOutputLength:262144});
  if(bytes.length!==input.bytes||hash(bytes)!==input.sha256)fail('complete original bytes differ');
  const before=new TextDecoder('utf8',{fatal:true,ignoreBOM:true}).decode(bytes);
  if(hash(before)!==input.sha256)fail('complete original Unicode differs');
  const evolution=derivePinnedRepositorySourceEvolution(ts,{path:input.path,source:before,
   profile:new URL(input.rules,PROFILE),profileSha256:input.rulesSha256});
  const after=evolution.after,current=readFileSync(resolve(root,input.path),'utf8');
  if(current!==before&&current!==after)fail('physical source is outside complete source equation');
  const [equation]=transportConcreteSourcePhases([{before,middle:before,after,language:'JavaScript'}]);
  if(evolution.inverse!==before||equation.before!==before||equation.after!==after
   ||equation.inverse!==before)fail('complete source/CST inverse differs');
  files.push({path:input.path,before,after,current,beforeSha256:hash(before),
   afterSha256:hash(after),evolution,equation});inputs.push({input,packed});
 }
 const bindings=verifyNativeCopiedModuleBindings(ts,files.map(row=>({
  path:resolve(root,row.path),source:row.after})));
 for(const [at,row]of files.entries()){
  row.nativeBindings=bindings[at];const {input,packed}=inputs[at];
  if(readFileSync(resolve(root,row.path),'utf8')!==row.current
   ||!readFileSync(new URL(input.archive,PROFILE)).equals(packed)
   ||hash(readFileSync(new URL(input.rules,PROFILE)))!==input.rulesSha256)
   fail('complete source input changed across native boundary');
 }
 if(!readFileSync(new URL('manifest.json',PROFILE)).equals(manifestBytes))fail('manifest changed');
 return {schema:'namespace-progress-observer-source-v1',typescriptVersion:ts.version,files,
  sourceAuthority:false,semanticAuthority:false,runtimeAuthority:false,productionExecutableGain:0};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const [mode,...rest]=process.argv.slice(2);
 if(rest.length||!['--write','--check'].includes(mode))fail('use --write|--check');
 const plan=prepareNamespaceProgressObserver();
 for(const row of plan.files)if(readFileSync(resolve(ROOT,row.path),'utf8')!==row.current)
  fail('physical source changed before installation');
 for(const row of plan.files){
  if(mode==='--write')writeFileSync(resolve(ROOT,row.path),row.after);
  else if(row.current!==row.after)fail('complete derived source is stale');
 }
 console.log(JSON.stringify({schema:plan.schema,typescriptVersion:plan.typescriptVersion,
  files:plan.files.map(row=>({path:row.path,sha256:row.afterSha256})),semanticAuthority:false}));
}
'''.replace('@MANIFEST@', hash_bytes(manifest))
put(base + 'prepare-namespace-progress-observer.mjs', producer)

# Preserve the complete fixture predecessor from Git, rather than accepting an
# arbitrary current test source. The two edits only adapt its comparison reader.
fixture_path = base + 'test/core-adoption-progress.test.mjs'
fixture_before = subprocess.run(['git', 'show', 'f05961a5c^:' + fixture_path],
    check=True, capture_output=True).stdout.decode()
fixture_after = (root / fixture_path).read_text()
edits = [
    dict(id='router.project-progress-history-import.v1', before="import {restoreReceivingSourceHistory} from './fixtures/current-receiving-source-history.mjs';",
         after="import {restoreProjectProgressSourceHistory} from './project-progress-source-history.mjs';\nimport {restoreReceivingSourceHistory} from './fixtures/current-receiving-source-history.mjs';"),
    dict(id='router.project-progress-history-branch.v1', before='function progressLayoutHistory(path,source){',
         after="function progressLayoutHistory(path,source){\n if(path==='tools/translation/project.mjs')return restoreProjectProgressSourceHistory(source,retain);"),
]
replayed = fixture_before
for edit in edits:
    assert replayed.count(edit['before']) == 1
    replayed = replayed.replace(edit['before'], edit['after'], 1)
assert replayed == fixture_after
fixture_profile = dict(schema='pinned-repository-source-evolution-v1', path=fixture_path,
    phase='repository', beforeSha256=hash_text(fixture_before), afterSha256=hash_text(fixture_after),
    edits=edits, sourceAuthority=False, semanticAuthority=False, runtimeAuthority=False, productionExecutableGain=0)
fixture_rules = (json.dumps(fixture_profile, indent=2) + '\n').encode()
put(base + 'source-profiles/project-progress-receiving/source-rules.json', fixture_rules)
put(base + 'source-profiles/project-progress-receiving/original.mjs.gz', gzip.compress(fixture_before.encode(), mtime=0))

def edit_source(path, edits):
    source = (root / path).read_text()
    for old, new in edits:
        assert source.count(old) == 1, (path, old[:100])
        source = source.replace(old, new, 1)
    put(path, source)

edit_source(base + 'translation-progress.mjs', [
    ("const stages=new Set(", """// Namespace details are an explicit diagnostic observer contract. Keep this
// registry private and use its captured operations; ordinary callbacks retain
// their original sequence even if the public WeakSet prototype later changes.
const namespaceObservers=new WeakSet(),observerAdd=WeakSet.prototype.add;
const observerHas=WeakSet.prototype.has,observerApply=Reflect.apply;
export function namespaceProgressObserver(callback){
  if(typeof callback!=='function')throw new TypeError('Namespace progress requires a callback');
  const observer=record=>callback(record);
  observerApply(observerAdd,namespaceObservers,[observer]);
  return observer;
}
export function namespaceProgressRequested(callback){
  return observerApply(observerHas,namespaceObservers,[callback]);
}
const stages=new Set("""),
])
edit_source(base + 'prepare-project-facade-retention.mjs', [
    (' const after=namespaceComposition.after;', """ const namespaceObserver=derivePinnedRepositorySourceEvolution(ts,{
  profile:new URL('./source-profiles/namespace-progress-observer/0-rules.json',import.meta.url),
  profileSha256:'@PROJECT_RULES@',path:PATH,source:namespaceComposition.after,
 });
 const after=namespaceObserver.after;""".replace('@PROJECT_RULES@',sources[0]['rulesSha256'])),
    ("if(namespaceComposition.inverse!==previousAfter)", "if(namespaceObserver.inverse!==namespaceComposition.after||namespaceComposition.inverse!==previousAfter)"),
    ('methodOwnerScope,namespaceComposition},current=', 'methodOwnerScope,namespaceComposition,namespaceObserver},current='),
    ('current!==previousAfter&&current!==after', 'current!==previousAfter&&current!==namespaceComposition.after&&current!==after'),
])
history = '''// Historical comparison DATA only; actual graph behavior stays independently tested.
import {readFileSync,lstatSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {ownershipCompiler} from '../js-to-rust/vendor/module-syntax.mjs';
import {derivePinnedRepositorySourceEvolution} from '../pinned-repository-source-evolution.mjs';
import {transportConcreteNamedSourcePhases} from '../concrete-source-origin-phases.mjs';
const path='tools/translation/project.mjs';
const profiles=[
 {url:new URL('../source-profiles/project-namespace-composition/source-rules.json',import.meta.url),
  sha256:'67fe9db0a517b6050ff9117a59c427ba880272e93a9fa90417ad61affcd74730'},
 {url:new URL('../source-profiles/namespace-progress-observer/0-rules.json',import.meta.url),
  sha256:'@PROJECT_RULES@'},
];
const hash=value=>createHash('sha256').update(value).digest('hex');
const fail=message=>{throw new TypeError('Project progress source history: '+message);};
export function restoreProjectProgressSourceHistory(source,retain=()=>{}){
 if(typeof source!=='string'||Buffer.byteLength(source)>262144||typeof retain!=='function')
  fail('bounded complete primitive source and callback required');
 const inputs=profiles.map(row=>{
  const state=lstatSync(row.url);
  if(!state.isFile()||state.isSymbolicLink()||state.size>131072)
   fail('bounded ordinary authored profile required');
  const bytes=readFileSync(row.url);
  if(bytes.length!==state.size||hash(bytes)!==row.sha256)fail('complete authored profile differs');
  return {...row,bytes,input:JSON.parse(bytes)};
 });
 if(hash(source)!==inputs.at(-1).input.afterSha256)fail('unregistered complete current project source');
 let before=source;
 for(const {input}of [...inputs].reverse()){
  if(hash(before)!==input.afterSha256)fail('complete source history boundary differs');
  for(const edit of [...input.edits].reverse()){
   if(before.split(edit.after).length!==2)fail('complete inverse anchor differs');
   before=before.replace(edit.after,()=>edit.before);
  }
  if(hash(before)!==input.beforeSha256)fail('complete source predecessor differs');
 }
 const ts=ownershipCompiler(),layers=[];let after=before;
 for(const row of inputs){
  const layer=derivePinnedRepositorySourceEvolution(ts,{
   profile:row.url,profileSha256:row.sha256,path,source:after});
  if(layer.inverse!==after)fail('complete source layer inverse differs');
  layers.push(layer);after=layer.after;
 }
 if(after!==source)fail('complete forward replay differs');
 const proof={before,after,inverse:before,layers,sourceAuthority:false,
  semanticAuthority:false,runtimeAuthority:false,productionExecutableGain:0};
 const [equation]=transportConcreteNamedSourcePhases([{before,middle:before,
  after:source,language:'JavaScript',rules:['javascript:retain-complete-progress-predecessor',
   'router:join-complete-project-namespace-successor','javascript:restore-complete-progress-predecessor',
   'router:restore-complete-progress-predecessor']}]);
 if(equation.before!==before||equation.after!==source||equation.inverse!==before)
  fail('complete serialized concrete syntax equation differs');
 for(const row of inputs)if(!readFileSync(row.url).equals(row.bytes))
  fail('authored profile changed during derivation');
 retain('complete-project-progress-receiving-history',{path,current:source,historical:before,
  proof,equation,sourceAuthority:false,semanticAuthority:false,runtimeAuthority:false,
  productionExecutableGain:0});
 return before;
}
'''.replace('@PROJECT_RULES@',sources[0]['rulesSha256'])
put(base + 'test/project-progress-source-history.mjs', history)
edit_source(base + 'prepare-current-receiving-source-history.mjs', [
    ("import {transportConcreteNamedSourcePhases}", "import {derivePinnedRepositorySourceEvolution} from './pinned-repository-source-evolution.mjs';\nimport {verifyNativeCopiedSourceBindings} from './source-copy-native-bindings.mjs';\nimport {transportConcreteNamedSourcePhases}"),
    (']);add(progressPath,progressLanguage,progressAfter,[progressEdit]);', """]); 
 const progressEvolution=derivePinnedRepositorySourceEvolution(ts,{
  profile:new URL('./source-profiles/project-progress-receiving/source-rules.json',import.meta.url),
  profileSha256:'@RECEIVING_RULES@',path:progressPath,source:progressAfter,
 });
 const progressNamespaceEdits=[insertCall(ts,progressPath,progressAfter,'progressLayoutHistory',
  "if(path==='tools/translation/project.mjs')return restoreProjectProgressSourceHistory(source,retain);"),
  {span:[0,0],expected:'',replacement:"import {restoreProjectProgressSourceHistory} from './project-progress-source-history.mjs';\\n"}];
 if(apply(progressAfter,progressNamespaceEdits)!==progressEvolution.after)
  fail('complete project progress profile/native source equation differs');
 progressEvolution.nativeBindings=verifyNativeCopiedSourceBindings(ts,resolve(root,progressPath),progressEvolution.after);
 add(progressPath,progressLanguage,progressEvolution.after,[progressEdit,...progressNamespaceEdits],progressAfter);""".replace('@RECEIVING_RULES@',hash_bytes(fixture_rules))),
    ('defaultByteHistory:bytePlan,freezerPairs,producerEvolution,fixtureEvolution,inputs:', 'defaultByteHistory:bytePlan,freezerPairs,producerEvolution,fixtureEvolution,progressEvolution,inputs:'),
])
edit_source(base + 'prepare-runtime-import-current-sources.mjs', [
    ("  files.push({path,before:old,middle:old,after:changed,current,...(previousAfter", "  const sourceOriginPreviousAfter=relative==='test/runtime-import-phased-data.test.mjs'?once(changed,nativeCurrent,sourceOriginPrevious):undefined;\n  files.push({path,before:old,middle:old,after:changed,current,...(sourceOriginPreviousAfter===undefined?{}:{sourceOriginPreviousAfter}),...(previousAfter"),
    ("  ['loaderPreviousAfter','loaderPreviousEquation','loader'],", "  ['loaderPreviousAfter','loaderPreviousEquation','loader'],\n  ['sourceOriginPreviousAfter','sourceOriginPreviousEquation','source-origin'],"),
    ("&&(!Object.hasOwn(row,'loaderPreviousAfter')||row.current!==row.loaderPreviousAfter))fail", "&&(!Object.hasOwn(row,'loaderPreviousAfter')||row.current!==row.loaderPreviousAfter)&&(!Object.hasOwn(row,'sourceOriginPreviousAfter')||row.current!==row.sourceOriginPreviousAfter))fail"),
])

# The complete original case bodies keep their assertions and deadlines. Only
# cases introduced for the new namespace diagnostics opt in to that API.
edit_source(base + 'test/project-namespace-progress.test.mjs', [
    ("import {translateProject} from '../project.mjs';", "import {translateProject} from '../project.mjs';\nimport {namespaceProgressObserver,namespaceProgressRequested} from '../translation-progress.mjs';"),
    ("progress:row=>records.push(row)", "progress:namespaceProgressObserver(row=>records.push(row))"),
    ("progress:row=>{\n   records.push(row);", "progress:namespaceProgressObserver(row=>{\n   records.push(row);"),
    ('  }}),error=>error===sentinel);', '  })}),error=>error===sentinel);'),
    ('return row=>records.push(row);', 'return namespaceProgressObserver(row=>records.push(row));'),
])
test_path = base + 'test/project-namespace-progress.test.mjs'
staged[test_path]['after'] += b'''
test('ordinary observers keep their event sequence and namespace opt-in stays private',
 {timeout:60000},()=>{
 const events=[],callback=row=>events.push(row);
 assert.equal(namespaceProgressRequested(callback),false);
 translateProject({...options,progress:callback});
 assert.equal(events.some(row=>row.stage==='namespace'&&row.state==='advance'),false);
 const observer=namespaceProgressObserver(callback);
 assert.equal(namespaceProgressRequested(observer),true);
 assert.equal(namespaceProgressRequested(callback),false);
 for(const value of [null,undefined,{},0,'callback']){
  assert.equal(namespaceProgressRequested(value),false);
  assert.throws(()=>namespaceProgressObserver(value),TypeError);
 }
 const getDescriptor=Object.getOwnPropertyDescriptor,define=Object.defineProperty;
 const add=getDescriptor(WeakSet.prototype,'add'),has=getDescriptor(WeakSet.prototype,'has');
 const failure=new Error('foreign WeakSet operation');let foreignCalls=0,registered;
 try{
  define(WeakSet.prototype,'add',{...add,value(){foreignCalls++;throw failure;}});
  define(WeakSet.prototype,'has',{...has,value(){foreignCalls++;throw failure;}});
  registered=namespaceProgressObserver(callback);
  assert.equal(namespaceProgressRequested(observer),true);
  assert.equal(namespaceProgressRequested(registered),true);
  assert.equal(namespaceProgressRequested(callback),false);
 }finally{define(WeakSet.prototype,'add',add);define(WeakSet.prototype,'has',has);}
 assert.equal(foreignCalls,0);
 const sentinel=new Error('callback apply failed');let applications=0;
 const hostile=new Proxy(()=>{}, {apply(){applications++;throw sentinel;},
  get(){throw new Error('callback property must not be read');}});
 const wrapped=namespaceProgressObserver(hostile);
 assert.equal(namespaceProgressRequested(wrapped),true);
 assert.throws(()=>wrapped({stage:'namespace'}),error=>error===sentinel);
 assert.equal(applications,1);
});
'''

edit_source(base + 'prepare-bulk-draft-custody.mjs', [
    ("import {readFileSync} from 'node:fs';", "import {readFileSync,writeFileSync} from 'node:fs';"),
    ("import {transportConcreteNamedSourcePhases}", "import {derivePinnedRepositorySourceEvolution} from './pinned-repository-source-evolution.mjs';\nimport {transportConcreteNamedSourcePhases}"),
    ('const ts=ownershipCompiler(),originals=inputs(),files=[];\n for(const input of originals){\n  const before=input.source,legacy=deriveBulkDraftSource(ts,input.path,before);', """const ts=ownershipCompiler(),archiveOriginals=inputs(),originals=[],files=[];
 for(const archived of archiveOriginals){
  const sourceEvolution=archived.path==='scripts/translate-router.mjs'
   ?derivePinnedRepositorySourceEvolution(ts,{
    profile:new URL('./source-profiles/namespace-progress-observer/1-rules.json',import.meta.url),
    profileSha256:'@CLI_RULES@',path:archived.path,source:archived.source,
   }):null;
  const before=sourceEvolution?sourceEvolution.after:archived.source;
  const input={path:archived.path,source:before,bytes:Buffer.byteLength(before),sha256:hash(before),
   archivedOriginal:archived,sourceEvolution};originals.push(input);
  const legacy=deriveBulkDraftSource(ts,input.path,before);
  const previousLegacy=deriveBulkDraftSource(ts,input.path,archived.source);""".replace('@CLI_RULES@',sources[1]['rulesSha256'])),
    ("if(input.current!==before&&input.current!==legacy.after)", "if(input.current!==before&&input.current!==archived.source&&input.current!==legacy.after&&input.current!==previousLegacy.after)"),
    ('let {language,after}=legacy;', 'let {language,after}=legacy,previousAfter=previousLegacy.after;'),
    ('language=admit(one(language,old,next));after=admit(one(after,old,next));', 'language=admit(one(language,old,next));after=admit(one(after,old,next));\n   previousAfter=admit(one(previousAfter,old,next));'),
    ("if(current!==''&&current!==after)", "if(current!==''&&current!==after&&current!==previousAfter)"),
    ("if(equation.inverse!==before)fail('complete serialized/reparsed CST inverse differs');", """if(equation.inverse!==before)fail('complete serialized/reparsed CST inverse differs');
  const [previousEquation]=transportConcreteNamedSourcePhases([{
   before:previousAfter,middle:after,after,language:'JavaScript',
   rules:['javascript:retain-complete-original-draft-companion','router:compose-explicit-namespace-observer',
    'javascript:restore-complete-original-draft-companion','router:restore-original-namespace-progress-contract'],
  }]);
  if(previousEquation.inverse!==previousAfter||previousEquation.after!==after)
   fail('complete companion source-history inverse differs');"""),
    ('sourcePath:input.path,before,language,after,current,', 'sourcePath:input.path,before,language,after,current,sourceEvolution,previousAfter,previousEquation,'),
    ("return {schema:'complete-bulk-draft-source-composition-v2',typescriptVersion:ts.version,originals,files,", "if(hash(readFileSync(new URL('./source-profiles/namespace-progress-observer/1-rules.json',import.meta.url)))!=='@CLI_RULES@')fail('complete CLI source history changed');\n return {schema:'complete-bulk-draft-source-composition-v2',typescriptVersion:ts.version,archiveOriginals,originals,files,".replace('@CLI_RULES@',sources[1]['rulesSha256'])),
    ("!['--emit','--check'].includes(process.argv[2])", "!['--emit','--check','--write'].includes(process.argv[2])"),
    ("fail('use --emit|--check');", "fail('use --emit|--check|--write');"),
    ("if(process.argv[2]==='--emit')console.log(JSON.stringify(plan));else{", """if(process.argv[2]==='--emit')console.log(JSON.stringify(plan));else{
  if(process.argv[2]==='--write'){
   for(const row of plan.originals)if(row.current!==row.source||readFileSync(resolve(ROOT,row.path),'utf8')!==row.current)
    fail('complete original source must be current before companion installation');
   for(const row of plan.files){let current='';try{current=readFileSync(resolve(ROOT,row.path),'utf8');}catch(error){if(error.code!=='ENOENT')throw error;}
    if(current!==row.current)fail('complete companion changed before source installation');}
   for(const row of plan.files){writeFileSync(resolve(ROOT,row.path),row.after);row.current=row.after;}
  }"""),
])

report = dict(schema='namespace-progress-authored-input-stage-v1', files=[dict(path=path,
    beforeSha256=None if row['before'] is None else hash_bytes(row['before']),
    afterSha256=hash_bytes(row['after']), bytes=len(row['after'])) for path,row in staged.items()],
    projectRulesSha256=sources[0]['rulesSha256'], cliRulesSha256=sources[1]['rulesSha256'],
    receivingRulesSha256=hash_bytes(fixture_rules), sourceInstalled=False,
    nativeChecked=False, cstChecked=False, receivingExecuted=False)
if args.install:
    # The active producer must finish before installing any compiler input.
    receipt = root / 'ci-logs/issue-784-restart-2/path-canonical-generation-resource.json'
    assert receipt.is_file(), 'canonical producer has not returned its resource receipt'
    for path,row in staged.items():
        current = (root / path).read_bytes() if (root / path).exists() else None
        assert current == row['before'], path
    for path,row in staged.items():
        target=root / path
        target.parent.mkdir(parents=True,exist_ok=True)
        target.write_bytes(row['after'])
    report['authoredInputsInstalled'] = True
else:
    out = root / 'ci-logs/issue-784-restart-2/namespace-progress-authored-inputs-v4.json.gz'
    assert not out.exists()
    data = dict(report=report, files={path:dict(
        before=None if row['before'] is None else row['before'].hex(),after=row['after'].hex())
        for path,row in staged.items()})
    out.write_bytes(gzip.compress(json.dumps(data,separators=(',',':')).encode(),mtime=0))
print(json.dumps(report))
