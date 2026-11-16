// Complete actual native context source joins only; no native/caller receipt.
import test from 'node:test';
import assert from 'node:assert/strict';
import {gunzipSync} from 'node:zlib';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import {readSourceProfileFileSync} from '../ordered-text-map-callers-20261102-source-storage.mjs';
import {matchesExactSourceEpoch} from '../exact-source-compiler-epochs-20261103.mjs';
import {transportConcreteSourceEquations} from '../concrete-source-equations.mjs';
const root=fileURLToPath(new URL('../../../',import.meta.url));
test('both complete original native contexts join only their exact reviewed alias continuation',{timeout:60000},()=>{
 const data=JSON.parse(gunzipSync(readSourceProfileFileSync(new URL('../source-profiles/original-self-crate-alias-20261103/complete-source.json.gz',import.meta.url)),{maxOutputLength:1048576}).toString('utf8'));
 for(const row of data.rows){const current=readFileSync(join(root,row.path),'utf8'),original={path:row.path,before:'',after:row.before,inverse:''};assert.equal(matchesExactSourceEpoch(original,current,{root}),true);assert.equal(matchesExactSourceEpoch(original,current+'\n',{root}),false);assert.equal(matchesExactSourceEpoch({...original,after:'unknown'},current,{root}),false);}
});
test('source selector itself retains the complete original inverse',{timeout:60000},()=>{
 const data=JSON.parse(gunzipSync(readSourceProfileFileSync(new URL('../source-profiles/exact-source-native-context-continuation-20261103/complete-source.json.gz',import.meta.url)),{maxOutputLength:1048576}).toString('utf8'));assert.equal(data.rows.length,1);const row=data.rows[0],history=transportConcreteSourceEquations([{before:row.before,after:row.after,language:'JavaScript'}])[0];assert.equal(history.inverse,row.before);assert.deepEqual(row.sequences.map(sequence=>sequence.phase),['language','repository']);
});
