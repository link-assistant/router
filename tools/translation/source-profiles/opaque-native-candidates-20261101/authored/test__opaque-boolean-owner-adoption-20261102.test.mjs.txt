// Independent owner literal/source cases. Every execution remains UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {DYNAMIC_OUTPUT_PRODUCTION_OWNERS} from '../dynamic-primitive-output-20261101-source.mjs';
import {proposeLiteralEditedWholeOwners,proposeJsonScalarReadersWholeOwners} from '../opaque-literal-owner-adoption-20261101.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
const limits={timeout:60000},owners=()=>DYNAMIC_OUTPUT_PRODUCTION_OWNERS.filter(row=>row.path!=='src/lib.rs').map(row=>({path:'rust/'+row.path,source:row.source}));
test('actual row default Boolean edits survive complete owner migration without matching introduced backend flags',limits,()=>{
 const rows=owners(),row=rows.find(row=>row.path.endsWith('/token_report.rs'));assert.ok(row.source.includes('.unwrap_or(false)'));row.source=row.source.replace('.unwrap_or(false)','.unwrap_or(true)');assert.throws(()=>proposeJsonScalarReadersWholeOwners(rows),/exact complete/u);const result=proposeLiteralEditedWholeOwners(rows),actual=result.equations.find(item=>item.path===row.path);assert.ok(actual.after.includes('.unwrap_or(true)'));assert.ok(actual.after.includes('output_text_write(false,'));assert.equal(actual.history.inverse,row.source);assert.equal(result.semanticAuthority,false);assert.equal(result.productionCoverageQualified,false);
});

test('both Boolean directions preserve all current owners while unrelated identifiers still refuse',limits,()=>{
 const rows=owners(),report=rows.find(row=>row.path.endsWith('/token_report.rs')),accounts=rows.find(row=>row.path.endsWith('/accounts_cli.rs'));assert.ok(accounts.source.includes('.unwrap_or(true)'));report.source=report.source.replace('.unwrap_or(false)','.unwrap_or(true)');accounts.source=accounts.source.replace('.unwrap_or(true)','.unwrap_or(false)');const result=proposeLiteralEditedWholeOwners(rows);for(const row of rows){const actual=result.equations.find(item=>item.path===row.path);assert.equal(actual.before,row.source);assert.equal(actual.history.inverse,row.source);}assert.ok(result.equations.find(row=>row.path===accounts.path).after.includes('.unwrap_or(false)'));const invalid=owners(),changed=invalid.find(row=>row.path.endsWith('/token_report.rs'));changed.source=changed.source.replace('.unwrap_or(false)','.unwrap_or(default_flag)');assert.throws(()=>proposeLiteralEditedWholeOwners(invalid),/nonliteral/u);
});
