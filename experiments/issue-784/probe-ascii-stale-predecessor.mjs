// Finite source-only regression probe; no semantic or executable authority.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {syncBuiltinESMExports} from 'node:module';
import {composeCoreAsciiAssets} from '../../tools/translation/prepare-current-core-ascii-assets.mjs';
const original=fs.readFileSync,tape=[];
try {
 fs.readFileSync=function(path,...args){
  const value=Reflect.apply(original,this,[path,...args]);
  tape.push(path instanceof URL?path.pathname:String(path));
  return value;
 };
 syncBuiltinESMExports();
 const started=performance.now();
 assert.throws(()=>composeCoreAsciiAssets({'tools/translation/js-to-rust/owned-core-source.mjs':{after:'changed'}}),/preceding complete source equation differs/);
 console.log(JSON.stringify({elapsedMs:performance.now()-started,completeReadTape:tape}));
 assert.deepEqual(tape.map(name=>name.split('/tools/translation/').at(-1)),['source-profiles/core-ascii/assets-originals.json.gz']);
} finally {
 fs.readFileSync=original;
 syncBuiltinESMExports();
}
