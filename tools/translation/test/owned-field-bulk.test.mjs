import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,readdirSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {prepareOwnedFieldBulkSources,deriveOwnedFieldBulkSource,assertOwnedFieldBulkInputsFresh} from '../prepare-owned-field-bulk.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {json} from '../translate.mjs';
import {serializeProjectMetaFieldUtf8} from '../project-meta-field-json.mjs';
import {planCompressedProjectMetaStorage,planCompressedProjectMetaUtf8ObjectStorage,loadProjectMetaStorageWithCompressedConcrete,PROJECT_META_STORAGE_LIMITS} from '../project-meta-compressed-storage.mjs';
import * as original from '../bulk.mjs';
import * as originalRetained from '../retained-bulk.mjs';
import * as candidate from '../owned-field-bulk.mjs';
import * as candidateRetained from '../retained-owned-field-bulk.mjs';
const root=resolve(fileURLToPath(new URL('../../../',import.meta.url))),hash=value=>createHash('sha256').update(value).digest('hex');
function temporary(t){const path=mkdtempSync(join(tmpdir(),'router-owned-field-bulk-'));t.after(()=>rmSync(path,{recursive:true,force:true}));return path;}
function fixture(t){
 const path=temporary(t);mkdirSync(join(path,'src'));writeFileSync(join(path,'src/lib.rs'),'\ufeff// complete Ω😀\r\npub fn answer()->u8{7} pub fn blocked()->u8{unknown!(9)}\r\n');
 const env=Object.fromEntries(Object.entries(process.env).filter(([key])=>!key.startsWith('GIT_')));
 execFileSync('git',['init','--quiet'],{cwd:path,env,timeout:10000});execFileSync('git',['-c','core.hooksPath=/dev/null','add','.'],{cwd:path,env,timeout:10000});
 return {root:path,sources:['src/lib.rs'],entries:['src/lib.rs']};
}
function tree(plan){return plan.outputs.map(row=>({...row,base64:readFileSync(join(plan.root,row.path)).toString('base64')}));}
function metadata(){return {schema:'owned-field-receiving-v1',entry:'src/lib.rs',runtimeParity:false,checkedSemanticProgram:{rows:'checked猫😀'.repeat(600)},concreteSyntaxMeta:[{source:'src/lib.rs',document:{source:'// Ω\r\n'.repeat(900),status:'opaque',authority:false}}],targetSemanticProgram:{rows:'target\ud800'.repeat(800)},tail:{map:new Map([['integer',2n**100n],['omitted',undefined]]),keep:true}};}
const metaPath='tools/translation/projects/src/lib.meta.json';
function componentFixture(){const meta=metadata(),text=json(meta),storageLimits={fileBytes:Math.max(...['checkedSemanticProgram','targetSemanticProgram','concreteSyntaxMeta'].map(key=>Buffer.byteLength(json(meta[key]))))+1024,totalBytes:1024*1024};assert.ok(Buffer.byteLength(text)>storageLimits.fileBytes);return {meta,text,storageLimits};}

