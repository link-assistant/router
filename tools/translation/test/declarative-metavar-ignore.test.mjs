import {repositorySourceURL} from "./fixtures/repository-paths.mjs";
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,copyFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {spawnSync} from 'node:child_process';
import {gunzipSync,gzipSync} from 'node:zlib';
import {originalMacroTrees,originalMacroInvocation} from '../macro-token-trees.mjs';
import {originalMacroMetavarRules,assertOriginalMacroMetavarRules} from '../macro-metavar-source.mjs';
import {compileDeclarativeMacro,expandDeclarativeMacro,isDeclarativeExpansion,declarativeSubInput,declarativeExpansionLineage,declarativeNamespaceObservation} from '../declarative-token-macros.mjs';
const owner=['fixture'],compile=source=>compileDeclarativeMacro(source,{name:'probe',owner}),expand=(source,input)=>expandDeclarativeMacro(compile(source),originalMacroTrees(input));
const leaves=trees=>trees.flatMap(tree=>tree.kind==='group'?leaves(tree.children):tree.kind==='fragment'?leaves(tree.trees):[tree]);
const text=proof=>leaves(proof.trees).map(tree=>tree.text).join(' ');
function retain(name,value){if(!process.env.ROUTER_DOLLAR_TOKEN_VECTORS)return;mkdirSync(process.env.ROUTER_DOLLAR_TOKEN_VECTORS,{recursive:true});writeFileSync(process.env.ROUTER_DOLLAR_TOKEN_VECTORS+'/'+name+'.json.gz',gzipSync(JSON.stringify(value)));}
test('ignore and lifetime semantics retain genuine complete pinned parser/transcriber source proofs',()=>{
 const proof=originalMacroMetavarRules();assert.equal(assertOriginalMacroMetavarRules(proof),proof);assert.equal(proof.ignore.emittedTokens,0);assert.equal(proof.ignore.repetitionArityIncludesReferencedName,true);assert.deepEqual(proof.lifetime.actualTokenKinds,['Lifetime','NtLifetime']);
 for(const name of ['compilerFeatureAuthority','namespaceAuthority','runtimeAuthority'])assert.equal(proof[name],false);
 assert.ok(proof.selectedFunctions.length>=15);assert.ok(proof.selectedFunctions.every(row=>row.semanticSyntaxRoundTrip&&row.syntax.length&&row.span.end>row.span.start));assert.equal(proof.sources.find(row=>row.path.endsWith('metavar_expr.rs')).sha256,'a123126629bd860b3f67b6b9ad9cafcfb01d73d21f581cf2ab70d8c34d238950');assert.throws(()=>assertOriginalMacroMetavarRules(structuredClone(proof)),/genuine/);let reads=0;assert.throws(()=>assertOriginalMacroMetavarRules(new Proxy(proof,{get(){reads++;throw Error('read');}})),/genuine/);assert.equal(reads,0);retain('original-metavar-source-proof',proof);
});
test('ignore emits zero tokens while original referenced captures constrain zero one and repeated output',()=>{
 const source='macro_rules! probe{($($v:ident),*)=>{$(kept ${ignore($v)})*}}';for(const [input,expected] of [['',''],['a','kept'],['a,b,c','kept kept kept']]){const proof=expand(source,input);assert.equal(text(proof),expected);assert.equal(proof.generatedBehavior,false);assert.equal(proof.namespaceComplete,false);retain('ignore-arity-'+input.replaceAll(',',''),{source,input,proof});}
 assert.equal(text(expand('macro_rules! probe{($($v:ident),*)=>{before ${ignore($v)} after}}','a,b')),'before after');
 assert.equal(text(expand('macro_rules! probe{($($($v:ident),*);*)=>{$($(kept ${ignore($v)})*);*}}','a,b;c')),'kept kept ; kept');
 assert.equal(text(expand('macro_rules! probe{($v:ident)=>{${ignore($v)} ${ignore($v)}}}','single')),'');
});
test('ignore enforces original argument binding exact EOF and consistent repetition arity',()=>{
 for(const source of ['${ignore(v)}','${ignore($v,$v)}','${ignore($v) extra}','${ignore($missing)}','${ignore()}','${count($v)}','${index()}','${ignore($r#v)}'])assert.throws(()=>compile('macro_rules! probe{($v:ident)=>{'+source+'}}'),/exactly ignore|Unbound/);
 assert.throws(()=>compile('macro_rules! probe{(${ignore($v)})=>{x}}'),/only in original transcribers/);
 assert.throws(()=>expand('macro_rules! probe{($($a:ident),*;$($b:ident),*)=>{$(${ignore($a)} ${ignore($b)} kept)*}}','a,b;c'),/consistent source repetition arity/);
 assert.throws(()=>expand('macro_rules! probe{($v:ident)=>{$(${ignore($v)} kept)*}}','a'),/consistent source repetition arity/);
});
test('lifetime consumes one genuine bounded token and rejects character raw unicode and extra-token inputs',()=>{
 const source='macro_rules! probe{($v:lifetime)=>{$v}}';for(const input of ["'a","'static","'_","'type"]){const proof=expand(source,input);assert.equal(text(proof),input);assert.equal(proof.trees[0].fragment,'lifetime');retain('lifetime-'+input.slice(1),{source,input,proof});}
 for(const input of ["'a'","'a extra","'λ","'r#raw",'a'])assert.throws(()=>expand(source,input),/does not match|bounded original spelling/);
});
test('original NtLifetime token equality permits private literal forwarding while ty fragments remain opaque',()=>{
 const first=expand('macro_rules! probe{($v:lifetime)=>{($v)}}',"'a"),forwarded=declarativeSubInput(first,[0]);
 const literal=compile("macro_rules! probe{('a)=>{matched}}"),typed=compile('macro_rules! probe{($v:lifetime)=>{$v}}');assert.equal(text(expandDeclarativeMacro(literal,forwarded)),'matched');const second=expandDeclarativeMacro(typed,forwarded);assert.equal(text(second),"'a");assert.equal(declarativeExpansionLineage(second).parent,first);
 const wrong=compile("macro_rules! probe{('static)=>{matched}}");assert.throws(()=>expandDeclarativeMacro(wrong,forwarded),/does not match/);
 const ty=expand('macro_rules! probe{($v:ty)=>{($v)}}','u8');assert.throws(()=>expandDeclarativeMacro(compile('macro_rules! probe{(u8)=>{matched}}'),declarativeSubInput(ty,[0])),/does not match/);assert.throws(()=>expandDeclarativeMacro(typed,structuredClone(forwarded)),/original or privately forwarded/);retain('lifetime-forwarding',{first,second});
});
test('definition input expansion and lineage identity reject clones foreign objects and proxies without traps',()=>{
 const definition=compile('macro_rules! probe{($v:lifetime)=>{${ignore($v)} kept}}'),input=originalMacroTrees("'a"),proof=expandDeclarativeMacro(definition,input);
 assert.throws(()=>expandDeclarativeMacro(structuredClone(definition),input),/sealed definition/);assert.throws(()=>expandDeclarativeMacro(definition,structuredClone(input)),/original or privately forwarded/);assert.equal(isDeclarativeExpansion(structuredClone(proof)),false);assert.throws(()=>declarativeExpansionLineage(structuredClone(proof)),/Unsealed/);let reads=0;const proxy=new Proxy(definition,{get(){reads++;throw Error('read');}});assert.throws(()=>expandDeclarativeMacro(proxy,input),/sealed definition/);assert.equal(reads,0);assert.equal(declarativeNamespaceObservation(proof).dimensions.bangMacroComplete,false);
});
test('complete actual original Visitor lifetime invocation expands unchanged definitions docs attributes and callback tokens',()=>{
 const source=gunzipSync(readFileSync(new URL('../source-profiles/clap-concat/rust-1.89-visit.rs.gz',import.meta.url))).toString('utf8'),roots=originalMacroTrees(source,{maxBytes:256000,maxTokens:32000}),at=roots.findIndex((tree,index)=>tree.text==='macro_rules'&&roots[index+2]?.text==='common_visitor_and_walkers');assert.ok(at>=0);const definitionSpan={start:roots[at].span.start,end:roots[at+3].span.end},definitionSource=source.slice(definitionSpan.start,definitionSpan.end),name='common_visitor_and_walkers',definition=compileDeclarativeMacro(definitionSource,{name,owner:['rustc_ast','visit']});
 const call=source.indexOf("common_visitor_and_walkers!(Visitor<'a>);");assert.ok(call>=0);const invocationSpan={start:call+name.length+2,end:call+name.length+2+"Visitor<'a>".length},invocation=source.slice(invocationSpan.start,invocationSpan.end),originalCall=source.slice(call,invocationSpan.end+1),input=originalMacroInvocation(originalCall),proof=expandDeclarativeMacro(definition,input.trees);const flat=leaves(proof.trees);assert.equal(proof.trees.length,1281);assert.equal(proof.remainingBudgets.steps,15993);assert.equal(proof.remainingBudgets.repetitions,128);assert.equal(proof.remainingBudgets.output,20923);assert.ok(flat.some(tree=>tree.sourceFeature==='original-line-doc-comment'));assert.ok(flat.some(tree=>tree.text==='#'));assert.ok(flat.some(tree=>tree.text==='Visitor'));assert.ok(flat.some(tree=>tree.text==="'a"));assert.ok(!flat.some(tree=>tree.text==='$'));for(const callback of ['walk_item','walk_item_ctxt','walk_attribute','walk_variant','walk_field_def'])assert.ok(flat.some(tree=>tree.text===callback),callback);
 const preserved=flat.filter(tree=>tree.kind==='token'&&tree.sourceSha256===definition.sourceSha256);const originalLeaves=leaves(originalMacroTrees(definitionSource,{maxTokens:32000})),originalTokens=new Set(originalLeaves.map(tree=>JSON.stringify(tree)));for(const tree of preserved){assert.ok(originalTokens.has(JSON.stringify(tree)));if(!tree.sourceFeature)assert.equal(definitionSource.slice(tree.span.start,tree.span.end),tree.text);}assert.equal(flat.filter(tree=>tree.sourceFeature==='original-line-doc-comment').length,originalLeaves.filter(tree=>tree.sourceFeature==='original-line-doc-comment').length);assert.equal(proof.ownerVerified,false);assert.equal(proof.generatedBehavior,false);assert.equal(proof.namespaceComplete,false);assert.equal(declarativeExpansionLineage(proof).definition,definition);assert.throws(()=>expandDeclarativeMacro(definition,originalMacroTrees(invocation),{output:8}),/budget/);retain('complete-original-visitor',{source,definitionSpan,definitionSource,definition,invocationSpan,invocation,originalCall,input,proof,preservedLiteralTokens:preserved.length});
});
test('the same source grammar supports other macro names without granting visitor or compiler feature authority',()=>{
 const source='macro_rules! probe{($Visitor:ident$(<$lt:lifetime>)?)=>{trait $Visitor$(<$lt>)?{fn call$(<$lt ${ignore($lt)}>)?();}}}';for(const input of ['Other',"Other<'a>"]){const proof=expand(source,input);assert.ok(text(proof).includes('Other'));assert.equal(proof.ownerVerified,false);assert.equal(proof.generatedBehavior,false);assert.equal(proof.namespaceComplete,false);retain('generic-optional-lifetime-'+input.replace(/[^A-Za-z]/g,''),{source,input,proof});}
});

