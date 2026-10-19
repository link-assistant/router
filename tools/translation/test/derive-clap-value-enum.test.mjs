import {repositorySourceURL} from "./fixtures/repository-paths.mjs";
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {gzipSync} from 'node:zlib';
import {currentOriginalRustPaths} from './original-rust-census.mjs';
import {createHash} from 'node:crypto';
import {loadDeriveDependencyProof,DERIVE_SOURCE_PROFILE,deriveDependencySource} from '../derive-dependencies.mjs';
import {inventoryDeriveQuoteMeta} from '../derive-quote-meta.mjs';
import {proveClapValueEnumSourceOutput,isClapValueEnumSourceOutput,assertClapValueEnumSourceOutput} from '../derive-clap-value-enum.mjs';
import {createDeriveFootprintContext} from '../derive-footprints.mjs';
import {sourceItems} from '../rust-structure.mjs';
import {translateProject} from '../project.mjs';
import {parseProgram} from '../semantic-meta.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
const root=new URL('../../../',import.meta.url),manifest=readFileSync(new URL('Cargo.toml',root),'utf8'),lock=readFileSync(new URL('Cargo.lock',root),'utf8'),dependencies=loadDeriveDependencyProof({manifest,lock});
const hash=value=>createHash('sha256').update(value).digest('hex');
const retain=(name,value)=>{const directory=process.env.ROUTER_OLD_VALUE_ENUM_VECTOR_DIR;if(directory){mkdirSync(directory,{recursive:true});writeFileSync(directory+'/'+name+'.json.gz',gzipSync(JSON.stringify(value,(_,item)=>typeof item==='bigint'?{$integer:item.toString()}:item)+'\n',{mtime:0}));}};
let contextIndex=0;
const context=source=>{const result=createDeriveFootprintContext({modules:[{file:'src/lib.rs',path:[],source}],dependencies,compilationProfile:PRODUCTION_PROFILE});retain('context-'+String(++contextIndex).padStart(2,'0'),{source,result});return result;};

test('locked actual Clap archives preserve old profile inputs and inventory every actual Rust member including constructor identifiers',()=>{
  assert.deepEqual(DERIVE_SOURCE_PROFILE.packages.slice(8).map(entry=>[entry.name,entry.bytes]),[['clap',65831],['clap_builder',171709],['clap_derive',33942],['heck',11517]]);
  const inventory=inventoryDeriveQuoteMeta(dependencies,'clap_derive');assert.equal(inventory.sourceMemberCount,16);assert.equal(inventory.quoteCount,170);
  assert.ok(deriveDependencySource(dependencies,'clap_derive','src/derives/args.rs').source.includes('constructor'));
  assert.ok(inventory.members.find(member=>member.source==='src/derives/args.rs').quotes.length>0);
  retain('01-original-complete-inventory',inventory);
});

