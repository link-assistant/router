import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {syncBuiltinESMExports} from 'node:module';
import {composeCoreAsciiAssets} from '../prepare-current-core-ascii-assets.mjs';

function observedRead(run,change){
 const original=fs.readFileSync,tape=[];
 try{
  fs.readFileSync=function(path,...args){
   const source=Reflect.apply(original,this,[path,...args]),name=path instanceof URL?path.pathname:String(path);
   tape.push(name);return change?change(name,source):source;
  };
  syncBuiltinESMExports();return {value:run(),tape};
 }finally{fs.readFileSync=original;syncBuiltinESMExports();}
}

test('stale complete ASCII source predecessors refuse before native and CST preparation',{timeout:60000},()=>{
 for(const path of ['tools/translation/ascii-runtime-assets.mjs','tools/translation/ascii-runtime-assets-source-data.mjs','tools/translation/js-to-rust/owned-core-source.mjs']){
  const observed=observedRead(()=>assert.throws(()=>composeCoreAsciiAssets({[path]:{after:'changed'}}),/preceding complete source equation differs/));
  assert.deepEqual(observed.tape.map(name=>name.split('/tools/translation/').at(-1)),['source-profiles/core-ascii/assets-originals.json.gz']);
 }
 const refused=observedRead(()=>assert.throws(()=>composeCoreAsciiAssets({'tools/translation/js-to-rust/owned-core-source.mjs':{after:'changed'}}),/original source archive changed/),
  (name,source)=>name.endsWith('/source-profiles/core-ascii/assets-originals.json.gz')?Buffer.concat([source,Buffer.from('\n')]):source);
 assert.equal(refused.tape.length,1);
});