test('a changed complete source archive is refused before any parser or runtime authority is issued',()=>{
 const dir=mkdtempSync(join(tmpdir(),'router-759-metavar-tamper-')),root=new URL('../',import.meta.url),profileRoot=new URL('../source-profiles/macro-metavar/',import.meta.url),manifest=JSON.parse(readFileSync(new URL('manifest.json',profileRoot))),base=join(dir,'source-profiles/macro-metavar');mkdirSync(base,{recursive:true});
 for(const name of ['macro-metavar-source.mjs','macro-token-trees.mjs','rust-structure.mjs','rust-item-boundaries.mjs','vendor/formal-ai/lexer.mjs']){const destination=join(dir,name);mkdirSync(dirname(destination),{recursive:true});copyFileSync(repositorySourceURL(name,root),destination);}
 writeFileSync(join(base,'manifest.json'),JSON.stringify(manifest));for(const row of manifest.sources){const destination=join(base,row.archive);mkdirSync(dirname(destination),{recursive:true});copyFileSync(new URL(row.archive,profileRoot),destination);}const altered=join(base,manifest.sources[0].archive);writeFileSync(altered,Buffer.concat([readFileSync(altered),Buffer.from('changed')]));
 const result=spawnSync(process.execPath,['--input-type=module','-e',"import {originalMacroMetavarRules} from './macro-metavar-source.mjs';originalMacroMetavarRules();"],{cwd:dir,encoding:'utf8',timeout:10000});assert.notEqual(result.status,0);assert.match(result.stderr,/Original macro metavariable archive changed/);retain('changed-original-archive',{dir,manifest,status:result.status,stdout:result.stdout,stderr:result.stderr});
});