test('complete nine-module proposal has native storage bindings both ordered CST phases and whole inverses',{timeout:60000},()=>{
 const proposal=prepareOwnedFieldBulkSources({root});assert.equal(proposal.files.length,9);assert.equal(proposal.originalAPIsUnchanged,true);assert.equal(proposal.arbitraryObserverEquivalent,false);assert.equal(proposal.performanceQualified,false);
 for(const row of proposal.files){assert.equal(readFileSync(join(root,row.path),'utf8'),row.text);assert.equal(row.inverse,row.source);assert.equal(row.sha256,hash(row.text));assert.deepEqual(row.trace.map(step=>step.phase),['language','repository']);
  for(const stage of row.stages){assert.equal(transportConcreteSyntaxMeta(stage.beforeMeta).source,stage.source);assert.equal(transportConcreteSyntaxMeta(stage.afterMeta).source,stage.text);assert.equal(stage.inverse,stage.source);let text=stage.text;for(const edit of [...stage.edits].reverse()){assert.equal(text.slice(edit.afterStart,edit.afterEnd),edit.after);text=text.slice(0,edit.afterStart)+edit.before+text.slice(edit.afterEnd);}assert.equal(text,stage.source);}
  if(row.beforeBinding){assert.equal(row.beforeBinding.imported,'planCompressedProjectMetaStorage');assert.equal(row.afterBinding.imported,'planCompressedProjectMetaUtf8ObjectStorage');assert.ok(row.beforeBinding.call.text.includes('json(result.meta)'));assert.ok(row.afterBinding.call.text.includes('serializeUtf8:serializeProjectMetaFieldUtf8'));assert.ok(!row.afterBinding.call.text.includes('json(result.meta)'));}
 }
 assert.equal(assertOwnedFieldBulkInputsFresh(proposal),true);
 const session=proposal.files.find(row=>row.path.endsWith('/owned-field-isolated-matrix-session.mjs')),originalSession=readFileSync(join(root,'tools/translation/isolated-matrix-session.mjs'),'utf8');
 assert.equal(session.source,originalSession);assert.equal(session.stages.flatMap(row=>row.edits).some(row=>/timeout|NODE_OPTIONS|maxBuffer|expectedBytes/.test(row.before)),false);
});

test('both genuine complete bulk plans preserve all fields every output byte and refusals at the same physical root',{timeout:60000},t=>{
 const options=fixture(t),events=[];for(const [before,after]of [[original,candidate],[originalRetained,candidateRetained]]){
  const left=before.planRegeneration(options);assert.deepEqual(before.applyRegenerationPlan(left).failures,[]);const leftBytes=tree(left);
  const right=after.planRegeneration({...options,progress:record=>events.push(record)});assert.deepEqual(right,left);assert.deepEqual(after.applyRegenerationPlan(right).failures,[]);assert.deepEqual(tree(right),leftBytes);assert.deepEqual(after.applyRegenerationPlan(right,{check:true}).failures,[]);
  const project=right.manifest.projects[0];assert.equal(project.executableFunctions,1);assert.ok(project.refused>0);const meta=JSON.parse(readFileSync(join(options.root,project.targets.meta),'utf8'));assert.ok(meta.refused.some(row=>row.name==='blocked'));assert.equal(meta.concreteSyntaxMeta[0].document.source,readFileSync(join(options.root,'src/lib.rs'),'utf8'));
 }
 const phases=events.filter(row=>row.stage==='project'&&row.state==='advance').map(row=>row.phase);assert.deepEqual(phases,['project-returned','owned-field-storage-start','owned-field-storage-end','owned-field-retain-start','owned-field-retain-end','project-returned','owned-field-storage-start','owned-field-storage-end','owned-field-retain-start','owned-field-retain-end']);
});

test('actual inline and component storage keep all logical bytes hashes decoded fields and original limits',{timeout:60000},()=>{
 const f=componentFixture();assert.deepEqual(PROJECT_META_STORAGE_LIMITS,{fileBytes:67108864,totalBytes:536870912});
 for(const storageLimits of [undefined,f.storageLimits]){
  const left=planCompressedProjectMetaStorage(metaPath,f.text,{storageLimits}),right=planCompressedProjectMetaUtf8ObjectStorage(metaPath,f.meta,{storageLimits,serializeUtf8:serializeProjectMetaFieldUtf8});assert.deepEqual(right,left);assert.equal(right.components.length,storageLimits?3:0);
  const restored=loadProjectMetaStorageWithCompressedConcrete(right.text,{metaPath,targets:{meta:metaPath,javascript:'out.mjs',typescript:'out.ts',...right.targets},read:path=>right.components.find(row=>row.path===path).text,storageLimits});assert.equal(restored.text,f.text);assert.deepEqual(restored.meta,JSON.parse(f.text));assert.equal(hash(restored.text),hash(f.text));
 }
 const changed=structuredClone(f.meta);changed.tail.keep=false;assert.notDeepEqual(planCompressedProjectMetaUtf8ObjectStorage(metaPath,changed,{storageLimits:f.storageLimits,serializeUtf8:serializeProjectMetaFieldUtf8}),planCompressedProjectMetaStorage(metaPath,f.text,{storageLimits:f.storageLimits}));
 for(const storageLimits of [{fileBytes:67108865},{totalBytes:536870913},{fileBytes:10,totalBytes:100}])assert.throws(()=>planCompressedProjectMetaUtf8ObjectStorage(metaPath,f.meta,{storageLimits,serializeUtf8:serializeProjectMetaFieldUtf8}));
});

