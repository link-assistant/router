// Complete source-copy regression; no runtime/semantic authority from a recipe.
import test from 'node:test';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {withSelectedTrackedSourceOperation,readSelectedTrackedSourceBytes} from '../selected-source-reader-20261101.mjs';
import {proposeOpaqueBindingTargetsReceiverSource} from '../opaque-binding-targets-receiver-source-20261102.mjs';
const root=fileURLToPath(new URL('../../../',import.meta.url));
test('complete original binding receiver yields the exact strict/runtime successor with whole inverse and ordered source substitutions',{timeout:60000,concurrency:false},()=>withSelectedTrackedSourceOperation(root,()=>{const text=name=>new TextDecoder('utf8',{fatal:true}).decode(readSelectedTrackedSourceBytes(root,name,{maxBytes:2097152})),before=text('tools/translation/opaque-receiving-bounded-binding-rename-20261102.mjs'),after=text('tools/translation/opaque-receiving-bounded-binding-targets-20261102.mjs'),result=proposeOpaqueBindingTargetsReceiverSource(before);assert.equal(result.after,after);assert.equal(result.history.inverse,before);assert.deepEqual(result.ruleTrace.map(row=>row.phase),['language','language','language','repository']);assert.equal(result.semanticAuthority,false);assert.equal(result.sourceInstalled,false);assert.throws(()=>proposeOpaqueBindingTargetsReceiverSource(before+'\n// changed'));},{limits:{paths:2,bytes:4194304}}));
