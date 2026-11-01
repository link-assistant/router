// Full source-only custody closure cases. Independent expected path census. UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {visitOpaqueBulkLiteralSourceEquations} from '../opaque-bulk-literal-20261101-history.mjs';
import {visitOpaquePairedLiteralSourceEquations} from '../opaque-paired-literal-20261101-history.mjs';
const cases=['token-report-translation-edges-20261101-cases.mjs','opaque-production-adoption-20261101-fixtures.mjs','opaque-production-adoption-20261101-stream.test.mjs','opaque-production-adoption-20261101-view.test.mjs','opaque-production-adoption-20261101.test.mjs','scoped-carrier-adoption-20261101.test.mjs','opaque-native-source-candidates-20261101.test.mjs','opaque-literal-owner-adoption-20261101.test.mjs','opaque-native-candidates-20261101.test.mjs','opaque-corpus-literal-inverse-20261101.test.mjs','opaque-corpus-bulk-literal-inverse-20261101.test.mjs'];
for(const [name,visit]of [['bulk',visitOpaqueBulkLiteralSourceEquations],['paired',visitOpaquePairedLiteralSourceEquations]])test(name+' receiving custody retains every complete parent case', {timeout:60000,concurrency:false},()=>{
 const events=[],result=visit(event=>{events.push({path:event.path,kind:event.kind});assert.equal(event.history.inverse,event.history.before);return null;});assert.equal(result.originalCaseClosureRetained,true);assert.ok(result.parentVisited>0);assert.equal(result.semanticAuthority,false);assert.equal(result.sourceAuthority,false);assert.ok(events.some(row=>row.kind==='complete-parent-source-copy-equation'));const rows=new Map(result.copyCustody.map(row=>[row.path,row.source]));assert.equal(rows.size,result.copyCustody.length);
 for(const leaf of [...cases,...(name==='paired'?['opaque-paired-literal-inverse-20261101.test.mjs']:[])]){const path='tools/translation/test/'+leaf;assert.equal(rows.get(path),readFileSync(new URL('./'+leaf,import.meta.url),'utf8'),path);}
});
