import {repositorySourceURL} from "./fixtures/repository-paths.mjs";
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {proveClapArgsSourceOutput,assertClapArgsSourceOutput} from '../derive-clap-args.mjs';
import {proveConcatLiteralSourceExpansion,assertConcatLiteralSourceExpansion,isConcatLiteralSourceExpansion} from '../derive-clap-concat.mjs';
import {boundedClapArgHelper} from '../derive-clap-helpers.mjs';
import {createDeriveFootprintContext} from '../derive-footprints.mjs';
import {sourceItems,rustTokens} from '../rust-structure.mjs';
import {translateProject} from '../project.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
const root=new URL('../../../',import.meta.url),manifest=readFileSync(new URL('Cargo.toml',root),'utf8'),lock=readFileSync(new URL('Cargo.lock',root),'utf8'),dependencies=loadDeriveDependencyProof({manifest,lock});
const hash=value=>createHash('sha256').update(value).digest('hex');
function original(source){const item=sourceItems(source).find(item=>item.term==='struct');return {dependencies,source,span:{start:item.start,end:item.end}};}

test('scalar helpers preserve original expression tokens and refuse executable expressions',()=>{
  for(const [source,value]of [['value_parser = parser','parser'],['default_value_t = 4','4'],['num_args = 0..=1','0..=1'],['default_value_t = DEFAULT_DURATION_MINUTES','DEFAULT_DURATION_MINUTES'],['default_value_t = false','false']]){const result=boundedClapArgHelper(rustTokens(source),0,'field','struct');assert.equal(result.value,value);assert.equal(result.evidence.generatedHelperBehavior,false);for(const token of result.evidence.tokens)assert.equal(source.slice(token.span.start,token.span.end),token.text);}
  for(const value of ['default_value_t=call()','default_value_t=emit!()','value_parser=call()','num_args=left..=right','default_value_t=1+2','default_value_t=1u32','default_value_t=0x10'])assert.throws(()=>boundedClapArgHelper(rustTokens(value),0,'field','struct'),TypeError,value);
});

test('formerly refused helper and documentation vectors retain full original positive outputs',()=>{
  const vectors=['#[arg(value_parser=custom)]value:Vec<String>','#[arg(default_value_t=4)]value:u32','#[arg(num_args=0..=1)]value:Option<String>','/// first\n/// second\nvalue:Vec<String>','/// **bold**\nvalue:Vec<String>','#[doc="text"]value:Vec<String>'];
  for(const fields of vectors){const input=original('#[derive(clap::Args)] struct Options{'+fields+'}'),proof=proveClapArgsSourceOutput(input);assert.equal(proof.outputs.length,2,fields);assert.strictEqual(assertClapArgsSourceOutput(proof,input),proof);assert.equal(proof.generatedImplBehavior,false);for(const branch of proof.outputs){assert.equal(branch.semanticSyntaxRoundTrip,true);assert.deepEqual(branch.observation.definitions,[]);assert.deepEqual(branch.observation.macroExports,[]);}}
  const container=proveClapArgsSourceOutput(original('/// first\n/// second\n#[derive(clap::Args)] struct Options{value:Vec<String>}'));assert.equal(container.input.containerDocumentOutput.short,'first second');
});

test('actual builtin concat literal route produces a sealed literal AST without caller authority',async()=>{
  for(const [source,expected]of [['concat!()',''],['concat!("prefix", " field", ".",)','prefix field.'],['concat!("#[macro_export]", " macro_rules! escape {}")','#[macro_export] macro_rules! escape {}']]){
    const proof=proveConcatLiteralSourceExpansion({dependencies,source});assert.equal(proof.value,expected);assert.equal(proof.meta.expression.token.symbol,expected);assert.equal(proof.meta.expression.kind,'Lit');assert.equal(proof.namespaceAuthority,false);assert.equal(proof.callerMacroOwnerResolved,false);assert.equal(proof.generatedImplBehavior,false);assert.strictEqual(assertConcatLiteralSourceExpansion(proof,{dependencies,source}),proof);assert.equal(isConcatLiteralSourceExpansion(structuredClone(proof)),false);assert.throws(()=>assertConcatLiteralSourceExpansion(structuredClone(proof),{dependencies,source}),/Unsealed/);assert.throws(()=>assertConcatLiteralSourceExpansion(proof,{dependencies,source:source+' '}),/mismatched/);
    // Generic test adapter exercises the source-generated literal through both
    // targets; it does not implement any Router method or generated trait.
    const rust='pub fn literal() -> &\'static str {'+proof.outputToken+'}';const result=translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>rust,cargoManifest:manifest,compilationProfile:PRODUCTION_PROFILE});await verifyTypedTargets(result,api=>assert.equal(api.literal(),expected),{childTimeoutMs:30000});
  }
});

