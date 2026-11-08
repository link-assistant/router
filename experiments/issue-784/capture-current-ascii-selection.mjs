// Generate, transport, review and retain the complete proposal before installing.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,existsSync,readdirSync,lstatSync} from 'node:fs';
import {gzipSync,gunzipSync} from 'node:zlib';
import {prepareUnicodeAsciiAssetProducers} from '../../tools/translation/prepare-unicode-ascii-asset-producers.mjs';
import {transportConcreteSyntaxMeta} from '../../tools/translation/concrete-syntax-meta.mjs';
const target='docs/case-studies/issue-784/evidence/current-ascii-selection-source.json.gz';
assert.ok(!existsSync(target));
const sha=value=>createHash('sha256').update(value).digest('hex');
const plan=prepareUnicodeAsciiAssetProducers();
assert.equal(plan.files.length,2);assert.equal(plan.semanticAuthority,false);
for(const row of plan.files){
 assert.equal(row.current,row.previousAfter);
 assert.equal(readFileSync(row.path,'utf8'),row.previousAfter);
 assert.equal(readFileSync(row.input,'utf8'),row.before);
 assert.equal(row.equation.inverse,row.before);
 for(const stage of row.equation.stages){
  assert.equal(transportConcreteSyntaxMeta(stage.beforeMeta).source,stage.before);
  assert.equal(transportConcreteSyntaxMeta(stage.afterMeta).source,stage.after);
 }
 assert.equal(row.equation.stages.length,2);
 for(const edit of row.nativeEdits)assert.equal(row.before.slice(...edit.span),edit.expected);
 for(const edit of row.previousNativeEdits)assert.equal(row.before.slice(...edit.span),edit.expected);
 if(row.path.includes('base-assets'))assert.equal(row.after,row.previousAfter);
 else{
  const old='selection:historical.selection,originals:rows';
  const fresh='selection:{selected:historical.selection.selected.map(row=>({name:row.name,span:[row.node.getStart(),row.node.end],source:row.node.getText()})),links:historical.selection.links,statements:historical.selection.statements,nativeBindings:historical.selection.nativeBindings},originals:rows';
  assert.equal(row.previousAfter.split(old).length,2);
  assert.equal(row.after,row.previousAfter.replace(old,()=>fresh));
 }
}
const sources=['tools/translation/prepare-unicode-ascii-asset-producers.mjs',
 'tools/translation/test/current-unicode-ascii-asset-producers.test.mjs',
 'tools/translation/test/ascii-asset-historical-outputs.mjs',
 'experiments/issue-784/capture-current-ascii-selection.mjs'];
const record={schema:'complete-current-ascii-selection-proposal-v1',node:process.version,
 plan,sources:sources.map(path=>({path,source:readFileSync(path,'utf8')})),
 semanticAuthority:false,newExecutableApplicationFunctions:0,fullGatePassed:false,rustExecuted:false};
const raw=Buffer.from(JSON.stringify(record)+'\n'),packed=gzipSync(raw,{level:9,mtime:0});
function size(path){return readdirSync(path,{withFileTypes:true}).reduce((sum,entry)=>{
 const child=path+'/'+entry.name;if(entry.isSymbolicLink()||child==='experiments/issue-784/toolchain')return sum;
 return sum+(entry.isDirectory()?size(child):lstatSync(child).size);
},0);}
const census=['ci-logs','docs/case-studies/issue-784','experiments/issue-784','js/node_modules/.node-case-deadlines'].reduce((sum,path)=>sum+size(path),0);
assert.ok(census+packed.length<500000000);
writeFileSync(target,packed,{flag:'wx'});
assert.deepEqual(gunzipSync(readFileSync(target)),raw);
assert.deepEqual(JSON.parse(gunzipSync(readFileSync(target))),record);
for(const row of plan.files){assert.equal(readFileSync(row.path,'utf8'),row.previousAfter);writeFileSync(row.path,row.after);assert.equal(readFileSync(row.path,'utf8'),row.after);}
console.log(JSON.stringify({target,bytes:packed.length,sha256:sha(packed),decodedBytes:raw.length,
 files:plan.files.map(row=>({path:row.path,beforeSha256:sha(row.current),afterSha256:sha(row.after)})),
 completeProposalRetained:true,completeInverse:true,semanticAuthority:false}));
