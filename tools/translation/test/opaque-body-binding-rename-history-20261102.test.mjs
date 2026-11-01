// Complete actual source-copy/history case. No local execution authorized now.
import test from 'node:test';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {withSelectedTrackedSourceOperation,readSelectedTrackedSourceBytes} from '../selected-source-reader-20261101.mjs';
import {proposeOpaqueBindingRenameReceiverSource} from '../opaque-body-binding-rename-20261102-receiver-source.mjs';
const root=fileURLToPath(new URL('../../../',import.meta.url));
test('complete original receiver yields the exact additive actual receiver through language/repository source substitutions', {timeout:60000,concurrency:false},()=>withSelectedTrackedSourceOperation(root,()=>{const text=name=>new TextDecoder('utf8',{fatal:true}).decode(readSelectedTrackedSourceBytes(root,name,{maxBytes:2097152})),before=text('tools/translation/opaque-receiving-bounded-numeric-20261102.mjs'),after=text('tools/translation/opaque-receiving-bounded-binding-rename-20261102.mjs'),result=proposeOpaqueBindingRenameReceiverSource(before);assert.equal(result.after,after);assert.equal(result.history.inverse,before);assert.deepEqual(result.ruleTrace.map(row=>row.phase),['language','language','repository']);assert.equal(result.semanticAuthority,false);assert.equal(result.sourceInstalled,false);assert.throws(()=>proposeOpaqueBindingRenameReceiverSource(before+'\n// changed original'));},{limits:{paths:2,bytes:4194304}}));
