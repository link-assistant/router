// Independent source-only splice cases. No project/receiving case executed.
import test from 'node:test';
import assert from 'node:assert/strict';
import {proposeWholeNativeSourceCandidates} from '../opaque-native-source-candidates-20261101.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
const limits={timeout:60000};
test('ordered language/repository source edits retain the full module and exact independent inverse',limits,()=>{
 const source='// preserve\r\npub const CELLS:[&str;2]=["first","second"];\r\npub fn read()->u64{0_u64}\r\n',first=source.indexOf('"first"'),number=source.indexOf('0_u64'),edits=[{span:[number,number+5],expected:'0_u64',replacement:'1_u64'},{span:[first,first+7],expected:'"first"',replacement:'"α😀"'}],result=proposeWholeNativeSourceCandidates(source,edits);
 assert.equal(result.before.source,source);assert.equal(result.inverse,source);assert.equal(transportConcreteSyntaxMeta(result.before.meta).source,source);assert.equal(transportConcreteSyntaxMeta(result.after.meta).source,result.after.source);assert.ok(result.after.source.includes('["α😀","second"]'));assert.ok(result.after.source.endsWith('1_u64}\r\n'));assert.deepEqual(result.trace.map(row=>row.phase),['language','repository']);assert.equal(result.nativeGrammarChecked,false);assert.equal(result.executableAdmission,false);assert.equal(edits[0].expected,'0_u64');
});
test('overlap, stale expected source, surrogate splits and invalid field/interval forms refuse',limits,()=>{
 const source='pub fn f()->u64{7_u64}';for(const edits of [[{span:[0,3],expected:'pub',replacement:'fn'},{span:[1,2],expected:'u',replacement:'v'}],[{span:[0,3],expected:'bad',replacement:'pub'}],[{span:[0,0],expected:'',replacement:'pub'}],[{span:[-1,3],expected:'pub',replacement:'pub'}],[{span:[0,3],expected:'pub',replacement:'\ud800'}],[{span:[0,3],expected:'pub',replacement:'pub',semanticAuthority:true}]])assert.throws(()=>proposeWholeNativeSourceCandidates(source,edits));
});
test('unchanged modules retain complete source without manufacturing native or semantic admission',limits,()=>{
 const source='pub fn f()->u64{7_u64}',result=proposeWholeNativeSourceCandidates(source,[]);assert.equal(result.after.source,source);assert.equal(result.inverse,source);assert.equal(result.sourceAuthority,false);assert.equal(result.semanticAuthority,false);
});
