import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {translateProject} from '../project.mjs';
import {parseRust,checkProgram,HostRustParser,HostChecker} from '../extensions/host-contracts.mjs';
import {tokenizeRust} from '../extensions/lexical.mjs';
import {captureSourceModuleViews} from '../source-module-views.mjs';
import {createMatchesMacroContext,standaloneMatchesMacroContext,configureMatchesMacroParser,proveOriginalMatchesCall,originalMatchesCallFacts} from '../matches-macro-context.mjs';
import {parseOriginalMatchesCandidate,isOriginalMatchesExpansionProof} from '../matches-source-bridge.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
import {verifyCohortTargets} from './cohort-targets.mjs';
import {parseProgram,serializeProgram} from '../semantic-meta.mjs';
const hash=text=>createHash('sha256').update(text).digest('hex');
const project=source=>translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source});
const some=field0=>Object.freeze({$:'Some',field0}),none=Object.freeze({$:'None'}),ok=field0=>Object.freeze({$:'Ok',field0}),err=field0=>Object.freeze({$:'Err',field0}),tuple=(field0,field1)=>Object.freeze({$:'Tuple',field0,field1});
const find=(value,predicate)=>value&&typeof value==='object'&&(predicate(value)?value:Object.entries(value).filter(([key])=>key!=='type').map(([,child])=>Array.isArray(child)?child.map(item=>find(item,predicate)).find(Boolean):find(child,predicate)).find(Boolean));
const checked=result=>parseProgram(JSON.stringify(result.meta.checkedSemanticProgram));
async function both(source,verify){const result=project(source);assert.deepEqual(result.meta.refused,[]);await verifyTypedTargets(result,verify);return result;}
function capture(source){const parser=new HostRustParser(tokenizeRust(source)),context=standaloneMatchesMacroContext(source);configureMatchesMacroParser(parser,context,{file:'src/module.rs'});parser.cursor.index=parser.cursor.tokens.findIndex(token=>token.value==='matches');return {parser,context};}

test('actual original rule produces checked boolean match with opaque caller AST and exact source proof',{timeout:30_000},async()=>{
  const source='// λ 😀\npub fn accepted(v:Option<u8>)->bool{matches!(v,Some(n) if n>2,)} pub fn either(v:Option<&str>)->bool{matches ! {v,Some("a" | "β")}} pub fn absent(v:Option<u8>)->bool{matches![v,None,]}';
  const result=await both(source,api=>{
    for(const [input,expected]of [[none,false],[some(1n),false],[some(3n),true]])assert.equal(api.accepted(input),expected);
    for(const [input,expected]of [[none,false],[some('a'),true],[some('β'),true],[some('b'),false]])assert.equal(api.either(input),expected);
    assert.equal(api.absent(none),true);assert.equal(api.absent(some(0n)),false);
    let reads=0;const proxy=new Proxy(some(3n),{get(){reads++;throw Error('get');},ownKeys(){reads++;throw Error('keys');},getOwnPropertyDescriptor(){reads++;throw Error('descriptor');},getPrototypeOf(){reads++;throw Error('prototype');}});assert.throws(()=>api.accepted(proxy),TypeError);assert.equal(reads,0);
  });
  const program=checked(result),entry=program.declarations.get('accepted'),evidence=find(entry.body,node=>node.sourceMatchesProof)?.sourceMatchesProof;
  assert.ok(evidence);assert.equal(source.slice(evidence.call.originalSpan.start,evidence.call.originalSpan.end),evidence.call.originalInvocation);assert.equal(evidence.call.sourceSha256,hash(source));assert.equal(evidence.call.originalInvocationSha256,hash(evidence.call.originalInvocation));
  assert.equal(evidence.definitionEdition,'2024');assert.equal(evidence.originalRuleInterpreted,true);assert.equal(evidence.opaqueAstProjectionChecked,true);assert.equal(evidence.rustcMacroExecutionObserved,false);
  for(const key of ['namespaceAuthority','applicationEffectCompleteness','runtimeParity','constEligible'])assert.equal(evidence[key],false,key);
  assert.ok(evidence.origins.some(row=>row.callSite&&row.fragment==='pat'));assert.ok(evidence.origins.some(row=>row.definitionSourcePath==='library/core/src/macros/mod.rs'));
  assert.equal(serializeProgram(parseProgram(serializeProgram(program))),serializeProgram(program));
});

