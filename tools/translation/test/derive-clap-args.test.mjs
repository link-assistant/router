import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {loadDeriveDependencyProof,deriveDependencySource} from '../derive-dependencies.mjs';
import {proveClapArgsSourceOutput,isClapArgsSourceOutput,assertClapArgsSourceOutput} from '../derive-clap-args.mjs';
import {boundedClapArgHelper} from '../derive-clap-helpers.mjs';
import {createDeriveFootprintContext} from '../derive-footprints.mjs';
import {rustTokens,sourceItems} from '../rust-structure.mjs';
import {originalMacroTrees} from '../macro-token-trees.mjs';
import {translateProject} from '../project.mjs';
import {parseProgram} from '../semantic-meta.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
const root=new URL('../../../',import.meta.url),manifest=readFileSync(new URL('Cargo.toml',root),'utf8'),lock=readFileSync(new URL('Cargo.lock',root),'utf8'),dependencies=loadDeriveDependencyProof({manifest,lock});
const hash=value=>createHash('sha256').update(value).digest('hex');
const declaration=source=>{const item=sourceItems(source).find(item=>item.term==='struct');return {source,span:{start:item.start,end:item.end}};};
const context=source=>createDeriveFootprintContext({modules:[{file:'src/lib.rs',path:[],source}],dependencies,compilationProfile:PRODUCTION_PROFILE});

test('literal Args helpers retain original token spans without helper execution',()=>{
  for(const [source,key,value]of [['trailing_var_arg = true','trailing_var_arg',true],['allow_hyphen_values = false','allow_hyphen_values',false],['long','long',null],['env = "ROUTER_ITEMS"','env','ROUTER_ITEMS']]) {
    const parsed=boundedClapArgHelper(rustTokens(source),0,'field','struct');assert.equal(parsed.key,key);assert.equal(parsed.value,value);assert.equal(parsed.evidence.generatedHelperBehavior,false);
    for(const token of parsed.evidence.tokens)assert.equal(source.slice(token.span.start,token.span.end),token.text);
  }
  for(const source of ['global','global = make()','env = make()','value_parser = parser','default_value_t = 4','num_args = 0..=1','long = "\\b"'])assert.throws(()=>boundedClapArgHelper(rustTokens(source),0,'field','struct'),TypeError,source);
  assert.throws(()=>boundedClapArgHelper(rustTokens('long'),0,'container','struct'),TypeError);
});

test('constructor identifiers retain token identity and cannot enter inherited delimiter maps',()=>{
  const trees=originalMacroTrees('struct Options { constructor: Vec<String>, toString: Option<String> }'),body=trees.find(node=>node.kind==='group'&&node.delimiter==='{');assert.ok(body);assert.equal(body.children[0].text,'constructor');assert.ok(body.children.some(node=>node.text==='toString'));
  const source='#[derive(clap::Args)] struct Options {constructor:Vec<String>,toString:Option<String>}';
  const proof=proveClapArgsSourceOutput({dependencies,...declaration(source)});assert.deepEqual(proof.input.fields.map(field=>field.name),['constructor','toString']);assert.equal(proof.outputs.length,2);
});

test('actual constructor updater positional and long branches retain raw IDs cased names and both source feature outputs',()=>{
  const source='/// Input arguments.\n#[derive(clap::Args)] struct Options {/// Named strings.\n#[arg(long,env="ITEMS",allow_hyphen_values=true)] my_items:Vec<String>,optional_name:Option<String>}';
  const original=declaration(source),proof=proveClapArgsSourceOutput({dependencies,...original});assert.ok(isClapArgsSourceOutput(proof));assert.deepEqual(proof.input.containerDocs.map(doc=>doc.value),['Input arguments']);
  assert.equal(proof.outputs.length,2);assert.equal(proof.selectedSuccessOutputComplete,true);assert.equal(proof.generatedImplBehavior,false);assert.equal(proof.errorBranchComplete,false);
  for(const output of proof.outputs){assert.equal(output.semanticSyntaxRoundTrip,true);assert.equal(output.observation.bangCalls.length,4);assert.deepEqual(output.observation.definitions,[]);assert.deepEqual(output.observation.macroExports,[]);}
  const serialized=JSON.stringify(proof.outputs[0].syntax);assert.ok(serialized.includes('\\"my_items\\"'));assert.ok(serialized.includes('\\"MY_ITEMS\\"'));assert.ok(serialized.includes('\\"my-items\\"'));
  for(const row of proof.originalRules){const origin=deriveDependencySource(dependencies,row.package,row.source);assert.equal(origin.sha256,row.sourceSha256);assert.equal(hash(origin.source.slice(row.span.start,row.span.end)),row.sha256);}
  assert.strictEqual(assertClapArgsSourceOutput(proof,{dependencies,...original}),proof);assert.equal(isClapArgsSourceOutput(structuredClone(proof)),false);
  assert.throws(()=>assertClapArgsSourceOutput(structuredClone(proof),{dependencies,...original}),/Unsealed/);assert.throws(()=>assertClapArgsSourceOutput(proof,{dependencies,...original,source:source+' '}),/mismatched/);
  assert.throws(()=>proveClapArgsSourceOutput({dependencies:structuredClone(dependencies),...original}),/sealed/);
});

