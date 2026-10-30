import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {guardedProofConsumerHistory} from '../guarded-proof-consumer-history.mjs';
import {prepareGuardedProofLexing} from '../prepare-guarded-proof-lexing.mjs';
import {prepareOperationProofByteSources} from '../prepare-operation-proof-byte-sources.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
const root=fileURLToPath(new URL('../../../',import.meta.url));
const hash=value=>createHash('sha256').update(value).digest('hex');
test('both complete physical guarded consumers retain actual producer stages and original history',{timeout:60000},()=>{
 const plan=prepareGuardedProofLexing({root});
 const rows=plan.files.filter(row=>row.consumerBodyUnchanged);
 assert.equal(rows.length,2);
 for(const row of rows){
  const current=readFileSync(join(root,row.path),'utf8'),actual=guardedProofConsumerHistory(current,row.path,{root});
  assert.equal(actual.current,current);assert.equal(actual.historical,row.source);
  assert.equal(actual.equation.inverse,row.source);assert.equal(actual.sourceAuthority,false);assert.equal(actual.runtimeAuthority,false);
  for(const stage of actual.equation.stages){assert.equal(transportConcreteSyntaxMeta(stage.beforeMeta).source,stage.source);assert.equal(transportConcreteSyntaxMeta(stage.afterMeta).source,stage.text);assert.equal(stage.inverse,stage.source);}
  assert.equal(readFileSync(join(root,row.path),'utf8'),current);
 }
 const frozen=rows.find(row=>row.path.endsWith('/private-frozen-json.mjs'));
 assert.equal(hash(frozen.source),'6da6243dd4c2d9f48ca86c5a9e13f88b3b2ea6ad8f7a79df525128c11e732c5f');
 assert.throws(()=>guardedProofConsumerHistory(frozen.current+'\n',frozen.path,{root}),/exact complete current/);
 assert.throws(()=>guardedProofConsumerHistory(frozen.current,'tools/translation/unregistered.mjs',{root}),/exact complete current/);
 let reads=0;const object={get source(){reads++;throw Error('must not invoke');}};
 assert.throws(()=>guardedProofConsumerHistory(object,frozen.path,{root}),/primitive/);assert.equal(reads,0);
});
test('an altered actual composer cannot retain its historical pin or gain operation admission',{timeout:60000},t=>{
 const plan=prepareGuardedProofLexing({root}),directory=mkdtempSync(join(tmpdir(),'router-guarded-history-'));
 t.after(()=>rmSync(directory,{recursive:true,force:true}));
 for(const row of [...plan.inputs,...plan.binaryInputs]){
  const path=join(directory,row.path);mkdirSync(dirname(path),{recursive:true});
  writeFileSync(path,row.encoding==='base64'?Buffer.from(row.source,'base64'):row.source);
 }
 const path='tools/translation/private-frozen-json.mjs',before=readFileSync(join(directory,path),'utf8');
 writeFileSync(join(directory,path),before+'\n// foreign complete body extension\n');
 assert.throws(()=>prepareOperationProofByteSources({root:directory}),/complete current immutable composer differs/);
 assert.equal(readFileSync(join(root,path),'utf8'),before);
});