test('generated ordered match evaluates subject once and retains guard retry effect order',{timeout:30_000},async()=>{
  const source='fn mark(path:&str)->bool{std::fs::read_to_string(path).is_ok()} fn subject()->Option<u8>{let ignored=mark("subject");Some(1)} pub fn retry()->bool{matches!(subject(),Some(n) | Some(n) if mark("guard"))}';
  const result=project(source);assert.deepEqual(result.meta.refused,[]);
  await verifyCohortTargets(result,(api,{withEffectCapabilities})=>{const calls=[];let guards=0;const capability={fs:{sync:{readFileSync(path){calls.push(path);if(path==='guard'&&++guards===1)throw Object.assign(Error('missing'),{code:'ENOENT'});return new Uint8Array();}}}};assert.equal(withEffectCapabilities(capability,()=>api.retry()),true);assert.deepEqual(calls,['subject','guard','guard']);});
});

test('actual qualified imports and inline caller views retain macro owner and source identity',{timeout:30_000},async()=>{
  const source='use std::matches as accepts; mod left{pub fn check(v:u8)->bool{core::matches!(v,1 | 2)}} pub fn imported(v:u8)->bool{accepts!(v,3)} pub fn nested(v:u8)->bool{left::check(v)}';
  const result=await both(source,api=>{assert.equal(api.imported(3n),true);assert.equal(api.imported(1n),false);assert.equal(api.nested(1n),true);assert.equal(api.nested(2n),true);assert.equal(api.nested(3n),false);});
  const left=find(checked(result).declarations.get('left.check').body,node=>node.sourceMatchesProof)?.sourceMatchesProof;
  assert.ok(left);assert.deepEqual(left.call.modulePath,['left']);assert.deepEqual(left.call.resolved,['core','matches']);assert.equal(source.slice(left.call.originalSpan.start,left.call.originalSpan.end),'core::matches!(v,1 | 2)');
});

test('private views source profile and opaque expansion proofs deny clones mutation and caller flags',()=>{
  const source='pub fn f(value:Option<u8>)->bool{matches!(value,Some(n))}',row=capture(source),node=parseOriginalMatchesCandidate(row.parser,[]),proof=node.sourceMacro.sourceMatchesProof;
  assert.equal(isOriginalMatchesExpansionProof(proof),true);assert.equal(isOriginalMatchesExpansionProof(structuredClone(proof)),false);assert.throws(()=>originalMatchesCallFacts(structuredClone(proof.call)),/Unsealed/);
  const call=proveOriginalMatchesCall(row.parser,{segments:['matches'],start:proof.call.originalSpan.start,end:proof.call.originalSpan.end});assert.equal(originalMatchesCallFacts(call).state.context,row.context);
  assert.throws(()=>proveOriginalMatchesCall(row.parser,{segments:['format'],start:proof.call.originalSpan.start,end:proof.call.originalSpan.end}),/actual original invocation/);
  assert.throws(()=>proveOriginalMatchesCall(row.parser,{segments:['matches'],start:proof.call.originalSpan.start+1,end:proof.call.originalSpan.end}),/invocation|tokens|owner/i);
  assert.throws(()=>configureMatchesMacroParser(row.parser,structuredClone(row.context),{file:'src/module.rs'}),/private original context/);
  const views=captureSourceModuleViews({source:'mod nested{pub fn f()->bool{matches!(1u8,1)}}',sourcePath:'src/lib.rs'});
  const modules=views.views.map(sourceView=>({file:'src/lib.rs',source:'mod nested{pub fn f()->bool{matches!(1u8,1)}}',path:[...sourceView.modulePath],sourceView}));
  assert.throws(()=>createMatchesMacroContext({modules:modules.map(module=>({...module,sourceView:structuredClone(module.sourceView)}))}),/view|genuine|original/i);
  assert.throws(()=>createMatchesMacroContext({modules:modules.map(module=>({...module,path:module.path.length?['forged']:module.path}))}),/path|view|module/i);
  const parsed=parseRust('pub fn f(v:u8)->bool{matches!(v,1)} fn main(){}'),macro=find(parsed,node=>node.sourceMatchesProof);macro.sourceMatchesProof={...macro.sourceMatchesProof,namespaceAuthority:true};assert.throws(()=>checkProgram(parsed),/changed|source|association/i);
  const changed=capture(source);changed.parser.modulePath=['other'];assert.throws(()=>parseOriginalMatchesCandidate(changed.parser,[]),/identity|association|source/i);
  const alias=capture(source);alias.parser.sourceNamespaceAliases.macro.get('').set('matches',['core','matches']);assert.throws(()=>parseOriginalMatchesCandidate(alias.parser,[]),/association|source/i);
});

