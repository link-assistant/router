// Whole source-copy and full original inverse cases. Every execution UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {fileURLToPath} from 'node:url';
import {withSelectedTrackedSourceOperation,readSelectedTrackedSourceBytes} from '../selected-source-reader-20261101.mjs';
import {proposeOpaqueMixedEditSourceCopies} from '../opaque-mixed-edits-20261102-source.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
const root=fileURLToPath(new URL('../../../',import.meta.url));
test('complete numeric driver inverse verifier and receiving copies retain actual original bindings and exact CST ancestry',{timeout:60000,concurrency:false},()=>{
 const packet=JSON.parse(gunzipSync(readFileSync(new URL('../../../docs/development/opaque-mixed-edits-20261102/complete-source-draft.json.gz',import.meta.url))));
 withSelectedTrackedSourceOperation(root,()=>{const text=path=>new TextDecoder('utf8',{fatal:true}).decode(readSelectedTrackedSourceBytes(root,path,{maxBytes:2097152})),input=packet.equations.map(row=>({path:row.originalPath,source:text(row.originalPath)})),result=proposeOpaqueMixedEditSourceCopies(input);
  assert.equal(result.rows.length,4);for(let at=0;at<result.rows.length;at++){const row=result.rows[at];assert.equal(row.after,text(packet.equations[at].path));assert.equal(row.history.inverse,row.before);assert.equal(transportConcreteSyntaxMeta(row.history.beforeMeta).source,row.before);assert.equal(transportConcreteSyntaxMeta(row.history.afterMeta).source,row.after);}assert.equal(result.semanticAuthority,false);assert.equal(result.sourceInstalled,false);input[0].source+='\n';assert.throws(()=>proposeOpaqueMixedEditSourceCopies(input));
 },{limits:{paths:8,bytes:12582912}});
});
