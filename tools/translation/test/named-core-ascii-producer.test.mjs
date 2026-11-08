import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {createHash} from 'node:crypto';
import {prepareNamedCoreAsciiProducer} from '../prepare-named-core-ascii-producer.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex');

test('complete ASCII producer derives its installed source through native spans and both CST inverses',{timeout:60000},()=>{
 const row=prepareNamedCoreAsciiProducer();
 assert.equal(row.typescriptVersion,'5.9.3');assert.equal(row.current,row.after);
 assert.equal(hash(row.before),'e61113f9a6c2069527b6b1a7a9a595fa58db7310edc4f1d5dff137ef67eae157');
 assert.equal(row.nativeEdits.length,2);let source=row.before;
 for(const edit of [...row.nativeEdits].sort((a,b)=>b.span[0]-a.span[0])){assert.equal(source.slice(...edit.span),edit.expected);source=source.slice(0,edit.span[0])+edit.replacement+source.slice(edit.span[1]);}
 assert.equal(source,row.middle);assert.deepEqual(row.equation.stages.map(stage=>stage.phase),['language','repository']);
 assert.equal(transportConcreteSyntaxMeta(row.equation.beforeMeta).source,row.before);
 assert.equal(transportConcreteSyntaxMeta(row.equation.afterMeta).source,row.after);
 for(const stage of row.equation.stages){
  assert.equal(transportConcreteSyntaxMeta(stage.beforeMeta).source,stage.before);
  assert.equal(transportConcreteSyntaxMeta(stage.afterMeta).source,stage.after);
  assert.equal(stage.inverse,stage.before);
 }
 assert.equal(row.equation.inverse,row.before);assert.equal(row.newVerdictCaches,false);
 assert.equal(row.nativeRustExecuted,false);assert.equal(row.semanticAuthority,false);
 for(const name of row.originalRuleNames)assert.ok(row.after.includes(name));
});

test('ASCII producer refuses an unknown complete physical parent before returning a source plan',{timeout:60000},()=>{
 const root=mkdtempSync(join(tmpdir(),'router-core-ascii-parent-'));
 try{const path=join(root,'tools/translation/prepare-core-ascii-sources.mjs');mkdirSync(dirname(path),{recursive:true});writeFileSync(path,'export const unknown=true;\n');assert.throws(()=>prepareNamedCoreAsciiProducer({root}),/unknown complete physical source/);}
 finally{rmSync(root,{recursive:true,force:true});}
});