test('actual helper bindings source-order repetitions and Heck ASCII algorithm instantiate original one-impl/two-method quotes',()=>{
  const source='#[derive(clap::ValueEnum)] enum Choice { Codex, #[value(name="claude",alias="claude-code",alias="other")] ClaudeCode, XMLHttpRequest, FooBARBaz, Foo2Bar, foo_bar, __, }';
  const proof=proveClapValueEnumSourceOutput({dependencies,source});assert.ok(isClapValueEnumSourceOutput(proof));
  assert.deepEqual(proof.input.variants.map(row=>row.canonicalName),['codex','claude','xml-http-request','foo-bar-baz','foo2-bar','foo-bar','']);
  assert.deepEqual(proof.input.variants[1].aliases,['claude-code','other']);assert.equal(proof.selectedSuccessOutputComplete,true);assert.equal(proof.semanticSyntaxRoundTrip,true);
  assert.deepEqual(proof.outputObservation.bangCalls,[]);assert.deepEqual(proof.outputObservation.definitions,[]);assert.equal(proof.generatedImplBehavior,false);assert.equal(proof.errorBranchComplete,false);
  for(const row of proof.originalRules) {const original=deriveDependencySource(dependencies,row.package,row.source);assert.equal(original.sha256,row.sourceSha256);assert.equal(hash(original.source.slice(row.span.start,row.span.end)),row.sha256);}
  assert.strictEqual(assertClapValueEnumSourceOutput(proof,{dependencies,source}),proof);assert.equal(isClapValueEnumSourceOutput(structuredClone(proof)),false);
  assert.throws(()=>assertClapValueEnumSourceOutput(structuredClone(proof),{dependencies,source}),/Unsealed/);assert.throws(()=>assertClapValueEnumSourceOutput(proof,{dependencies,source:source+' '}),/mismatched/);
  assert.throws(()=>proveClapValueEnumSourceOutput({dependencies:structuredClone(dependencies),source}),/sealed/);
  for(const escaped of ['\\b','\\f','\\/','\\u0041'])assert.throws(()=>proveClapValueEnumSourceOutput({dependencies,source:'enum Choice {#[value(name="'+escaped+'")] First}'}),/literal escape/);
  const literalOnly=proveClapValueEnumSourceOutput({dependencies,source:'enum Choice {#[value(name="#[macro_export] macro_rules! escape {}",alias="é")] First}'});assert.deepEqual(literalOnly.outputObservation.bangCalls,[]);assert.deepEqual(literalOnly.outputObservation.definitions,[]);
  retain('02-complete-original-quote-proofs',{source,proof,literalOnly});
});

test('unsupported variant payloads generics helpers documents and forged original owners remain refused',()=>{
  for(const source of ['#[derive(clap::ValueEnum)] enum Choice<T>{First}', '#[derive(clap::ValueEnum)] enum Choice {First(u8)}', '#[derive(clap::ValueEnum)] enum Choice {First=1}', '#[derive(clap::ValueEnum)] enum Choice {#[value(skip)] First}', '#[derive(clap::ValueEnum)] enum Choice {#[value(alias=make())] First}', '#[derive(clap::ValueEnum)] enum Choice {#[value(name="a",name="b")] First}', '#[derive(clap::ValueEnum)] enum Choice {#[doc="\\u0041"] First}', '#[derive(clap::ValueEnum)] enum Choice {/// é\n First}', '#[derive(clap::ValueEnum)] enum Choice {É}', '#[derive(clap::ValueEnum)] enum Choice {}'])assert.equal(context(source).certificates.length,0,source);
  for(const source of ['mod clap; #[derive(clap::ValueEnum)] enum Choice {First}', '#[derive(serde::Serialize)] enum Choice {#[value(name="a")] First}', 'use unknown::ValueEnum; #[derive(ValueEnum)] enum Choice {First}', 'use unknown::automatically_derived; #[derive(clap::ValueEnum)] enum Choice {First}', '#[derive(clap::ValueEnum)] enum Choice {First} #[unknown] struct Sibling;'])assert.equal(context(source).certificates.length,0,source);
});

test('actual imported or qualified Clap derive owners certify source output while trait execution and bang closure stay unresolved',()=>{
  for(const source of ['#[derive(clap::ValueEnum)] enum Choice {First}', 'use clap::ValueEnum as Choices; #[derive(Choices)] enum Choice {First}']) {
    const result=context(source);assert.deepEqual(result.diagnostics,[]);const certificate=result.certificates[0];assert.ok(certificate);assert.deepEqual(certificate.owners[0].target,['clap','ValueEnum']);assert.ok(isClapValueEnumSourceOutput(certificate.clapValueEnumOutput));assert.equal(certificate.clapGeneratedAttributeOwners.generatedAttributeOwnersResolved,true);assert.deepEqual(certificate.clapGeneratedAttributeOwners.names,['allow','automatically_derived']);assert.equal(certificate.generatedImplBehavior,false);assert.equal(certificate.dimensions.bangMacroComplete,false);
  }
});

