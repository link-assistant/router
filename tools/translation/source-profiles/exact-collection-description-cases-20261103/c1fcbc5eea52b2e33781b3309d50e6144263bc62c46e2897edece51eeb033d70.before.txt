// Complete current-source and source-lifetime case SOURCE. All UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {join,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {gunzipSync} from 'node:zlib';
import {proposeBorrowedPredicateDescriptionSources} from '../borrowed-predicate-descriptions-20261103-profile.mjs';
import {proposeBorrowedPredicateDescriptionInstalledSources} from '../borrowed-predicate-description-install-20261103-profile.mjs';
import {proposeExactBorrowedPredicateSourceIndex,withExactBorrowedPredicateSourceFamilyData} from '../exact-source-borrowed-predicate-families-20261103.mjs';
import {proposeExactBorrowedPredicateControlSources} from '../exact-source-borrowed-predicate-controls-20261103.mjs';
import {knownExactSourceSuccessor,withExactSourceHistoryDataOperation} from '../exact-source-successors-20261103.mjs';
import {knownExactSourceCompilerEngineEpoch} from '../exact-source-compiler-epochs-20261103.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {createBorrowedPredicateDescriptionSourceCustody} from '../borrowed-predicate-description-source-custody-20261103.mjs';
import {withCompleteSourceClosingFence} from '../complete-source-closing-fence.mjs';
import {requireBorrowedJsonToolNativeSourceABI} from '../borrowed-json-tool-20261103-native-abi.mjs';
import {requireBorrowedStandardMapNativeSourceABI} from '../borrowed-standard-map-20261103-native-abi.mjs';
const ROOT=fileURLToPath(new URL('../../../',import.meta.url));
const BASE='tools/translation/source-profiles/exact-source-borrowed-predicate-families-20261103/';
const INDEX='tools/translation/source-profiles/exact-source-successor-adoption-20261103/index.json',ENGINE='tools/translation/exact-source-successors-20261103.mjs';
const INPUTS='tools/translation/source-profiles/borrowed-predicate-descriptions-20261103/description-inputs.json.gz';
const read=path=>fs.readFileSync(join(ROOT,path),'utf8');
test('both real adapter families and their private ABI operations retain complete source ancestry',{timeout:60000},()=>{
 const original=proposeBorrowedPredicateDescriptionSources(),installed=proposeBorrowedPredicateDescriptionInstalledSources();assert.equal(original.plan.files.length,6);assert.equal(installed.files.length,9);assert.equal(installed.newFiles.length,1);
 for(const row of installed.files){
  assert.equal(read(row.path),row.after);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);
  for(const stage of row.stages){assert.equal(stage.history.inverse,stage.before);assert.equal(transportConcreteSyntaxMeta(stage.history.beforeMeta).source,stage.before);assert.equal(transportConcreteSyntaxMeta(stage.history.afterMeta).source,stage.after);}
  const earlier=original.plan.files.find(value=>value.path===row.path);if(earlier){assert.equal(earlier.before,row.before);assert.equal(earlier.after,row.after);}
 }
 for(const row of original.declarations)assert.equal(read(row.path),row.source);
 for(const row of installed.newFiles){assert.equal(read(row.path),row.source);assert.equal(transportConcreteSyntaxMeta(row.concreteMeta).source,row.source);assert.equal(row.semanticAuthority,false);}
 for(const row of installed.files.filter(row=>row.path.endsWith('-native-abi.mjs'))){
  assert.ok(row.after.includes('descriptions.current()'));assert.ok(row.after.includes('descriptions.close'));assert.ok(row.after.includes('requireOriginalFromNamespaceCallbacks'));assert.ok(row.after.includes('requireBorrowed'));
  assert.equal(row.after.split('sourcePins[path]').length,row.before.split('sourcePins[path]').length);
 }
 assert.equal(installed.semanticAuthority,false);assert.equal(installed.nativeBindingQualified,false);
});
test('the original347 index is preserved before fourteen complete current-source equations',{timeout:60000},()=>{
 const proposal=proposeExactBorrowedPredicateSourceIndex(),old=JSON.parse(gunzipSync(fs.readFileSync(join(ROOT,BASE+'index347.before.json.gz'))));
 assert.equal(proposal.indexText,read(INDEX));assert.equal(proposal.index.rows.length,361);assert.equal(new Set(proposal.index.rows.map(row=>row.path)).size,256);assert.deepEqual(proposal.index.rows.slice(0,347),old.rows);assert.equal(proposal.images.length,28);
 assert.deepEqual(proposal.trace.map(row=>row.phase),['language','repository']);for(const image of proposal.images)assert.equal(read(image.path),image.source);
 withExactBorrowedPredicateSourceFamilyData(input=>withExactSourceHistoryDataOperation(ROOT,()=>{
  for(const family of input.families)for(const row of family.rows){const known=knownExactSourceSuccessor({path:row.path,before:row.before},{root:ROOT});assert.ok(known,row.path);assert.equal(known.after,read(row.path));assert.equal(known.inverse,row.before);assert.equal(known.currentIsTerminal,true);assert.equal(known.nativeBindingQualified,false);}
 }));
});
test('all seven controls retain complete source and a separate347 to361 engine transition',{timeout:60000},()=>{
 const controls=proposeExactBorrowedPredicateControlSources();assert.equal(controls.files.length,7);
 for(const row of controls.files){assert.equal(read(row.path),row.after);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}
 const before=read('tools/translation/source-profiles/exact-source-borrowed-json-context-families-20261103/engine.after.txt'),current=read(ENGINE),known=knownExactSourceCompilerEngineEpoch({root:ROOT,before,current});
 assert.ok(known);assert.equal(known.inverse,before);assert.equal(known.after,current);assert.equal(known.laterHistories.length,1);assert.equal(known.nativeBindingQualified,false);
});
function copy(t,paths,label){
 const root=fs.realpathSync(fs.mkdtempSync(join(tmpdir(),label)));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 for(const path of paths){fs.mkdirSync(dirname(join(root,path)),{recursive:true});fs.copyFileSync(join(ROOT,path),join(root,path));}return root;
}
test('an original347 root does not require the later predicate source companion',{timeout:60000},t=>{
 const first='tools/translation/source-profiles/exact-source-compiler-epochs-20261103/',paths=['engine.physical127.txt','engine.before.txt','engine.after.txt'].map(name=>first+name).concat(['exact-source-current-families-20261103','exact-source-temporary-families-20261103','exact-source-json-packaging-families-20261103','exact-source-temporary-recovery-families-20261103','exact-source-borrowed-json-compiler-families-20261103','exact-source-borrowed-json-lifetimes-families-20261103','exact-source-borrowed-json-context-families-20261103'].map(name=>'tools/translation/source-profiles/'+name+'/engine.after.txt'));
 const root=copy(t,paths,'router-original347-predicate-domain-'),current=read(paths.at(-1));fs.mkdirSync(dirname(join(root,ENGINE)),{recursive:true});fs.writeFileSync(join(root,ENGINE),current);
 assert.equal(fs.existsSync(join(root,BASE+'engine.after.txt')),false);assert.ok(knownExactSourceCompilerEngineEpoch({root,before:read(first+'engine.before.txt'),current}));
});
function descriptionRoot(t){
 const data=JSON.parse(gunzipSync(fs.readFileSync(join(ROOT,INPUTS))));return {root:copy(t,[INPUTS,...data.rows.map(row=>row.path)],'router-description-inputs-'),rows:data.rows};
}
test('description restriction rejoins all original inputs, expires and cannot issue private ABI ownership',{timeout:60000},t=>{
 const {root}=descriptionRoot(t),restriction=createBorrowedPredicateDescriptionSourceCustody({root});restriction.current();assert.equal(restriction.sourceAuthority,false);assert.equal(restriction.semanticAuthority,false);
 assert.throws(()=>requireBorrowedJsonToolNativeSourceABI(restriction,{parser:{}}),/foreign, copied or expired/u);assert.throws(()=>requireBorrowedStandardMapNativeSourceABI(restriction,{parser:{}}),/foreign, copied or expired/u);
 restriction.close();assert.throws(()=>restriction.current(),/expired/u);assert.doesNotThrow(()=>restriction.close());
 const fresh=createBorrowedPredicateDescriptionSourceCustody({root});fresh.current();fresh.close();
});
test('changed original descriptions or contract sources refuse and caught changes poison that invocation',{timeout:60000},t=>{
 const {root,rows}=descriptionRoot(t);
 for(const row of rows){
  const path=join(root,row.path);fs.writeFileSync(path,row.source+'\n// changed source\n');assert.throws(()=>createBorrowedPredicateDescriptionSourceCustody({root}));fs.writeFileSync(path,row.source);
  const restriction=createBorrowedPredicateDescriptionSourceCustody({root});fs.writeFileSync(path,row.source+'\n// caught change\n');let primary;
  assert.throws(()=>restriction.current(),error=>{primary=error;return true;});fs.writeFileSync(path,row.source);
  assert.throws(()=>restriction.current(),error=>error===primary);assert.throws(()=>restriction.close(),error=>error===primary);
  const fresh=createBorrowedPredicateDescriptionSourceCustody({root});fresh.close();
 }
});
test('closing source failure cannot overwrite ordinary, falsy or frozen callback primaries',{timeout:60000},t=>{
 const {root,rows}=descriptionRoot(t),row=rows[0],path=join(root,row.path);
 for(const primary of [undefined,null,false,0,'',Object.freeze(new Error('original private caller primary'))]){
  const restriction=createBorrowedPredicateDescriptionSourceCustody({root});let thrown=false;
  try{withCompleteSourceClosingFence(()=>{fs.writeFileSync(path,row.source+'\n// closing failure\n');throw primary;},[restriction.close]);}catch(error){thrown=true;assert.equal(error,primary);}finally{fs.writeFileSync(path,row.source);}
  assert.equal(thrown,true);assert.equal(Object.hasOwn(primary??{},'closingErrors'),false);
 }
});
