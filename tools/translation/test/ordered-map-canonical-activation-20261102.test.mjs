// Operational source-state cases only, not a miniature compiler substitute.
// Complete compiler receiving cases remain separately mandatory. All UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {join,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {withCurrentCanonicalMapCompiler} from '../ordered-map-canonical-activation-20261102.mjs';
import {orderedTextMapCallerParentSourceData} from '../ordered-text-map-callers-20261102-profile.mjs';
import {orderedTextMapCanonicalParentSourceData} from '../ordered-text-map-canonical-20261102-profile.mjs';import {orderedTextMapUnitParentSourceData} from '../ordered-text-map-callers-20261102-unit-profile.mjs';
const options={timeout:30000,concurrency:false};
function fixture(t){
 const root=fs.realpathSync(fs.mkdtempSync(join(tmpdir(),'canonical-map-source-state-')));
 t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const rows=[...orderedTextMapCallerParentSourceData(),...orderedTextMapCanonicalParentSourceData(),...orderedTextMapUnitParentSourceData()];
 for(const row of rows){fs.mkdirSync(dirname(join(root,row.path)),{recursive:true});fs.writeFileSync(join(root,row.path),row.after);}
 return {root,rows};
}
test('all29 exact installed sources select original execution without creating a compiler copy',options,t=>{
 const {root}=fixture(t);let invoked=false;
 const result=withCurrentCanonicalMapCompiler({sourceRoot:root},(token,report)=>{
  invoked=true;assert.equal(token,null);assert.equal(report.root,root);assert.equal(report.installedSource,true);
  assert.equal(report.sourceAuthority,false);assert.equal(report.semanticAuthority,false);return 23;
 });assert.equal(invoked,true);assert.equal(result,23);
});
test('unknown or mixed source epoch refuses before callback regardless of public claim',options,t=>{
 const {root,rows}=fixture(t);fs.writeFileSync(join(root,rows[0].path),rows[0].before);
 let invoked=false;assert.throws(()=>withCurrentCanonicalMapCompiler({sourceRoot:root,sourceAuthority:true,installedSource:true},()=>{invoked=true;}),/mixed or unknown compiler epoch/u);assert.equal(invoked,false);
});
test('a restored compiler file invalidates the actual enclosing source-state operation',options,t=>{
 const {root,rows}=fixture(t),file=join(root,rows[0].path),original=fs.readFileSync(file);
 assert.throws(()=>withCurrentCanonicalMapCompiler({sourceRoot:root},()=>{fs.writeFileSync(file,Buffer.concat([original,Buffer.from('\n')]));fs.writeFileSync(file,original);}),/changed|identity|source/u);
});
for(const primary of [undefined,null,false,0,'',Object.freeze(new Error('frozen primary'))]){
 test('complete source closing retains exact thrown primary '+String(primary),options,t=>{
  const {root,rows}=fixture(t),file=join(root,rows[0].path);let threw=false;
  try{withCurrentCanonicalMapCompiler({sourceRoot:root},()=>{fs.writeFileSync(file,rows[0].after+'\n');throw primary;});}
  catch(error){threw=true;assert.equal(error,primary);}assert.equal(threw,true);
 });
}
