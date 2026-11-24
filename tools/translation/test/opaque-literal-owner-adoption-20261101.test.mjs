// Independent owner literal/source cases. Every execution remains UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {DYNAMIC_OUTPUT_PRODUCTION_OWNERS} from '../dynamic-primitive-output-20261101-source.mjs';
import {proposeLiteralEditedWholeOwners,proposeJsonScalarReadersWholeOwners} from '../opaque-literal-owner-adoption-20261101.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
const limits={timeout:60000},owners=()=>DYNAMIC_OUTPUT_PRODUCTION_OWNERS.filter(row=>row.path!=='src/lib.rs').map(row=>({path:'rust/'+row.path,source:row.source}));
test('constant-cell and actual header index edits retain the complete changed owner through output adoption',limits,()=>{
 const rows=owners(),row=rows.find(row=>row.path.endsWith('/token_report.rs'));assert.ok(row.source.includes('HEADERS[0]'));row.source=row.source.replace('HEADERS[0]','HEADERS[1usize]');const result=proposeLiteralEditedWholeOwners(rows),actual=result.equations.find(row=>row.path.endsWith('/token_report.rs'));assert.equal(actual.before,row.source);assert.ok(actual.after.includes('HEADERS[1usize]'));assert.ok(actual.after.includes('crate::translation_core::output_text_write'));assert.equal(actual.history.inverse,row.source);assert.equal(transportConcreteSyntaxMeta(actual.history.afterMeta).source,actual.after);assert.equal(actual.originalMacroOwnerProved,false);assert.equal(result.productionCoverageQualified,false);
});
test('native format literal changes retain their new value and the explicit println newline migration',limits,()=>{
 const rows=owners(),row=rows.find(row=>row.path.endsWith('/tokens_remote.rs'));assert.ok(row.source.includes('println!("{token}");'));row.source=row.source.replace('println!("{token}");','println!("TOKEN={token}");');const result=proposeLiteralEditedWholeOwners(rows),actual=result.equations.find(row=>row.path.endsWith('/tokens_remote.rs'));assert.ok(actual.after.includes('format!("TOKEN={token}\\n",')||actual.after.includes('format!("TOKEN={token}\\n")'));assert.equal(actual.history.inverse,row.source);
});
test('the original exact-owner API remains strict and the new lane refuses nonliteral source changes',limits,()=>{
 const rows=owners(),row=rows.find(row=>row.path.endsWith('/token_report.rs'));row.source=row.source.replace('HEADERS[0]','HEADERS[1]');assert.throws(()=>proposeJsonScalarReadersWholeOwners(rows),/exact complete/);const changed=owners(),other=changed.find(row=>row.path.endsWith('/tokens_remote.rs'));other.source=other.source.replace('println!("{token}");','eprintln!("{token}");');assert.throws(()=>proposeLiteralEditedWholeOwners(changed),/nonliteral/);
});
