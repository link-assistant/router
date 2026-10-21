import testCase from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync,unlinkSync,symlinkSync,chmodSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {captureStaticSourceUniverse,assertStaticSourceUniverse,staticSourceUniverseRows} from '../static-source-universe.mjs';
import {prepareStrictStaticSourceProducer} from '../prepare-strict-static-source-producer.mjs';
import {STATIC_SOURCE_LIFECYCLE_PROFILES,STATIC_SOURCE_LIFECYCLE_LIMITS} from '../prepare-real-source-fixtures.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';

const test=(name,run)=>testCase(name,{timeout:60000},run),ROOT=fileURLToPath(new URL('../../../',import.meta.url));
function git(root,...args){return execFileSync('/usr/bin/git',['-c','core.hooksPath=/dev/null','-c','gc.auto=0','-c','maintenance.auto=false','-C',root,...args],{encoding:'utf8',timeout:10000,maxBuffer:4*1024*1024});}
function put(root,path,source){mkdirSync(dirname(join(root,path)),{recursive:true});writeFileSync(join(root,path),source);}
function fixture(t){
 const root=mkdtempSync(join(tmpdir(),'router-strict-static-universe-'));t.after(()=>rmSync(root,{recursive:true,force:true}));git(root,'init','-q');git(root,'config','user.name','Fixture');git(root,'config','user.email','fixture@example.invalid');
 put(root,'Cargo.toml','[workspace]\nmembers=["rust"]\n');put(root,'rust/Cargo.toml','[package]\nname="fixture"\nversion="0.1.0"\nedition="2024"\n');put(root,'Cargo.lock','# complete fixture lock\nversion = 4\n');put(root,'rust/src/lib.rs','// é😀 complete source\npub fn alpha() -> bool { true }\n');git(root,'add','.');git(root,'commit','-qm','Complete fixture universe');return {root,expectedHead:git(root,'rev-parse','HEAD').trim()};
}
function hookHash(run,visit){const prototype=Object.getPrototypeOf(createHash('sha256')),field=Object.getOwnPropertyDescriptor(prototype,'update');let visited=false;Object.defineProperty(prototype,'update',{...field,value:function(...args){if(!visited){visited=true;visit();}return Reflect.apply(field.value,this,args);}});try{return run();}finally{Object.defineProperty(prototype,'update',field);}}

test('current complete physical Git mode and body universe is derived freshly with three Cargo inputs',t=>{
 const input=fixture(t),snapshot=captureStaticSourceUniverse(input);assert.equal(snapshot.files.length,4);assert.equal(snapshot.sourceAuthority,false);assert.equal(snapshot.semanticAuthority,false);assert.deepEqual(assertStaticSourceUniverse(snapshot),snapshot);assert.deepEqual(staticSourceUniverseRows(snapshot).map(row=>row.path),['Cargo.lock','Cargo.toml','rust/Cargo.toml','rust/src/lib.rs']);for(const row of snapshot.files){assert.equal(row.source,readFileSync(join(input.root,row.path),'utf8'));assert.equal(row.gitMode,'100644');}
 put(input.root,'rust/tests/new_whole.rs','#[test] fn new_whole() {}\n');git(input.root,'add','.');git(input.root,'commit','-qm','New real whole source');assert.throws(()=>assertStaticSourceUniverse(snapshot),/HEAD/u);const next=captureStaticSourceUniverse({...input,expectedHead:git(input.root,'rev-parse','HEAD').trim()});assert.equal(next.files.length,5);assert.ok(next.files.some(row=>row.path==='rust/tests/new_whole.rs'));
});

test('missing physical source refuses before any original Git fallback can supply bytes',t=>{
 const input=fixture(t);unlinkSync(join(input.root,'rust/src/lib.rs'));assert.throws(()=>captureStaticSourceUniverse(input),error=>error.code==='ENOENT');assert.ok(git(input.root,'show','HEAD:rust/src/lib.rs').includes('alpha'));
});

