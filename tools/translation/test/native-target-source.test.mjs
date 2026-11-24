import {repositorySourceURL} from "./fixtures/repository-paths.mjs";
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {translateProject} from '../project.mjs';
import {sourceItems} from '../rust-structure.mjs';
import {sha256} from '../translate.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';

const none=Object.freeze({$:'None'});
const target=(model,streaming)=>Object.freeze({$:'Some',field0:Object.freeze({$:'Tuple',field0:model,field1:streaming})});
test('unchanged native Gemini target parser consumes general split, tuple callback and trim rules',async()=>{
  const path='src/gemini/native.rs',name='parse_native_target',original=readFileSync(repositorySourceURL(path,new URL('../../../',import.meta.url)),'utf8');
  assert.equal(sha256(original),'4c810825b0a056b3a21ac2c81a50e48c9adbeb29fc19ee00d481ad72bc41cef2');
  const item=sourceItems(original).find(item=>item.term==='fn'&&item.name===name);assert.deepEqual([item.start,item.end],[9826,10334]);
  const source=original.slice(item.start,item.end);assert.equal(sha256(source),'ef1925b09650ea26dc608d82d8dfcbbd1f09189bcd8203ee1dd573d8ef4a7d1b');
  // Synthetic module declarations retain the original function's visibility
  // and actual namespace. They supply no function body or production count.
  const files={'src/lib.rs':'mod gemini;','src/gemini.rs':'mod native;',[path]:source};
  const result=translateProject({entry:'src/lib.rs',paths:Object.keys(files),readSource:path=>files[path]});assert.deepEqual(result.meta.refused,[]);
  const entry=result.meta.executable.find(entry=>entry.name==='gemini.native.'+name);assert.equal(entry.source,path);assert.deepEqual(entry.span,{start:0,end:source.length});
  assert.equal(result.meta.runtimeParity,false);assert.equal(result.meta.executable.filter(entry=>entry.term==='fn').length,1);
  await verifyTypedTargets(result,api=>{
    const run=api['gemini.native.'+name];
    for(const [input,expected] of [
      ['gemini-2.5-pro:generateContent',target('gemini-2.5-pro',false)],
      ['models/gemini-2.5-pro:streamGenerateContent',target('gemini-2.5-pro',true)],
      ['/v1beta/models/gemini😀:generateContent',target('gemini😀',false)],
      ['/models///Ω///:streamGenerateContent',target('Ω',true)],
      ['models/models/gemini:generateContent',target('gemini',false)],
      ['foo/models/bar/models/baz:generateContent',target('baz',false)],
      ['gemini:tool:generateContent',target('gemini:tool',false)],
      ['gemini:unknown',none],['gemini',none],[':generateContent',none],
      ['models/:generateContent',none],['models//:generateContent',none],['',none],
    ])assert.deepEqual(run(input),expected,input);
    const value=run('gemini:generateContent');assert.ok(Object.isFrozen(value));assert.ok(Object.isFrozen(value.field0));assert.throws(()=>run('\ud800:generateContent'),TypeError);
  });
});
