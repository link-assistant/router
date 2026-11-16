// Full copied source ancestry and matching imports; all execution UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {fileURLToPath} from 'node:url';
import {withSelectedTrackedSourceOperation,readSelectedTrackedSourceBytes} from '../selected-source-reader-20261101.mjs';
import {proposeOpaqueComposedIdentifierSourceCopies} from '../opaque-composed-identifiers-20261102-source.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
const root=fileURLToPath(new URL('../../../',import.meta.url));
test('every complete inverse native verifier receiver and whole receiving case copy has exact CST ancestry',{timeout:60000,concurrency:false},()=>{
 const packet=JSON.parse(gunzipSync(readFileSync(new URL('../../../docs/development/opaque-composed-identifiers-20261102/complete-source-draft.json.gz',import.meta.url))));
 withSelectedTrackedSourceOperation(root,()=>{
  const text=path=>new TextDecoder('utf8',{fatal:true}).decode(readSelectedTrackedSourceBytes(root,path,{maxBytes:2097152})),input=packet.equations.map(row=>({path:row.originalPath,source:text(row.originalPath)})),result=proposeOpaqueComposedIdentifierSourceCopies(input);
  assert.equal(result.rows.length,6);for(let at=0;at<result.rows.length;at++){const row=result.rows[at];assert.equal(row.after,text(packet.equations[at].path));assert.equal(row.history.inverse,row.before);assert.equal(transportConcreteSyntaxMeta(row.history.beforeMeta).source,row.before);assert.equal(transportConcreteSyntaxMeta(row.history.afterMeta).source,row.after);const phases=row.ruleTrace.map(step=>step.phase),boundary=phases.indexOf('repository');assert.ok(phases.every((phase,index)=>phase===(boundary<0||index<boundary?'language':'repository')));}
  assert.equal(result.sourceInstalled,false);assert.equal(result.sourceAuthority,false);assert.equal(result.semanticAuthority,false);input[0].source+='\n// changed';assert.throws(()=>proposeOpaqueComposedIdentifierSourceCopies(input));
 },{limits:{paths:12,bytes:12582912}});
});
