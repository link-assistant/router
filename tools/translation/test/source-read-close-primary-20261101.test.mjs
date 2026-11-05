// Source-only fault cases. UNRUN; no fault injection occurs while drafting.
import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {proposeSourceReadPrimaryClosingHistory} from '../source-read-close-primary-20261101-history.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
const root=fileURLToPath(new URL('../../../',import.meta.url));
test('complete four-file/five-close source equations retain every original and both CST phases',{timeout:60000},()=>{
 const proposal=proposeSourceReadPrimaryClosingHistory();assert.equal(proposal.files.length,4);
 assert.equal(proposal.sourceAuthority,false);assert.equal(proposal.semanticAuthority,false);
 for(const row of proposal.files){
  assert.equal(row.inverse,row.before);assert.notEqual(row.after,row.before);
  assert.equal(transportConcreteSyntaxMeta(row.beforeMeta).source,row.before);
  assert.equal(transportConcreteSyntaxMeta(row.afterMeta).source,row.after);
  assert.deepEqual(row.trace.map(phase=>phase.phase),['language','repository']);
  assert.ok(row.after.includes('primaryReadFailed'));
 }
 assert.ok(proposal.files.find(row=>row.path.endsWith('/source-binding-bulk-20261101.mjs')).after.includes('primaryDirectoryFailed'));
});
const driver=String.raw`
import fs from 'node:fs';
import {syncBuiltinESMExports} from 'node:module';
import {pathToFileURL} from 'node:url';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
const root=process.argv[1],kind=process.argv[2],directory=fs.realpathSync(fs.mkdtempSync(join(tmpdir(),'router-primary-close-')));
const module=await import(pathToFileURL(join(root,{
 owned:'tools/translation/cross-module-owned-projection-20261101-production-sources.mjs',
 scoped:'tools/translation/scoped-output-binding-20261101-production-sources.mjs',
 cargo:'tools/translation/native-leaf-move-recovery-20261101-cargo.mjs',
 binding:'tools/translation/source-binding-bulk-20261101.mjs',
 directory:'tools/translation/source-binding-bulk-20261101.mjs',
}[kind])));
fs.mkdirSync(join(directory,'src'));fs.writeFileSync(join(directory,'src/lib.rs'),'pub fn value() -> u8 { 7 }\n');
const invoke=()=>kind==='owned'?module.captureCrossModuleOwnedProjectionProductionOwners():
 kind==='scoped'?module.captureScopedOutputBindingProductionOwners():
 kind==='cargo'?module.parseDurableLeafCargoData('[package]\nname="edge"\nversion="0.1.0"\nbuild=false\n'):
 module.withSourceBindingBulk20261101({root:directory,entry:'src/lib.rs',sourceDirectory:'src'},()=>17);
const originalRead=fs.readSync,originalClose=fs.closeSync,originalDirectory=fs.opendirSync;
const closeFailure=Object.freeze({reason:'independent close failure'});
let calls=0;
try{
 for(const primary of [undefined,null,false,0,-0,NaN,'',Object.freeze({reason:'frozen primary'})]){
  if(kind==='directory')fs.opendirSync=(...args)=>{const handle=originalDirectory(...args);return {
   readSync(){throw primary;},closeSync(){handle.closeSync();calls++;throw closeFailure;}
  };};else{fs.readSync=()=>{throw primary;};fs.closeSync=fd=>{originalClose(fd);calls++;throw closeFailure;};}
  syncBuiltinESMExports();
  let caught=false,result;try{invoke();}catch(error){caught=true;result=error;}
  if(!caught||!Object.is(result,primary))throw Error('source close replaced the exact primary value');
  fs.readSync=originalRead;fs.closeSync=originalClose;fs.opendirSync=originalDirectory;syncBuiltinESMExports();
 }
 if(kind==='directory')fs.opendirSync=(...args)=>{const handle=originalDirectory(...args);return {
  readSync(){return handle.readSync();},closeSync(){handle.closeSync();calls++;throw closeFailure;}
 };};else fs.closeSync=fd=>{originalClose(fd);calls++;throw closeFailure;};syncBuiltinESMExports();
 let caught=false,result;try{invoke();}catch(error){caught=true;result=error;}
 if(!caught||result!==closeFailure)throw Error('sole source close failure was hidden');
 if(calls<9)throw Error('descriptor closing was omitted');
}finally{fs.readSync=originalRead;fs.closeSync=originalClose;fs.opendirSync=originalDirectory;syncBuiltinESMExports();fs.rmSync(directory,{recursive:true,force:true});}
process.stdout.write('complete primary and close checks\n');
`;
for(const kind of ['owned','scoped','cargo','binding','directory'])test(`actual ${kind} source reader preserves primitive/frozen primaries and sole close failures`,{timeout:60000},()=>{
 // Node owns this explicit builtin-ESM fault-injection contract. The complete
 // file remains in both existing engine schedules; other original cases retain
 // actual Bun operation checks. No runtime capability skip is introduced.
 const raw=execFileSync('node',['--input-type=module','-e',driver,root,kind],{
   cwd:root,timeout:20000,maxBuffer:2*1024*1024,encoding:'utf8'});
 assert.equal(raw,'complete primary and close checks\n');
});