test('native copied storage rule refuses shadowed JSON replaced imports changed calls and duplicate invocations',{timeout:60000},()=>{
 const source=readFileSync(join(root,'tools/translation/bulk.mjs'),'utf8');
 for(const changed of [source.replace("from './project-meta-compressed-storage.mjs'","from './unproved-storage.mjs'"),source.replace('json(result.meta)','json(result.other)'),source.replace('    const storage=','    const json=()=>"forged";\n    const storage='),source.replace('    const storage=','    const duplicate=planProjectMetaStorage(targets.meta,json(result.meta),{storageLimits:projectMetaStorageLimits});\n    const storage=')])assert.throws(()=>deriveOwnedFieldBulkSource(changed));
});

test('source freshness joins complete physical bytes and component reader refuses a retained payload mutation',{timeout:60000},t=>{
 const directory=temporary(t),path='source.mjs',source='// complete Ω😀\n';writeFileSync(join(directory,path),source);const input={root:directory,inputs:[{path,source,bytes:Buffer.byteLength(source),sha256:hash(source)}]};assert.equal(assertOwnedFieldBulkInputsFresh(input),true);writeFileSync(join(directory,path),source+' ');assert.throws(()=>assertOwnedFieldBulkInputsFresh(input),/physical input changed/);
 const f=componentFixture(),plan=planCompressedProjectMetaUtf8ObjectStorage(metaPath,f.meta,{storageLimits:f.storageLimits,serializeUtf8:serializeProjectMetaFieldUtf8});assert.throws(()=>loadProjectMetaStorageWithCompressedConcrete(plan.text,{metaPath,targets:{meta:metaPath,javascript:'a.mjs',typescript:'a.ts',...plan.targets},storageLimits:f.storageLimits,read:path=>plan.components.find(row=>row.path===path).text+' '}),/bytes\/hash/);
 let getter=0;const accessor={};Object.defineProperty(accessor,'value',{enumerable:true,get(){getter++;return 7;}});assert.throws(()=>planCompressedProjectMetaUtf8ObjectStorage(metaPath,accessor,{serializeUtf8:serializeProjectMetaFieldUtf8}));assert.equal(getter,0);for(const value of [[],new Date(),new Proxy({},{}),{toJSON(){throw Error('unproved callback');}}])assert.throws(()=>planCompressedProjectMetaUtf8ObjectStorage(metaPath,value,{serializeUtf8:serializeProjectMetaFieldUtf8}));
});

test('explicit CLI preserves complete original reports outputs checks and retained route at original limits',{timeout:60000},t=>{
 const options=fixture(t),env=Object.fromEntries(Object.entries(process.env).filter(([key])=>!key.startsWith('GIT_'))),old=join(root,'scripts/translate-router.mjs'),next=join(root,'scripts/translate-router-owned-field-meta.mjs');
 const run=(cli,args)=>JSON.parse(execFileSync(process.execPath,[cli,'--root',options.root,...args],{env,encoding:'utf8',timeout:20000,maxBuffer:8388608}));
 const before=run(old,[]);function files(path,base=''){return readdirSync(path,{withFileTypes:true}).filter(row=>row.name!=='.git').flatMap(row=>{const name=base+row.name,full=join(path,row.name);return row.isDirectory()?files(full,name+'/'):[{path:name,base64:readFileSync(full).toString('base64')}];}).sort((a,b)=>a.path.localeCompare(b.path));}
 const bytes=files(options.root);assert.deepEqual(run(next,[]),before);assert.deepEqual(files(options.root),bytes);assert.deepEqual(run(next,['--retain-output-text']),before);assert.deepEqual(files(options.root),bytes);assert.deepEqual(run(next,['--retain-output-text','--check']),{...before,mode:'check'});
});
