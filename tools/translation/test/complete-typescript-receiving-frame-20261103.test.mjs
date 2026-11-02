// Complete source-frame chronology cases SOURCE. Execution UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {proposeCompleteTypeScriptReceivingSourceFrames} from '../complete-typescript-receiving-frame-20261103.mjs';
const read=path=>readFileSync(new URL('../../../'+path,import.meta.url),'utf8');
test('SDK producer and original full case suite retain complete prior source and both CST inverses',{timeout:60000},()=>{
 const result=proposeCompleteTypeScriptReceivingSourceFrames();assert.equal(result.files.length,2);assert.equal(result.semanticAuthority,false);
 for(const row of result.files){assert.equal(row.after,read(row.path));assert.equal(row.inverse,row.before);assert.equal(row.history.inverse,row.before);assert.deepEqual(row.trace.map(stage=>stage.phase),['language','repository']);}
 const sdk=result.files[0];assert.ok(sdk.before.includes('captureExplicitSourceMutationPolicy'));assert.equal(sdk.after.includes('captureExplicitSourceMutationPolicy'),false);
 assert.ok(sdk.after.includes('mutateProtectedNativeAbsoluteEntries'));assert.ok(sdk.after.includes('protectedNativeWriterRetainedBytes'));
 for(const phrase of ['complete SDK source operation deadline exceeded','sourceAuthority:false','compilerQualified:false'])assert.ok(sdk.after.includes(phrase));
});