test('payload type/helper/documentation extensions and unrelated generated owners stay refused',()=>{
  for(const fields of ['value:String','value:Vec<u8>','value:Vec<Vec<String>>','value:emit!()','#[arg(value_parser=custom)]value:Vec<String>','#[arg(global)]value:Vec<String>','#[arg(long,long)]value:Vec<String>','#[arg(long="a",long="b")]value:Vec<String>','#[command(flatten)]value:Vec<String>','/// first\n/// second\nvalue:Vec<String>','/// **bold**\nvalue:Vec<String>','#[doc="text"]value:Vec<String>'])assert.equal(context('#[derive(clap::Args)] struct Options{'+fields+'}').certificates.length,0,fields);
  for(const source of ['#[derive(clap::Args)] struct Options<T>{value:Vec<String>}', '/// first\n/// second\n#[derive(clap::Args)] struct Options{value:Vec<String>}', '#[derive(clap::Args)] #[command(rename_all="snake_case")] struct Options{value:Vec<String>}', 'mod clap; #[derive(clap::Args)] struct Options{value:Vec<String>}', '#[derive(serde::Serialize)] struct Options{#[arg(long)]value:Vec<String>}', 'use unknown::allow; #[derive(clap::Args)] struct Options{value:Vec<String>}', '#[derive(clap::Args)] struct Options{value:Vec<String>} #[unknown] struct Sibling;'])assert.equal(context(source).certificates.length,0,source);
  assert.equal(context('#[derive(clap::Args)] struct Unproved{value:String} #[derive(serde::Serialize)] struct Sibling{ready:bool}').certificates.length,0,'unproved sibling Clap output cannot bootstrap another declaration namespace');
});

test('qualified and imported Args owners carry original source proofs while bang/runtime flags stay false',()=>{
  for(const source of ['#[derive(clap::Args)] struct Options{value:Vec<String>}', 'use clap::Args as Flags; #[derive(Flags)] struct Options{value:Option<String>}']) {
    const result=context(source);assert.deepEqual(result.diagnostics,[]);const certificate=result.certificates[0];assert.ok(certificate);assert.deepEqual(certificate.owners[0].target,['clap','Args']);assert.ok(isClapArgsSourceOutput(certificate.clapArgsOutput));assert.equal(certificate.clapGeneratedAttributeOwners.generatedAttributeOwnersResolved,true);assert.equal(certificate.dimensions.bangMacroComplete,false);assert.equal(certificate.generatedImplBehavior,false);
  }
});

test('complete unchanged verification source retains associated docs helper metadata and seven executable owners in JS and strict TS',{timeout:60000},async()=>{
  const source=readFileSync(new URL('src/verification.rs',root),'utf8');assert.equal(hash(source),'839dc354baff84b057fd6ec5c84d1f52d9dd4e0ed657843626a500425ef2ffa4');
  const paths=execFileSync('git',['ls-files','*.rs'],{cwd:root,encoding:'utf8',timeout:10000}).trim().split('\n');assert.equal(paths.length,804);
  const result=translateProject({entry:'src/verification.rs',paths,readSource:path=>readFileSync(new URL(path,root),'utf8'),cargoManifest:manifest,deriveDependencies:dependencies,compilationProfile:PRODUCTION_PROFILE});
  assert.deepEqual(result.meta.sources.map(row=>[row.source,row.sha256]),[['src/verification.rs',hash(source)]]);assert.equal(result.meta.runtimeParity,false);
  const certificate=result.meta.deriveNamespaceFootprints.certificates.find(row=>row.name==='VerificationArgs');assert.ok(certificate);assert.deepEqual(certificate.span,{start:129,end:339});assert.deepEqual(certificate.clapArgsOutput.input.containerDocs.map(doc=>[doc.value,doc.span]),[['Arguments accepted by the verification command',{start:77,end:128}]]);
  assert.deepEqual(certificate.clapArgsOutput.input.fields[0].helpers,[{key:'trailing_var_arg',value:true},{key:'allow_hyphen_values',value:true}]);assert.equal(certificate.generatedImplBehavior,false);assert.equal(certificate.dimensions.bangMacroComplete,false);
  const program=parseProgram(JSON.stringify(result.meta.checkedSemanticProgram));assert.equal(program.declarations.get('VerificationArgs').k,'data');assert.equal(program.declarations.get('VerificationArgs').ctors[0].fields[0].name,'arguments');
  assert.deepEqual(result.meta.executable.map(row=>row.name),['SCHEMA','SKIP_LOG','tests','unit','AREAS','status','results']);assert.ok(result.meta.refused.some(row=>row.name==='needs_client_preparation'));assert.ok(result.meta.refused.some(row=>row.name==='summary'));
  await verifyTypedTargets(result,api=>{assert.equal(api.SCHEMA,'link-assistant-router/verification/v1');assert.equal(api.SKIP_LOG,'ROUTER_VERIFICATION_SKIPS');assert.equal(api.results('ordinary\n  test result: ok\r\ntest result: FAILED\n'),2n);const counts=Object.freeze({$:'Counts',passed:1n,failed:0n,ignored:0n});assert.equal(api.status(true,counts,0n,0n),'proven');assert.equal(api.status(false,counts,0n,0n),'failed');assert.equal(api.status(true,counts,1n,0n),'not-proven');},{childTimeoutMs:30000});
});