test('linked and executable-mode changed physical sources refuse rather than inheriting Git identity',t=>{
 const input=fixture(t),path=join(input.root,'rust/src/lib.rs'),source=readFileSync(path);unlinkSync(path);put(input.root,'replacement.txt',source);symlinkSync('../../replacement.txt',path);assert.throws(()=>captureStaticSourceUniverse(input),/physical source/u);unlinkSync(path);writeFileSync(path,source);chmodSync(path,0o755);assert.throws(()=>captureStaticSourceUniverse(input),/mode differs/u);
});

test('untracked extra staged and corrupted source universes refuse without current digest updates',t=>{
 const input=fixture(t);put(input.root,'rust/tests/extra.rs','fn extra() {}');assert.throws(()=>captureStaticSourceUniverse(input),/untracked extra/u);git(input.root,'add','.');assert.throws(()=>captureStaticSourceUniverse(input),/index differs/u);git(input.root,'reset','--hard','HEAD');writeFileSync(join(input.root,'rust/src/lib.rs'),'pub fn altered() {}');assert.throws(()=>captureStaticSourceUniverse(input),/physical source|physical\/current Git/u);
});

test('late source membership additions and newly staged rows are recensed before return',t=>{
 const input=fixture(t);assert.throws(()=>hookHash(()=>captureStaticSourceUniverse(input),()=>put(input.root,'rust/tests/late.rs','fn late() {}')),/untracked extra|membership/u);rmSync(join(input.root,'rust/tests'),{recursive:true,force:true});
 assert.throws(()=>hookHash(()=>captureStaticSourceUniverse(input),()=>{put(input.root,'rust/tests/late.rs','fn late() {}');git(input.root,'add','.');}),/index differs|membership/u);
});

test('late write-and-restore byte changes remain refused by noncached physical and directory identities',t=>{
 const input=fixture(t),path=join(input.root,'rust/src/lib.rs'),before=readFileSync(path);assert.throws(()=>hookHash(()=>captureStaticSourceUniverse(input),()=>{writeFileSync(path,'temporary changed bytes');writeFileSync(path,before);}),/identity changed|source changed/u);assert.ok(readFileSync(path).equals(before));const clean=captureStaticSourceUniverse(input);assert.deepEqual(assertStaticSourceUniverse(clean),clean);
});

test('actual complete native copied producer removes only explicit fallback with both CST phases and full inverses',()=>{
 const before=readFileSync(join(ROOT,'tools/translation/prepare-real-source-fixtures.mjs'),'utf8'),limits=JSON.stringify(STATIC_SOURCE_LIFECYCLE_LIMITS),profiles=JSON.stringify(STATIC_SOURCE_LIFECYCLE_PROFILES),plan=prepareStrictStaticSourceProducer({root:ROOT}),row=plan.files[0];assert.equal(plan.files.length,1);assert.equal(row.before,before);assert.equal(row.copiedFrom,'tools/translation/prepare-real-source-fixtures.mjs');assert.equal(row.nativeSelections.length,1);assert.equal(row.nativeSelections[0].replacement,'{throw error;}');assert.ok(row.nativeSelections[0].expected.includes("bytes=staticGit(root,['show',subjectRevision+':'+row.path])"));assert.equal(row.repositorySelections[0].replacement,'prepareStrictStaticSourceLifecycleProposal');assert.equal(row.inverse,before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);for(const stage of row.stages){assert.equal(transportConcreteSyntaxMeta(stage.beforeMeta).source,stage.before);assert.equal(transportConcreteSyntaxMeta(stage.afterMeta).source,stage.after);assert.equal(stage.inverse,stage.before);assert.equal(stage.completeInverse,true);}assert.equal(row.nativeCopies.length,2);assert.equal(row.nativeBindings.nativeSemanticScopeChecked,true);assert.equal(readFileSync(join(ROOT,'tools/translation/prepare-real-source-fixtures.mjs'),'utf8'),before);assert.equal(JSON.stringify(STATIC_SOURCE_LIFECYCLE_LIMITS),limits);assert.equal(JSON.stringify(STATIC_SOURCE_LIFECYCLE_PROFILES),profiles);assert.equal(plan.originalProducerApisUnchanged,true);assert.equal(plan.semanticAuthority,false);
});
