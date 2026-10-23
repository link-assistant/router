import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {repositorySourceURL} from './fixtures/repository-paths.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {translateProject,translateProjectOwnedCoreReaderDefinitions,resolveModuleGraph} from '../project.mjs';
import {createMatchesMacroContext,createMatchesEnclosingMacroContext,isMatchesMacroContext,configureMatchesMacroParser,matchesParserFacts} from '../matches-macro-context.mjs';
import {HostRustParser} from '../extensions/host-contracts.mjs';
import {tokenizeRust} from '../extensions/lexical.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {prepareMatchesEnclosingContext} from '../prepare-matches-enclosing-context.mjs';
import {sourceItems,rustTokens} from '../rust-structure.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
const root=new URL('../../../',import.meta.url),read=name=>readFileSync(repositorySourceURL(name,root),'utf8'),manifest=read('Cargo.toml'),lock=read('Cargo.lock'),deriveDependencies=loadDeriveDependencyProof({manifest,lock});
const options=files=>({entry:'src/lib.rs',paths:Object.keys(files),readSource:path=>files[path],cargoManifest:manifest,deriveDependencies,compilationProfile:PRODUCTION_PROFILE});
function scopeJoin(result,configuration){
 const graph=resolveModuleGraph(configuration),context=result.meta.matchesMacroContext;assert.equal(isMatchesMacroContext(context),true);
 for(const module of graph.modules){const parser=new HostRustParser(tokenizeRust(module.source));parser.compilationProfile=graph.compilationProfile;configureMatchesMacroParser(parser,context,{file:module.file,modulePath:module.path});assert.deepEqual(matchesParserFacts(parser).facts.evidence.scopes,result.meta.bindingEvidence.scopes);}
}
function originalClientReproduction(){
 const source=read('src/clients.rs'),declaration=sourceItems(source).filter(item=>item.term==='enum'&&item.name==='ClientKind');assert.equal(declaration.length,1);const tokens=rustTokens(source).filter(token=>token.type!=='comment'),indices=tokens.map((token,index)=>token.text==='fn'&&tokens[index+1]?.text==='from_str_opt'?index:-1).filter(index=>index>=0);assert.equal(indices.length,1);const index=indices[0];assert.equal(tokens[index-1].text,'pub');const open=tokens.findIndex((token,at)=>at>index&&token.text==='{');let depth=1,end=open;while(depth&&++end<tokens.length){if(tokens[end].text==='{')depth++;if(tokens[end].text==='}')depth--;}assert.equal(depth,0);const method=source.slice(tokens[index-1].start,tokens[end].end);return {'src/lib.rs':'pub mod clients;pub fn selected(value:&str)->Option<clients::ClientKind>{clients::ClientKind::from_str_opt(value)}','src/clients.rs':'use clap::ValueEnum;\n'+source.slice(declaration[0].start,declaration[0].end)+'\nimpl ClientKind{\n#[must_use]\n'+method+'\n}'};
}

test('native source composition retains the original public constructor and every complete CST inverse',{timeout:60000},()=>{
 const plan=prepareMatchesEnclosingContext({root:root.pathname});assert.equal(plan.files.length,1);assert.equal(plan.newAcrossInvocationCache,false);assert.equal(plan.sourceAuthority,false);assert.equal(plan.runtimeAuthority,false);const row=plan.files[0];assert.equal(row.current,row.after);assert.ok(row.after.includes(row.selection.nativeCopiedConstructor));assert.equal(row.selection.originalPublicConstructorUnchanged,true);assert.equal(row.selection.independentOriginalCaptureRetained,true);assert.equal(row.selection.originalScopeEqualityGuardUnchanged,true);assert.equal(row.selection.callerSuppliedScope,false);assert.equal(row.nativeBindings.nativeSemanticScopeChecked,true);assert.equal(row.selection.nativeEdits.length,3);assert.deepEqual(row.trace.map(stage=>stage.phase),['language','repository']);for(const stage of row.stages){assert.equal(stage.inverse,stage.before);assert.equal(stage.completeInverse,true);}
});
test('enclosing contexts are independently issued from original sources and copied certificates remain refused',{timeout:60000},()=>{
 const source='#[derive(Debug,Clone,Copy)]pub struct Record{value:u8}pub fn accepted(value:u8)->bool{matches!(value,1)}',configuration=options({'src/lib.rs':source}),graph=resolveModuleGraph(configuration);
 for(const create of [createMatchesMacroContext,createMatchesEnclosingMacroContext]){const context=create({modules:graph.modules,compilationProfile:graph.compilationProfile,deriveDependencies});assert.equal(isMatchesMacroContext(context),true);assert.equal(isMatchesMacroContext(structuredClone(context)),false);const parser=new HostRustParser(tokenizeRust(source));parser.compilationProfile=graph.compilationProfile;assert.throws(()=>configureMatchesMacroParser(parser,structuredClone(context),{file:'src/lib.rs'}),/private original context/);configureMatchesMacroParser(parser,context,{file:'src/lib.rs'});assert.equal(matchesParserFacts(parser).context,context);}
});
test('actual ClientKind declaration and from_str_opt source retain matching owned and method scopes',{timeout:60000},async()=>{
 const files=originalClientReproduction(),configuration=options(files),result=translateProjectOwnedCoreReaderDefinitions(configuration);scopeJoin(result,configuration);assert.ok(result.meta.checkedMethods.some(row=>row.name==='clients.ClientKind.from_str_opt'));assert.ok(result.meta.executable.some(row=>row.name==='selected'));assert.equal(result.meta.runtimeParity,false);
 await verifyTypedTargets(result,api=>{for(const [input,want]of [['codex','Codex'],[' CLAUDE-CODE ','ClaudeCode'],['cursor-agent','Cursor'],['gemini-cli','GeminiCli'],['grok','GrokCli'],['opencode','Opencode'],['qwen-code','QwenCode'],['agent','Agent']]){const value=api.selected(input);assert.equal(value.$,'Some');assert.equal(value.field0.$,want);}assert.equal(api.selected('unknown').$,'None');assert.equal(api.selected('Ω😀').$,'None');},{childTimeoutMs:20000});
});
test('ordinary and owned method scopes preserve unresolved producer and sibling refusals',{timeout:60000},()=>{
 for(const source of ['#[derive(Debug,Clone,Copy)]pub struct Record{value:u8}impl Record{pub fn read(&self)->u8{self.value}}pub fn run(value:Record)->u8{value.read()}','#[unknown]pub struct Record;pub fn run(value:u8)->bool{matches!(value,1)}','#[derive(Debug)]pub struct Record{value:u8}unknown!();pub fn run(value:u8)->bool{matches!(value,1)}']){
  const configuration=options({'src/lib.rs':source}),ordinary=translateProject(configuration),owned=translateProjectOwnedCoreReaderDefinitions(configuration);scopeJoin(ordinary,configuration);scopeJoin(owned,configuration);assert.deepEqual(owned.meta.executable,ordinary.meta.executable);assert.deepEqual(owned.meta.refused,ordinary.meta.refused);assert.equal(owned.meta.runtimeParity,false);
 }
});