test('concat retains literal-kind eager-expression escape and owner boundaries',()=>{
  for(const source of ['concat!(1)','concat!(true)','concat!("\\n")','concat!("é")','concat!(r"raw")','concat!(emit!())','concat!("a" "b")','std::concat!("a")','concat!(b"a")','concat!("a"suffix)'])assert.throws(()=>proveConcatLiteralSourceExpansion({dependencies,source}),TypeError,source);
  assert.throws(()=>proveConcatLiteralSourceExpansion({dependencies:structuredClone(dependencies),source:'concat!("a")'}),/sealed/);
});

for(const [path,name,types,parserTypes,concatCount]of [['src/cli/management_args.rs','ManagementArgs',['bool','u32','u64','bool'],['u32','u64'],8],['src/cli/emergency_args.rs','EmergencyArgs',['bool','bool','u64'],['u64'],6]])test('whole unchanged '+path+' retains complete scalar output and independently closes original caller namespace',()=>{
  const source=readFileSync(repositorySourceURL(path,root),'utf8'),input=original(source),proof=proveClapArgsSourceOutput(input);assert.equal(proof.sourceSha256,hash(source));assert.equal(proof.input.name,name);assert.deepEqual(proof.input.fields.map(field=>field.typeSource),types);assert.deepEqual(proof.valueParserExpansions.map(row=>row.type),parserTypes);assert.ok(proof.originalRules.some(row=>row.role==='typed-default-selected-branch'));assert.ok(proof.originalRules.some(row=>row.role==='scalar-action-branch'));
  for(const branch of proof.outputs){assert.equal(branch.concatExpansions.length,concatCount);assert.equal(branch.semanticSyntaxRoundTrip,true);assert.deepEqual(branch.observation.definitions,[]);assert.deepEqual(branch.observation.macroExports,[]);for(const expansion of branch.concatExpansions){assert.equal(expansion.meta.expression.kind,'Lit');assert.equal(expansion.callerMacroOwnerResolved,false);}}
  const context=createDeriveFootprintContext({modules:[{file:path,path:[],source}],dependencies,compilationProfile:PRODUCTION_PROFILE});assert.equal(context.certificates.length,1);assert.deepEqual(context.diagnostics,[]);assert.equal(context.certificates[0].clapConcatCaller.macroOwnerResolved,true);assert.equal(context.certificates[0].dimensions.bangMacroComplete,false);assert.equal(proof.generatedImplBehavior,false);assert.equal(proof.errorBranchComplete,false);
});

test('caller concat shadows imports and unproved sibling effects remain refused',()=>{
  for(const prefix of ['macro_rules! concat {()=>{}} ','use unknown::concat; ','use unknown::*; ','mod std; ','#[unknown] struct Other; ']){const source=prefix+'#[derive(clap::Args)] struct Options {count:u32}';const context=createDeriveFootprintContext({modules:[{file:'src/lib.rs',path:[],source}],dependencies,compilationProfile:PRODUCTION_PROFILE});assert.equal(context.certificates.length,0,prefix);}
  for(const fields of ['#[arg(default_value_t=make!())]count:u32','#[arg(value_parser=make())]count:u32','#[arg(flatten)]count:u32','count:Custom','count:Vec<u32>','/// é\ncount:u32'])assert.throws(()=>proveClapArgsSourceOutput(original('#[derive(clap::Args)] struct Options{'+fields+'}')),TypeError,fields);
});