test('complete unchanged original ClientKind eight variants preserve exact names aliases attributes and source quote bindings',()=>{
  const source=readFileSync(new URL('src/clients.rs',root),'utf8');assert.equal(hash(source),'2f12c5aa34a65ec62b793902cdefe8f36c1b6c414c673e6499ef40c7dbfb8c2d');
  const result=createDeriveFootprintContext({modules:[{file:'src/clients.rs',path:[],source}],dependencies,compilationProfile:PRODUCTION_PROFILE}),certificate=result.certificates.find(row=>row.name==='ClientKind');assert.deepEqual(result.diagnostics,[{source:'src/clients.rs',span:{start:4323,end:4490},name:'ClientIsolation',message:'Standard-only input has an unresolved original ancestor, prelude root or attribute owner'},{source:'src/clients.rs',span:{start:4569,end:7151},name:'ClientIntegration',message:'Standard-only input has an unresolved original ancestor, prelude root or attribute owner'},{source:'src/clients.rs',span:{start:18299,end:18842},name:'ClientManager',message:'Standard-only input has an unresolved original ancestor, prelude root or attribute owner'}]);assert.ok(certificate);
  const item=sourceItems(source).find(row=>row.name==='ClientKind');assert.deepEqual(certificate.span,{start:item.start,end:item.end});assert.equal(certificate.itemSha256,hash(source.slice(item.start,item.end)));
  const proof=certificate.clapValueEnumOutput;assert.deepEqual(proof.input.variants.map(row=>[row.name,row.canonicalName,row.aliases]),[['Codex','codex',[]],['ClaudeCode','claude',['claude-code']],['Cursor','cursor-agent',['cursor']],['GeminiCli','gemini',['gemini-cli']],['GrokCli','grok',['grok-cli']],['Opencode','opencode',[]],['QwenCode','qwen',['qwen-code']],['Agent','agent',[]]]);
  assert.equal(certificate.generatedImplBehavior,false);assert.equal(certificate.dimensions.bangMacroComplete,false);
  retain('05-complete-original-client-output',{source,result,certificate});
});

test('whole original clients module admits its data declaration and source constants in emitted JS and strict TS',{timeout:60000},async()=>{
  const paths=currentOriginalRustPaths(root);
  const result=translateProject({entry:'src/clients.rs',paths,readSource:path=>readFileSync(repositorySourceURL(path,root),'utf8'),cargoManifest:manifest,deriveDependencies:dependencies,compilationProfile:PRODUCTION_PROFILE});
  retain('06-complete-original-client-production',{paths,result});
  const program=parseProgram(JSON.stringify(result.meta.checkedSemanticProgram)),type=program.declarations.get('ClientKind');assert.equal(type.k,'data');assert.equal(type.ctors.length,8);assert.equal(result.meta.runtimeParity,false);
  assert.ok(result.meta.executable.some(row=>row.name==='CODEX_PROVIDER'));assert.ok(result.meta.executable.some(row=>row.name==='CLAUDE_TOKEN_ENV'));
  for(const method of ['ClientKind.legacy_name','ClientKind.from_str_opt'])assert.ok(result.meta.checkedMethods.some(row=>row.name===method));
  const observations=[];await verifyTypedTargets(result,api=>{const values=[api.CODEX_PROVIDER,api.CLAUDE_TOKEN_ENV,api.CLAUDE_BASE_ENV];observations.push(values);assert.equal(api.CODEX_PROVIDER,'link-assistant');assert.equal(api.CLAUDE_TOKEN_ENV,'ANTHROPIC_AUTH_TOKEN');assert.equal(api.CLAUDE_BASE_ENV,'ANTHROPIC_BASE_URL');},{childTimeoutMs:30000});retain('06-original-client-typed-observations',observations);
});
