import testCase from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync,symlinkSync,existsSync,readdirSync} from 'node:fs';
import {gunzipSync,gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {tmpdir} from 'node:os';
import {resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {prepareRealSourceFixtures,writeRealSourceFixtureProposal,selectRealSourceFixture,REAL_SOURCE_ORIGINAL_REVISION,REAL_SOURCE_MANIFEST_SHA256} from '../prepare-real-source-fixtures.mjs';
import {originalRealSourceManifest,readRealSourceFixtureBundle,historicalRealSource,historicalRealSourceEntry,currentRealSourceEntry,verifyRealSourceFixtureLineage} from './real-source-fixtures.mjs';
import {transportConcreteSyntaxMeta,applyConcreteSyntaxSubstitutions} from '../concrete-syntax-meta.mjs';
import {translateProject} from '../project.mjs';
import {loadJsonMacroSourceProof} from '../json-macro-sources.mjs';
import {serde_json_from_str} from '../extensions/json-runtime.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';

const ROOT=fileURLToPath(new URL('../../../',import.meta.url));
const ASSETS=fileURLToPath(new URL('../source-profiles/real-source-fixtures/',import.meta.url));
const hash=value=>createHash('sha256').update(value).digest('hex');
let vectors=[];const retain=(kind,value)=>{vectors.push({kind,value});return value;};
const test=(name,run)=>testCase(name,{timeout:60_000},async()=>{vectors=[];try{await run();}finally{if(process.env.ROUTER_REAL_SOURCE_FIXTURE_VECTOR_DIR){const folder=process.env.ROUTER_REAL_SOURCE_FIXTURE_VECTOR_DIR;mkdirSync(folder,{recursive:true});writeFileSync(join(folder,Buffer.from(name).toString('hex')+'.json.gz'),gzipSync(JSON.stringify({name,vectors},(_key,value)=>typeof value==='bigint'?{$integer:String(value)}:value)+'\n'));}}});
const tag=($,fields={})=>Object.freeze({$,...fields});
const json=value=>{const parsed=serde_json_from_str(JSON.stringify(value));assert.equal(parsed.$,'Ok');return parsed.field0;};
async function current(ids,verify){
  const entries=retain('complete-current-parents-selections-and-core',ids.map(id=>currentRealSourceEntry(id))),files={...entries[0].files,'src/lib.rs':'pub mod translation_core;\n'+entries.map(row=>row.source).join('\n')};
  for(const row of entries)assert.deepEqual(row.dependencyInputs,entries[0].dependencyInputs);
  const dependencyInputs=entries[0].dependencyInputs,result=retain('complete-current-core-carrier-result',translateProject({entry:'src/lib.rs',paths:Object.keys(files),readSource:path=>files[path],compilationProfile:PRODUCTION_PROFILE,cargoManifest:dependencyInputs.manifest,jsonMacroDependencies:loadJsonMacroSourceProof(dependencyInputs)}));
  for(const row of entries)for(const name of row.entry.bodyNames)assert.ok(result.meta.executable.some(item=>item.term==='fn'&&item.name===name),JSON.stringify(result.meta.refused));
  // The complete library graph/refusals remain retained; only these actual
  // selected current function bodies supply executable application evidence.
  await verifyTypedTargets(result,verify,{childTimeoutMs:20_000});return {entries,result};
}
function writeBundle(folder,bundle,index){const raw=Buffer.from(JSON.stringify(bundle)+'\n'),packed=gzipSync(raw);writeFileSync(join(folder,'originals.json.gz'),packed);writeFileSync(join(folder,'manifest.json'),JSON.stringify({...index,rawBytes:raw.length,rawSha256:hash(raw),bytes:packed.length,sha256:hash(packed)}));}

test('actual reusable producer preserves complete originals and deterministic same-engine proposals',()=>{
  const {bundle}=readRealSourceFixtureBundle(),a=retain('complete-first-proposal',prepareRealSourceFixtures({root:ROOT,currentRevision:'HEAD',historyArchive:ASSETS})),b=retain('complete-second-proposal',prepareRealSourceFixtures({root:ROOT,currentRevision:'HEAD',historyArchive:ASSETS}));
  assert.deepEqual(a,b);assert.equal(a.historyMode,'explicit-reviewed-archive-replay');assert.deepEqual(a.trace.map(row=>row.phase),['language','repository']);assert.equal(a.originalRevision,REAL_SOURCE_ORIGINAL_REVISION);
  const expected=structuredClone(bundle);expected.current.revision=a.currentRevision;
  const archive=a.files.find(row=>row.path.endsWith('/originals.json.gz'));assert.deepEqual(JSON.parse(gunzipSync(Buffer.from(archive.content,'base64')).toString('utf8')),expected);
  assert.equal(hash(readFileSync(new URL('../fixtures/real-source-provenance.json',import.meta.url))),REAL_SOURCE_MANIFEST_SHA256);
  const folder=mkdtempSync(join(tmpdir(),'router-native-fixture-producer-'));try{writeRealSourceFixtureProposal(a,folder);assert.deepEqual(readRealSourceFixtureBundle({folder}).bundle,expected);for(const row of a.files)assert.equal(hash(readFileSync(join(folder,row.path.split('/').at(-1)))),row.sha256);}finally{rmSync(folder,{recursive:true,force:true});}
});
test('all fifteen complete historical parents retain every exact declaration method and native test scope',()=>{
  const {bundle,manifest}=retain('complete-historical-and-current-fixture',readRealSourceFixtureBundle());assert.equal(manifest.entries.length,12);assert.equal(bundle.historical.files.length,15);assert.equal(bundle.historical.files.reduce((sum,row)=>sum+row.bytes,0),211895);
  let declarations=0,methods=0;
  for(const entry of manifest.entries){const selected=historicalRealSourceEntry(entry.id);assert.equal(hash(selected.original),entry.sourceSha256);declarations+=entry.declarations.length;methods+=(entry.methodPins??[]).length;assert.equal(selected.selection.partitions.map(row=>selected.original.slice(...row.span)).join(''),selected.original);if(entry.testSource&&entry.testName)assert.match(historicalRealSource(entry.testSource),new RegExp(`fn ${entry.testName}\\(`));}
  assert.equal(declarations,22);assert.equal(methods,3);
  for(const row of bundle.historical.files){const source=bundle.sources[row.sourceId];assert.equal(transportConcreteSyntaxMeta(source.canonical).source,source.source);}
});
test('complete current Claude credential and first-block bodies execute in both typed targets',async()=>{
  await current(['identity-token','identity-first-block'],api=>{
    for(const [token,wanted]of [['sk-ant-oat01-abc',true],['sk-ant-api03-abc',false],['',false],['sk-ant-oat',true],[' sk-ant-oat01-abc',false],['SK-ANT-OAT01-abc',false]])assert.equal(api.is_oauth_credential(token),wanted);
    const identity="You are Claude Code, Anthropic's official CLI for Claude.";assert.equal(api.CLAUDE_CODE_SYSTEM_PROMPT,identity);
    for(const [blocks,wanted]of [[[],false],[[{text:identity}],true],[[{text:identity+' additional instructions'}],true],[[{text:'project instructions'},{text:identity}],false],[[{text:identity},{text:'project instructions'}],true],[[{text:null}],false],[[{text:false}],false],[[{}],false],[[null],false],[[{text:' '+identity}],false]])assert.equal(api.first_block_is_identity(Object.freeze(blocks.map(json))),wanted);
    assert.throws(()=>api.first_block_is_identity(Object.freeze([{text:identity}])),TypeError);
  });
});
test('complete current login-status body retains independent JSON field-kind behavior',async()=>{
  await current(['login-status'],api=>{for(const [value,wanted]of [[{status:'authorized'},'authorized'],[{status:'failed'},'failed'],[{status:''},''],[{status:null},'unknown'],[{status:false},'unknown'],[{status:4},'unknown'],[{},'unknown'],[null,'unknown'],[[],'unknown']])assert.equal(api.status_of(json(value)),wanted);assert.throws(()=>api.status_of(Object.freeze({status:'authorized'})),TypeError);});
});
test('complete current resume-message body uses the actual owned formatting carrier',async()=>{
  await current(['format-resume_message'],api=>{for(const [name,paused,wanted]of [['primary',true,'resumed primary'],['primary',false,'primary was not paused'],['Ω/😀',true,'resumed Ω/😀'],['Ω/😀',false,'Ω/😀 was not paused'],['',true,'resumed '],['',false,' was not paused'],['{name}',true,'resumed {name}'],['{name}',false,'{name} was not paused']])assert.equal(api.resume_message(name,paused),wanted);assert.throws(()=>api.resume_message('primary',1n),TypeError);});
});
test('every reviewed adoption stage has a full CST inverse and unchanged retry declarations stay exact',()=>{
  const {bundle,manifest}=retain('complete-adoption-lineage',readRealSourceFixtureBundle());assert.equal(bundle.lineage.length,3);assert.equal(verifyRealSourceFixtureLineage(bundle),true);
  for(const stage of bundle.lineage)for(const row of stage.files){const before=bundle.sources[row.before.sourceId],after=bundle.sources[row.after.sourceId],doc=transportConcreteSyntaxMeta(before.canonical).document,applied=applyConcreteSyntaxSubstitutions(doc,{languageRules:[],repositoryRules:[{id:'repository.reviewed-native-adoption-history',edits:[row.edit]}]});assert.equal(applied.value.source,after.source);const undo=applyConcreteSyntaxSubstitutions(applied.value,{languageRules:[],repositoryRules:[{id:'repository.exact-native-history-inverse',edits:[row.inverse]}]});assert.equal(undo.value.source,before.source);assert.deepEqual(row.trace.map(row=>row.phase),['language','repository']);}
  const entry=manifest.entries.find(row=>row.id==='bounded-retry'),row=bundle.current.files.find(row=>row.path===entry.path),source=bundle.sources[row.sourceId].source;assert.notEqual(row.sourceId,entry.sourceSha256);assert.equal(readFileSync(resolve(ROOT,entry.path),'utf8'),source);const selection=selectRealSourceFixture(source,entry,{current:true});assert.deepEqual(selection.declarations.map(row=>row.sha256),entry.declarations.map(row=>row.sha256));
});
test('corrupt originals selections compressed bytes and adoption inverses never become fixture evidence',()=>{
  const {bundle,index}=readRealSourceFixtureBundle(),folder=mkdtempSync(join(tmpdir(),'router-native-fixture-corrupt-'));try{
    const bad=structuredClone(bundle),id=bad.historical.files[0].sourceId;bad.sources[id].source+='\n';writeBundle(folder,bad,index);assert.throws(()=>readRealSourceFixtureBundle({folder}),/content address/);
    const selection=historicalRealSourceEntry('identity-first-block');assert.throws(()=>selectRealSourceFixture(selection.original,{...selection.entry,declarations:selection.entry.declarations.map((row,at)=>at===0?{...row,start:row.start+1}:row)}),/original declaration/);
    const forged=structuredClone(bundle);forged.lineage[0].files[0].inverse.replacement+='\n';assert.throws(()=>verifyRealSourceFixtureLineage(forged),/inverse/);
    const packed=Buffer.from(readFileSync(resolve(ASSETS,'originals.json.gz')));packed[packed.length-1]^=1;writeFileSync(join(folder,'originals.json.gz'),packed);writeFileSync(join(folder,'manifest.json'),JSON.stringify(index));assert.throws(()=>readRealSourceFixtureBundle({folder}),/compressed/);
    assert.throws(()=>currentRealSourceEntry('missing'),/unknown current/);
  }finally{rmSync(folder,{recursive:true,force:true});}
});
test('proposal publication rejects source aliases and existing outputs without changing source trees',()=>{
  const proposal=prepareRealSourceFixtures({root:ROOT,currentRevision:'HEAD',historyArchive:ASSETS}),folder=mkdtempSync(join(tmpdir(),'router-native-fixture-output-'));try{
    const linked=join(folder,'linked');symlinkSync(ROOT,linked,'dir');const child=join(linked,'fixture-output-must-not-exist-408');assert.equal(existsSync(child),false);assert.throws(()=>writeRealSourceFixtureProposal(proposal,child),/physically outside/);assert.equal(existsSync(child),false);
    assert.throws(()=>prepareRealSourceFixtures({root:ROOT,currentRevision:'--invalid'}),/revision/);assert.deepEqual(readdirSync(folder),['linked']);
    const output=join(folder,'proposal');mkdirSync(output);writeFileSync(join(output,'originals.json.gz'),'existing');assert.throws(()=>writeRealSourceFixtureProposal(proposal,output),/EEXIST/);assert.equal(readFileSync(join(output,'originals.json.gz'),'utf8'),'existing');assert.equal(existsSync(join(output,'proposal.json')),false);
  }finally{rmSync(folder,{recursive:true,force:true});}
});
