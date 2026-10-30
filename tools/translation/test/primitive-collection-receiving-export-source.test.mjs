// Independent copied-compiler receiving case SOURCE. All execution UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import {exportPartitionedTranslatorBundle} from '../partitioned-export-bundle.mjs';
const limits={timeout:60000},root=fileURLToPath(new URL('../../../',import.meta.url));

test('complete copied compiler retains the new source rules profiles and public discovery/failure protocols',limits,t=>{
 const temporary=mkdtempSync(join(tmpdir(),'router-primitive-collection-receiving-'));t.after(()=>rmSync(temporary,{recursive:true,force:true}));
 const bundle=exportPartitionedTranslatorBundle({sourceRoot:root,output:join(temporary,'compiler')});
 // Explicit independently named dependencies, not generated from a rule table.
 const required=[
  'source-synchronization.mjs','native-json-literal-path-search-proposals.mjs',
  'native-json-optional-path-reader-proposals.mjs','native-json-optional-path-reader-discovery.mjs',
  'source-failure-operations.mjs','failure-aware-native-source-input-fences.mjs',
  'failure-aware-native-substitution-copy.mjs','failure-aware-mixed-native-substitution-copy.mjs',
  'native-rust-source-copy.mjs','concrete-source-edit-templates.mjs',
  'js-to-rust/owned-field-option-type-witness.mjs',
  'source-profiles/native-json-literal-path-search/complete-originals-and-rules.json.gz',
  'source-profiles/owned-field-option-type-witness/complete-originals-and-rules.json.gz',
  'source-profiles/native-json-optional-path-reader/complete-originals-and-rules.json.gz',
  'source-profiles/native-json-reader-discovery/complete-originals-and-rules.json.gz',
  'source-profiles/native-preparer-failure/complete-originals-and-rules.json.gz',
 ];
 for(const path of required)assert.deepEqual(readFileSync(join(bundle.destination,'tools/translation',path)),readFileSync(join(root,'tools/translation',path)),path);
 assert.equal(bundle.manifest.runtimeParity,false);
 const publicURL=pathToFileURL(join(bundle.destination,'tools/translation/source-synchronization.mjs')).href;
 const script=`
 import assert from 'node:assert/strict';
 const api=await import(${JSON.stringify(publicURL)});
 for(const name of ['proposeNativeJsonLiteralPathSearch','proposeNativeJsonOptionalPathReader','proposeNativeJsonOptionalPathReaders','proposeNativeJsonOptionalPathReaderDiscovery','withFailureAwareNativeSubstitutionOperation','prepareFailureAwareNativeSubstitutionCopy','withFailureAwareMixedNativeSubstitutionOperation','prepareFailureAwareMixedNativeSubstitutionCopy'])assert.equal(typeof api[name],'function',name);
 const source='pub fn read(body:&str)->Option<String>{let value:serde_json::Value=serde_json::from_str(body).ok()?;let error=value.get("error")?;[&["code"][..]].into_iter().find_map(|path|path.iter().try_fold(error,|node,key|node.get(key))?.as_str().map(str::to_owned))}\\n';
 const proposal=api.proposeNativeJsonOptionalPathReaderDiscovery([{path:'rust/src/receiving.rs',source}]);
 assert.equal(proposal.sourceProposals,1);assert.equal(proposal.unsupportedCandidates,0);assert.equal(proposal.files[0].before,source);assert.equal(proposal.files[0].inverse,source);assert.equal(proposal.files[0].history.inverse,source);
 assert.ok(proposal.files[0].after.includes('crate::translation_core::json_parse(body)?'));assert.ok(proposal.files[0].after.includes('crate::translation_json_fields_core::json_field(&value, "error")?'));assert.ok(proposal.files[0].after.includes('crate::translation_json_fields_core::json_text_field(error, "code")'));
 assert.deepEqual(proposal.steps[0].pipelines.map(row=>row.ruleTrace.map(stage=>stage.phase)),[['language','repository'],['language','repository']]);
 for(const flag of ['sourceInstalled','nativeInstalled','originalBodyEquivalenceQualified','productionSelected','namespaceAuthority','semanticAuthority','runtimeParity','receivingQualified'])assert.equal(proposal[flag],false);
 assert.equal(api.withFailureAwareNativeSubstitutionOperation(()=>42),42);
 assert.throws(()=>api.withFailureAwareMixedNativeSubstitutionOperation(()=>{assert.throws(()=>api.prepareFailureAwareNativeSubstitutionCopy({root:${JSON.stringify(bundle.destination)},archive:'absent-reader-source-profile.json.gz',pin:'0'.repeat(64),id:'missing-source'}));return 42;}),/invalidated/u);
 assert.equal(api.withFailureAwareMixedNativeSubstitutionOperation(()=>42),42);
 process.stdout.write('receiving source protocols retained; runtime parity unqualified');
 `;
 assert.equal(execFileSync(process.execPath,['--input-type=module','-e',script],{encoding:'utf8',timeout:20000,maxBuffer:65536}),'receiving source protocols retained; runtime parity unqualified');
});
