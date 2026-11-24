// Independent complete receiving/source-history case SOURCE; all UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {join} from 'node:path';
import {syncBuiltinESMExports} from 'node:module';
import {protectedFlatWriterFixture} from './protected-flat-writer-20261102-fixture.mjs';
import {installFreshFlatNativeOutputTextRetention} from '../forward-output-ownership-20261101-flat-source-install.mjs';
import {prepareFlatNativeOutputTextRetention} from '../prepare-flat-native-output-text-retention.mjs';
import {resolveForwardSourceEquation} from '../forward-output-ownership-20261101-source-equation-bank.mjs';
import {withFixedForwardWriterSources} from '../forward-output-ownership-20261101-source-history.mjs';
import {captureProtectedFlatWriterSourceSuccessor} from '../protected-flat-writer-20261102-history.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
const TIMEOUT=3600000; // The original complete flat-source receiving deadline.
function policy(root,authored=[],unmanaged=[]){fs.mkdirSync(join(root,'translation'),{recursive:true});fs.writeFileSync(join(root,'translation/source-ownership.json'),JSON.stringify({schema:'router-explicit-source-ownership-v1',authored,unmanaged})+'\n');}
function privateStages(root){return fs.readdirSync(join(root,'tools')).filter(name=>name.startsWith('.router-flat-source-install-'));}
function prior(root,plan){const row=plan.files[0],source=resolveForwardSourceEquation(row,row.forwardOutputCustodySuccessor).before;assert.notEqual(source,row.after);fs.writeFileSync(join(root,row.path),source);return {...row,original:source};}
for(const kind of ['authored','unmanaged'])test('actual full flat writer retains '+kind+' predecessor bytes/mode/inode',{timeout:TIMEOUT,concurrency:false},async t=>{
 const root=protectedFlatWriterFixture(t),plan=await prepareFlatNativeOutputTextRetention({root}),row=prior(root,plan);policy(root,kind==='authored'?[row.path]:[],kind==='unmanaged'?[row.path]:[]);
 const before=fs.statSync(join(root,row.path),{bigint:true});await assert.rejects(()=>installFreshFlatNativeOutputTextRetention({root}),/authored|unmanaged|retained/);
 const after=fs.statSync(join(root,row.path),{bigint:true});assert.equal(fs.readFileSync(join(root,row.path),'utf8'),row.original);for(const key of ['dev','ino','mode','mtimeNs','ctimeNs'])assert.equal(after[key],before[key]);assert.deepEqual(privateStages(root),[]);
});
test('actual full flat protected no-op skips staging and preserves original inode',{timeout:TIMEOUT,concurrency:false},async t=>{
 const root=protectedFlatWriterFixture(t),plan=await prepareFlatNativeOutputTextRetention({root});policy(root,plan.files.map(row=>row.path));const before=plan.files.map(row=>fs.statSync(join(root,row.path),{bigint:true}));const result=await installFreshFlatNativeOutputTextRetention({root});assert.deepEqual(result.changed,[]);assert.ok(result.protectedPolicyRetainedBytes>0);for(let n=0;n<plan.files.length;n++){const after=fs.statSync(join(root,plan.files[n].path),{bigint:true});for(const key of ['dev','ino','mode','mtimeNs','ctimeNs'])assert.equal(after[key],before[n][key]);}assert.deepEqual(privateStages(root),[]);
});
test('full flat writer without explicit policy retains genuine source transaction behavior',{timeout:TIMEOUT,concurrency:false},async t=>{
 const root=protectedFlatWriterFixture(t),plan=await prepareFlatNativeOutputTextRetention({root}),row=prior(root,plan);const result=await installFreshFlatNativeOutputTextRetention({root});assert.ok(result.changed.includes(row.path));assert.equal(result.protectedPolicyRetainedBytes,0);assert.equal(fs.readFileSync(join(root,row.path),'utf8'),row.after);assert.deepEqual(privateStages(root),[]);
});
test('restored policy during actual flat publication revokes and retains recovery evidence',{timeout:TIMEOUT,concurrency:false},async t=>{
 const root=protectedFlatWriterFixture(t),plan=await prepareFlatNativeOutputTextRetention({root}),row=prior(root,plan);policy(root);const file=join(root,'translation/source-ownership.json'),bytes=fs.readFileSync(file),uuid=crypto.randomUUID;let touched=false;
 try{crypto.randomUUID=function(){const value=uuid();if(!touched){touched=true;fs.writeFileSync(file,bytes);}return value;};syncBuiltinESMExports();await assert.rejects(()=>installFreshFlatNativeOutputTextRetention({root}),/policy|restored|changed/);assert.equal(touched,true);assert.equal(fs.readFileSync(join(root,row.path),'utf8'),row.original);}
 finally{crypto.randomUUID=uuid;syncBuiltinESMExports();}
});
test('late restored policy retains full original backup evidence for partial flat publication',{timeout:TIMEOUT,concurrency:false},async t=>{
 const root=protectedFlatWriterFixture(t),plan=await prepareFlatNativeOutputTextRetention({root}),row=prior(root,plan);policy(root);const file=join(root,'translation/source-ownership.json'),bytes=fs.readFileSync(file),link=fs.linkSync;let touched=false,failure;
 try{fs.linkSync=function(from,to,...args){const value=link(from,to,...args);if(!touched&&String(to)===join(root,row.path)&&String(from).includes('/.router-flat-source-install-')){touched=true;fs.writeFileSync(file,bytes);}return value;};syncBuiltinESMExports();try{await installFreshFlatNativeOutputTextRetention({root});assert.fail('restored late policy must fail');}catch(error){failure=error;}}
 finally{fs.linkSync=link;syncBuiltinESMExports();}
 assert.equal(touched,true);assert.equal(failure.partialInstallation,true);assert.equal(fs.readFileSync(join(root,row.path),'utf8'),row.after);assert.ok(failure.recoveryPaths.length>0);const names=fs.readdirSync(failure.recoveryPaths[0]).filter(name=>name.startsWith('backup-'));assert.ok(names.length>0);assert.ok(names.some(name=>fs.readFileSync(join(failure.recoveryPaths[0],name),'utf8')===row.original));
});
test('actual immutable flat source history preserves both named complete successors',{timeout:TIMEOUT,concurrency:false},t=>{
 const root=protectedFlatWriterFixture(t);withFixedForwardWriterSources(root,history=>{history.requireActive();const row=history.rows().find(row=>row.path.endsWith('flat-source-install.mjs'));assert.equal(row.laterHistories.length,1);assert.notEqual(row.historicalAfter,row.after);const next=row.laterHistories[0];assert.equal(next.before,row.historicalAfter);assert.equal(next.after,row.after);assert.equal(next.inverse,next.before);assert.equal(transportConcreteSyntaxMeta(next.equation.afterMeta).source,row.after);const author=history.author();assert.equal(author.laterHistories.length,1);assert.equal(author.before,'');assert.notEqual(author.historicalAfter,author.after);});
});
test('fixed flat source successor refuses unknown predecessor or modified actual afterimage',{timeout:TIMEOUT,concurrency:false},t=>{
 const root=protectedFlatWriterFixture(t),path='tools/translation/forward-output-ownership-20261101-flat-source-install.mjs',before=fs.readFileSync(join(root,'tools/translation/source-profiles/protected-flat-writer-20261102/install-before.mjs.txt'),'utf8'),capture=name=>({source:fs.readFileSync(join(root,name),'utf8')});assert.throws(()=>captureProtectedFlatWriterSourceSuccessor(capture,path,before+'\n'),/predecessor/);fs.appendFileSync(join(root,path),'\n// independently changed writer\n');assert.throws(()=>captureProtectedFlatWriterSourceSuccessor(capture,path,before),/actual|authored/);
});
