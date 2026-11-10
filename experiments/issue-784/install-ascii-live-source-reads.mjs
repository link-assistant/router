// Install only complete reviewed producer equations and their actual outputs.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';
import {prepareUnicodeAsciiAssetProducers} from '../../tools/translation/prepare-unicode-ascii-asset-producers.mjs';
import {transportConcreteSyntaxMeta} from '../../tools/translation/concrete-syntax-meta.mjs';
const target='ci-logs/issue-784-restart-2/ascii-live-source-reads-proposal.json.gz';
const hash=value=>createHash('sha256').update(value).digest('hex');
assert.equal(existsSync(target),false);
const producer=prepareUnicodeAsciiAssetProducers();
for(const row of producer.files){
 assert.equal(row.current,row.sourceReadPredecessor);
 for(const equation of [row.equation,row.sourceReadEquation]){
  assert.equal(equation.inverse,equation.before);
  assert.equal(equation.after,row.after);
  for(const stage of equation.stages){
   assert.equal(stage.inverse,stage.before);
   assert.equal(transportConcreteSyntaxMeta(stage.beforeMeta).source,stage.before);
   assert.equal(transportConcreteSyntaxMeta(stage.afterMeta).source,stage.after);
  }
 }
 assert.equal(readFileSync(row.path,'utf8'),row.current);
}
const before=producer.files.map(row=>({path:row.path,source:row.current}));
let outputs=[];
try{
 for(const row of producer.files)if(row.current!==row.after)writeFileSync(row.path,row.after);
 const {prepareCoreAsciiAssets}=await import('../../tools/translation/prepare-current-core-ascii-assets.mjs');
 const plan=prepareCoreAsciiAssets();
 assert.equal(plan.sourceReadEvolution.files.length,2);
 for(const row of plan.sourceReadEvolution.files){
  assert.equal(readFileSync(row.path,'utf8'),row.before);
  assert.equal(row.equation.before,row.before);assert.equal(row.equation.after,row.after);
  assert.equal(row.equation.inverse,row.before);
  const actual=plan.files.find(other=>other.path===row.path);
  assert.equal(actual.after,row.after);
  for(const stage of row.equation.stages){
   assert.equal(stage.inverse,stage.before);
   assert.equal(transportConcreteSyntaxMeta(stage.beforeMeta).source,stage.before);
   assert.equal(transportConcreteSyntaxMeta(stage.afterMeta).source,stage.after);
  }
 }
 outputs=plan.sourceReadEvolution.files;
 const record={schema:'ascii-live-source-reads-complete-proposal-v1',producer,plan,
  sourceAuthority:false,semanticAuthority:false,runtimeParity:false,fullGatePassed:false,rustExecuted:false};
 const raw=Buffer.from(JSON.stringify(record)+'\n'),packed=gzipSync(raw,{level:9,mtime:0});
 assert.deepEqual(gunzipSync(packed),raw);
 for(const row of outputs)assert.equal(readFileSync(row.path,'utf8'),row.before);
 writeFileSync(target,packed,{flag:'wx'});assert.deepEqual(readFileSync(target),packed);
 for(const row of outputs)writeFileSync(row.path,row.after);
 for(const row of [...producer.files,...outputs])assert.equal(readFileSync(row.path,'utf8'),row.after);
 console.log(JSON.stringify({target,bytes:packed.length,sha256:hash(packed),
  completeProposalBytes:raw.length,completeProposalSha256:hash(raw),
  files:[...producer.files,...outputs].map(row=>({path:row.path,sha256:hash(row.after)})),
  fullGatePassed:false,runtimeParity:false,rustExecuted:false}));
}catch(error){
 for(const row of outputs)writeFileSync(row.path,row.before);
 for(const row of before)writeFileSync(row.path,row.source);
 throw error;
}
