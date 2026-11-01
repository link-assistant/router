// Source only. Complete predecessor module + independent expectations, UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {redactCredentialTokenRuns} from '../persistent-credential-token-scan-20261101.mjs';
import {CREDENTIAL_TOKEN_SCANNER_SOURCES as sources} from '../persistent-credential-token-scan-20261101-sources.mjs';
import {proposeCredentialTokenScannerSource} from '../persistent-credential-token-scan-20261101-source.mjs';
import {transportConcreteSourceEquations} from '../concrete-source-equations.mjs';
const fixture=JSON.parse(readFileSync(new URL('../../../rust/tests/fixtures/persistent-credential-token-runs-20261101.json',import.meta.url),'utf8'));
async function original(){
 // Keep the ENTIRE committed predecessor; change only its relative module URL
 // for a fresh DATA-URL receiving instance. Never extract a function body.
 const before=sources.before,from="'./persistent-output-backend-20261101-url.mjs'",to=JSON.stringify(new URL('../persistent-output-backend-20261101-url.mjs',import.meta.url).href);
 assert.equal(before.split(from).length,2);const after=before.replace(from,to);
 const history=transportConcreteSourceEquations([{before,after,language:'JavaScript'}])[0];assert.equal(history.inverse,before);
 return import('data:text/javascript;base64,'+Buffer.from(history.after).toString('base64'));
}
test('independent literal token runs and complete original-module behavior',{timeout:60000},async()=>{
 const prior=await original();assert.equal(fixture.rows.length,17);
 for(const row of fixture.rows){assert.equal(redactCredentialTokenRuns(row.input),row.expected);assert.equal(prior.redactBearersAndJwts(row.input),row.expected);}
 const repeated='eyJ'.repeat(128)+'.eyJ'.repeat(128)+'.tail.end';
 assert.equal(redactCredentialTokenRuns(repeated),prior.redactBearersAndJwts(repeated));
 for(const value of [null,undefined,1,{},'\ud800','\udfff'])assert.throws(()=>redactCredentialTokenRuns(value),TypeError);
});
test('whole predecessor/successor source rules retain every byte and ordered inverse',{timeout:60000},()=>{
 const proposal=proposeCredentialTokenScannerSource();assert.deepEqual(proposal.ruleTrace.map(row=>row.phase),['language','repository']);assert.equal(proposal.files.length,1);
 const row=proposal.files[0];assert.equal(row.before,sources.before);assert.equal(row.after,sources.after);assert.equal(row.inverse,sources.before);assert.equal(row.history.inverse,sources.before);
 assert.equal(proposal.sourceInstalled,false);assert.equal(proposal.semanticAuthority,false);assert.equal(proposal.measuredPerformanceQualified,false);
});
