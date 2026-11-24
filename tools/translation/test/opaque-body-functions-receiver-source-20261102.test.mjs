// Exact complete actual receiving copy and inverse source regression. UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {withSelectedTrackedSourceOperation,readSelectedTrackedSourceBytes} from '../selected-source-reader-20261101.mjs';
import {proposeOpaqueFunctionAssociationReceiverSource} from '../opaque-body-functions-20261102-receiver-source.mjs';
const root=fileURLToPath(new URL('../../../',import.meta.url));
test('both fixed function-reader imports and every actual child call match their copied modules through ordered whole-source substitutions',{timeout:60000,concurrency:false},()=>withSelectedTrackedSourceOperation(root,()=>{const text=name=>new TextDecoder('utf8',{fatal:true}).decode(readSelectedTrackedSourceBytes(root,name,{maxBytes:2097152})),before=text('tools/translation/opaque-receiving-bounded-numeric-20261102.mjs'),after=text('tools/translation/opaque-receiving-bounded-functions-20261102.mjs'),result=proposeOpaqueFunctionAssociationReceiverSource(before);assert.equal(result.after,after);assert.equal(result.history.inverse,before);assert.deepEqual(result.ruleTrace.map(row=>row.phase),['language','language','language','repository','repository','repository']);assert.equal(result.sourceInstalled,false);assert.equal(result.semanticAuthority,false);assert.throws(()=>proposeOpaqueFunctionAssociationReceiverSource(before+'\n// changed'));},{limits:{paths:2,bytes:4194304}}));