test('edition-2024 original pat accepts alternatives without exposing opaque pattern tokens',{timeout:30_000},async()=>{
  const result=await both('pub fn f(v:Option<u8>)->bool{matches!(v,Some(1) | None)}',api=>{assert.equal(api.f(none),true);assert.equal(api.f(some(1n)),true);assert.equal(api.f(some(2n)),false);});
  const pattern=find(checked(result).declarations.get('f').body,node=>node.patternControl?.kind==='ordered-scalar-match').patternControl.rows[0].sourcePattern;
  assert.equal(pattern.pattern.k,'or');assert.equal(pattern.tokens.map(token=>token.value).join(' '),'Some ( 1 ) | None');assert.ok(pattern.tokens.every(token=>token.span.start<token.span.end));
});

test('source macro owner unknown cfg attributes guards and const methods stay explicitly refused',()=>{
  for(const source of [
    'macro_rules! matches{($($v:tt)*)=>{false}} pub fn bad(v:u8)->bool{matches!(v,1)}',
    'use external::matches;pub fn bad(v:u8)->bool{matches!(v,1)}',
    'use external::*;pub fn bad(v:u8)->bool{matches!(v,1)}',
    'pub fn bad(v:u8)->bool{macro_rules! matches{($($v:tt)*)=>{false}}matches!(v,1)}',
    'mod child{fn register(){#[macro_export]macro_rules! matches{($($v:tt)*)=>{false}}}}pub fn bad(v:u8)->bool{matches!(v,1)}',
    'mod std{}pub fn bad(v:u8)->bool{std::matches!(v,1)}',
    '#[cfg(unix)] mod hidden{}pub fn bad(v:u8)->bool{matches!(v,1)}',
    '#[external] struct Unknown;pub fn bad(v:u8)->bool{matches!(v,1)}',
    '#![no_implicit_prelude] pub fn bad(v:u8)->bool{matches!(v,1)}',
    'pub const fn bad(v:u8)->bool{matches!(v,1)}',
    'pub fn bad(v:Option<u8>)->bool{matches!(v,Some(n) if {return true;})}',
    'pub fn bad(v:&Option<u8>)->bool{matches!(v,Some(_))}',
  ]){const result=project(source);assert.equal(result.meta.executable.some(item=>item.name==='bad'||item.name==='State.bad'),false,source);assert.ok(result.meta.refused.length,source);}
});

test('nested Result Option tuple projections use actual selected constructor paths',{timeout:30_000},async()=>{
  // Gate must include the independently verified while-let projection-path
  // prerequisite. The old checker is intentionally unable to prove this join.
  assert.ok(HostChecker.prototype.patternProjection.length>=4,'requires verified source pattern projectionPaths prerequisite');
  const source='pub fn nested(v:Result<Option<(u8,&str)>,u8>)->bool{matches!(v,Ok(Some((n,"yes" | "go"))) if n>2)}';
  const result=await both(source,api=>{
    for(const [input,expected]of [[ok(some(tuple(3n,'yes'))),true],[ok(some(tuple(3n,'go'))),true],[ok(some(tuple(2n,'yes'))),false],[ok(some(tuple(3n,'stop'))),false],[ok(none),false],[err(3n),false]])assert.equal(api.nested(input),expected);
  });
  const program=checked(result),entry=program.declarations.get('nested'),plan=find(entry.body,node=>node.patternControl?.kind==='ordered-scalar-match').patternControl.rows[0].plan;
  assert.ok(plan.projectionPaths.length>=3);const checker=new HostChecker('Rust',[]);checker.items=program.declarations;
  const binding=plan.bindings.find(binding=>binding.name==='n'),subject={k:'var',name:'value',type:entry.params[0].type,span:entry.span};assert.ok(binding);
  for(const mutate of [paths=>{paths[0].ctor='Forged';},paths=>{paths[0].data='Forged';},paths=>{paths[0].type={kind:'bool'};}]){const paths=structuredClone(plan.projectionPaths);mutate(paths);assert.throws(()=>checker.patternProjection(subject,binding.projection,binding.type,paths),/actual selected constructor|projection|layout/i);}
});

test('full tracked production context remains pinned with unrelated namespace and method transform obligations',()=>{
  const pins=JSON.parse(readFileSync(new URL('../fixtures/matches-source-originals/provenance.json',import.meta.url),'utf8'));
  for(const pin of pins.records){const source=readFileSync(new URL('../../../'+pin.path,import.meta.url),'utf8');assert.equal(hash(source),pin.sourceSha256);assert.equal(hash(source.slice(pin.originalSpan.start,pin.originalSpan.end)),pin.declarationSha256);assert.equal(pin.productionAdmissionClaim,false);
    const result=translateProject({entry:pin.path,paths:[pin.path],readSource:()=>source});assert.equal(result.meta.executable.some(item=>item.name===pin.name),false);assert.ok(result.meta.refused.length);assert.equal(pin.runtimeParity,false);
  }
});
