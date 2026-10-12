import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {HostRustParser,hasIntegerFrom} from '../extensions/host-contracts.mjs';
import {pinnedPrimitiveBoolFrom,parsePrimitiveBoolFromBody,capturePrimitiveBoolFromScope} from '../extensions/primitive-bool-from-source.mjs';
import {originalFixedFromInvocations,pinnedPrimitiveFrom,parsePrimitiveFromBody,requirePrimitiveFromBody,hasSourceFixedFrom} from '../extensions/primitive-from-source.mjs';
import {rustFixedType,fixedBounds} from '../checked-types.mjs';
import {translateProject} from '../project.mjs';
import {loadJavaScript} from './artifact-loader.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
import {standaloneMatchesMacroContext,configureMatchesMacroParser,matchesParserFacts} from '../matches-macro-context.mjs';
import {tokenizeRust} from '../extensions/lexical.mjs';
import {metadataDigest} from '../extensions/source-links.mjs';
const type=name=>({...rustFixedType(name),rustPrimitiveName:name}),project=source=>translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source});
function find(node,predicate){if(!node||typeof node!=='object')return null;if(predicate(node))return node;for(const value of Object.values(node))for(const child of Array.isArray(value)?value:[value]){const result=find(child,predicate);if(result)return result;}return null;}
const refuse=source=>{const result=project(source);assert.equal(result.meta.executable.some(entry=>entry.name==='bad'),false,source);assert.notEqual(result.meta.refused.length,0,source);};

test('source discovery retains all thirty complete actual stability-bearing invocations',()=>{
  const calls=originalFixedFromInvocations();assert.equal(calls.length,30);assert.equal(new Set(calls.map(call=>call.input+'>'+call.target)).size,30);
  for(const call of calls){assert.match(call.originalInvocation,/#\[stable\(/u);assert.equal(createHash('sha256').update(call.originalInvocation).digest('hex'),call.originalInvocationSha256);assert.equal(call.originalSourceSha256,'270e0801e5e23cba89fec51eed416be60743034a6f02c5fe64be2e8f2e8ca958');assert.equal(hasSourceFixedFrom(call.input,call.target),true);}
});

test('each genuine full invocation forwards into the actual cast body with precise input and Self identities',()=>{
  for(const call of originalFixedFromInvocations()){const selection=pinnedPrimitiveFrom(type(call.input),type(call.target)),proof=parsePrimitiveFromBody(HostRustParser,selection);assert.equal(selection.originalInvocation,call.originalInvocation);assert.equal(selection.forwardingLineage.length,2);assert.equal(selection.firstExpansionDigest,selection.forwardingLineage[0]);assert.equal(selection.expansionDigest,selection.forwardingLineage.at(-1));assert.equal(proof.checkedOperation.kind,'primitive-fixed-infallible-cast');assert.equal(proof.checkedOperation.input.rustPrimitiveName,call.input);assert.equal(proof.checkedOperation.target.rustPrimitiveName,call.target);assert.equal(proof.constTraitCall,false);assert.equal(requirePrimitiveFromBody(proof,type(call.input),type(call.target)),proof);}
});

test('all actual fixed From callers preserve extrema and interior integers in JS and separately strict compiled TS',async()=>{
  const calls=originalFixedFromInvocations(),result=project(calls.map((call,index)=>`pub fn convert_${index}(value:${call.input})->${call.target}{${call.target}::from(value)}`).join(' '));assert.deepEqual(result.meta.refused,[]);
  await verifyTypedTargets(result,api=>{for(const [index,call]of calls.entries()){const bounds=fixedBounds(type(call.input));for(const value of new Set([bounds.min,bounds.min+1n,0n,1n,bounds.max-1n,bounds.max]))assert.equal(api['convert_'+index](value),value);for(const bad of [bounds.min-1n,bounds.max+1n,1,'1',true])assert.throws(()=>api['convert_'+index](bad));}},{childTimeoutMs:30000});
});

test('every missing nonidentity fixed pair remains refused even when one sample would fit',()=>{
  const names=['u8','u16','u32','u64','u128','i8','i16','i32','i64','i128'];
  for(const input of names)for(const target of names)if(input!==target&&!hasSourceFixedFrom(input,target)){assert.equal(hasIntegerFrom(input,target),false);refuse(`pub fn bad(value:${input})->${target}{${target}::from(value)}`);}
});

test('forged widths signs ownership and missing primitive identities cannot select a real macro body',()=>{
  for(const input of [{...type('u8'),bits:16},{...type('u8'),signed:true},{...type('u8'),rustPrimitiveName:undefined},{...type('u8'),rustReference:{kind:'shared'}},{...type('u8'),rustOwnership:{kind:'owned'}}])assert.throws(()=>pinnedPrimitiveFrom(input,type('u64')),/actual checked primitive/);
  assert.throws(()=>pinnedPrimitiveFrom(type('u8'),{...type('u64'),bits:128}),/actual checked primitive/);
});

test('copied selections parsed witnesses and different actual source types do not authorize a cast',()=>{
  const selection=pinnedPrimitiveFrom(type('u8'),type('u64')),proof=parsePrimitiveFromBody(HostRustParser,selection);
  assert.throws(()=>parsePrimitiveFromBody(HostRustParser,structuredClone(selection)),/private original/);assert.throws(()=>requirePrimitiveFromBody(structuredClone(proof),type('u8'),type('u64')),/private unmodified/);assert.throws(()=>requirePrimitiveFromBody(proof,type('u16'),type('u64')),/private unmodified/);assert.throws(()=>requirePrimitiveFromBody(proof,type('u8'),type('u128')),/private unmodified/);
});

test('frozen complete invocation and member lineage cannot be mutated into a different original contract',()=>{
  const selection=pinnedPrimitiveFrom(type('u8'),type('u64'));assert.throws(()=>{selection.originalInvocation='impl_from!(u64=>u8);';},TypeError);assert.throws(()=>{selection.member.source='fn from(small:u8)->Self{0}';},TypeError);assert.throws(()=>{selection.forwardingLineage.push('forged');},TypeError);
});

test('fixed macro stage refuses pointer and generic reflexive proof requests without changing compatibility admission',()=>{
  for(const [input,target]of [['u8','usize'],['u16','usize'],['i8','isize'],['i16','isize'],['u8','isize'],['usize','usize'],['isize','isize'],['u64','u64']]){assert.throws(()=>pinnedPrimitiveFrom(type(input),type(target)),/excludes pointer and generic identity/);assert.equal(hasSourceFixedFrom(input,target),false);assert.equal(hasIntegerFrom(input,target),true);}
});

test('legacy unconditional pointer callers remain executable while fixed reflexive gains separate original body proof',async()=>{
  const cases=[['u8','usize',255n],['u16','usize',65535n],['i8','isize',-128n],['i16','isize',-32768n],['u8','isize',255n],['usize','usize',9n],['isize','isize',-9n],['u64','u64',9n]];
  const result=project(cases.map(([input,target],index)=>`pub fn legacy_${index}(value:${input})->${target}{${target}::from(value)}`).join(' '));assert.deepEqual(result.meta.refused,[]);
  const api=(await loadJavaScript(result.javascript)).translated;for(const [index,[,,value]]of cases.entries())assert.equal(api['legacy_'+index](value),value);assert.equal(find(result.meta.checkedSemanticProgram,node=>node.k==='routerPrimitiveFixedFrom'),null);const identity=find(result.meta.checkedSemanticProgram,node=>node.k==='routerPrimitiveIdentityFrom');assert.notEqual(identity,null);assert.equal(identity.type.rustPrimitiveName,'u64');assert.equal(identity.sourcePrimitiveIdentityFromBody.selection.wholeTraitAuthority,false);
});

test('retained bool public APIs and actual bool caller targets preserve their existing body operation',async()=>{
  const selection=pinnedPrimitiveBoolFrom(type('u64')),body=parsePrimitiveBoolFromBody(HostRustParser,selection);assert.equal(body.checkedOperation.kind,'primitive-bool-to-fixed');assert.equal(body.checkedOperation.falseResidue,'0');assert.equal(body.checkedOperation.trueResidue,'1');
  const api=(await loadJavaScript(project('pub fn flag(value:bool)->u64{u64::from(value)}').javascript)).translated;assert.equal(api.flag(false),0n);assert.equal(api.flag(true),1n);
});

test('fixed From keeps nonconst trait-call refusal independently of its infallible cast body',()=>{
  refuse('pub const fn bad(value:u8)->u64{u64::from(value)}');refuse('pub const bad:u64=u64::from(1u8);');
  assert.equal(project('pub fn ordinary(value:u8)->u64{u64::from(value)}').meta.executable.some(entry=>entry.name==='ordinary'),true);
});

test('borrowed and owning arguments remain refused while explicit genuine primitive reads remain separate',async()=>{
  refuse('pub fn bad(value:&u8)->u64{u64::from(value)}');refuse('pub fn bad(value:Box<u8>)->u64{u64::from(value)}');
  const api=(await loadJavaScript(project('pub fn read(value:&u8)->u64{u64::from(*value)}').javascript)).translated;assert.equal(api.read(255n),255n);
});

test('actual local alternative traits aliases and disabled preludes cannot authorize fixed From',()=>{
  for(const source of ['trait Alternate{fn from(value:u8)->Self;}pub fn bad(value:u8)->u64{u64::from(value)}','trait From<T>{fn from(value:T)->Self;}pub fn bad(value:u8)->u64{u64::from(value)}','use missing::From as Alias;pub fn bad(value:u8)->u64{u64::from(value)}','#![no_implicit_prelude]pub fn bad(value:u8)->u64{u64::from(value)}','trait Marker:Copy{}pub fn bad(value:u8)->u64{u64::from(value)}'])refuse(source);
});

test('custom nominal float and unproved target aliases gain no original fixed conversion authority',()=>{
  for(const source of ['struct Word{value:u64}pub fn bad(value:u8)->Word{Word::from(value)}','pub fn bad(value:u8)->f64{f64::from(value)}','type u64=u8;pub fn bad(value:u16)->u64{u64::from(value)}'])refuse(source);
});

test('common checked metadata retains actual input target body caller and nonconst boundaries',()=>{
  const result=project('pub fn convert(value:u8)->u64{u64::from(value)}'),node=find(result.meta.checkedSemanticProgram,item=>item.k==='routerPrimitiveFixedFrom');assert.notEqual(node,null);assert.equal(node.value.type.rustPrimitiveName,'u8');assert.equal(node.type.rustPrimitiveName,'u64');assert.deepEqual(node.sourceCallerTraitScope.trait,['core','convert','From']);assert.equal(node.sourcePrimitiveFromBody.selection.originalInvocation.includes('#[stable'),true);assert.equal(node.constEligible,false);assert.equal(node.sourcePrimitiveFromBody.selection.wholeTraitAuthority,false);assert.equal(node.sourcePrimitiveFromBody.selection.runtimeParity,false);
});

test('generic and equal-width source domains cannot inherit a widening from one matching numeric sample',()=>{
  refuse('pub fn bad<T>(value:T)->u64{u64::from(value)}');refuse('pub fn bad(value:u64)->i64{i64::from(value)}');refuse('pub fn bad(value:i64)->u64{u64::from(value)}');
});

function genuineFrame(){const source='pub fn convert(value:u8)->u64{u64::from(value)}',parser=new HostRustParser(tokenizeRust(source)),context=standaloneMatchesMacroContext(source);configureMatchesMacroParser(parser,context,{file:'src/module.rs'});return {source,parser,frame:matchesParserFacts(parser),issue:()=>capturePrimitiveBoolFromScope(parser,type('u64'),source.indexOf('u64::from'))};}
test('warmed original frames cannot replace their captured source roots or transplant another genuine context',()=>{
  for(const key of ['context','facts','module','captured','tokens','offset','sourceLength','namespaceDigest']){const state=genuineFrame();state.issue();state.frame[key]=key==='context'?genuineFrame().frame.context:key==='offset'?1:typeof state.frame[key]==='string'?'forged':{};assert.throws(state.issue,TypeError,key);}
});
test('warmed original context wrappers cannot substitute modules evidence profiles or compilation facts',()=>{
  for(const key of ['modules','evidence','profile','compilationProfile']){const state=genuineFrame();state.issue();state.frame.facts[key]=key==='modules'?[]:{};assert.throws(state.issue,TypeError,key);}
});
test('exposed frame and context accessors or proxy replacements cannot invoke getters to issue proof',()=>{
  for(const contextField of [false,true]){const state=genuineFrame();state.issue();let reads=0;const record=contextField?state.frame.facts:state.frame,key=contextField?'evidence':'facts';Object.defineProperty(record,key,{enumerable:true,configurable:true,get(){reads++;return {};}});assert.throws(state.issue,TypeError);assert.equal(reads,0);}
  const state=genuineFrame();state.issue();state.frame.facts=new Proxy(state.frame.facts,{});assert.throws(state.issue,TypeError);
});
test('an exposed expected namespace hash cannot reseal changed original native binding maps',()=>{
  const state=genuineFrame();state.issue();state.parser.sourceNamespaceAliases.type.get('').set('u64',['crate','forged']);state.frame.namespaceDigest=metadataDigest(['type','value','macro'].map(namespace=>[namespace,[...state.parser.sourceNamespaceAliases[namespace]].map(([path,map])=>[path,[...map]])]));assert.throws(state.issue,TypeError);
});
test('own namespace callback overrides before or after a genuine configure remain refused',()=>{
  for(const key of ['builtinShadow','resolveSourceNamespace'])for(const before of [false,true]){
    const source='pub fn convert(value:u8)->u64{u64::from(value)}',parser=new HostRustParser(tokenizeRust(source));if(before)parser[key]=key==='builtinShadow'?()=>false:segments=>segments;
    configureMatchesMacroParser(parser,standaloneMatchesMacroContext(source),{file:'src/module.rs'});if(!before){capturePrimitiveBoolFromScope(parser,type('u64'),source.indexOf('u64::from'));parser[key]=key==='builtinShadow'?()=>false:segments=>segments;}
    assert.throws(()=>capturePrimitiveBoolFromScope(parser,type('u64'),source.indexOf('u64::from')),/namespace callbacks/);
  }
  const state=genuineFrame();let reads=0;Object.defineProperty(state.parser,'builtinShadow',{get(){reads++;return ()=>false;}});assert.throws(state.issue,/namespace callbacks/);assert.equal(reads,0);assert.throws(()=>capturePrimitiveBoolFromScope(new Proxy(genuineFrame().parser,{}),type('u64'),0),/namespace callbacks/);
});
test('definition-time Host and delegating prototype callback mutations cannot manufacture a scope',()=>{
  for(const key of ['builtinShadow','resolveSourceNamespace','inSourceNamespace']){
    const state=genuineFrame();state.issue();let owner=HostRustParser.prototype;while(!Object.hasOwn(owner,key))owner=Object.getPrototypeOf(owner);const original=Object.getOwnPropertyDescriptor(owner,key);
    try{Object.defineProperty(owner,key,{...original,value:()=>false});assert.throws(state.issue,/namespace callbacks/);}finally{Object.defineProperty(owner,key,original);}
    assert.doesNotThrow(state.issue);
  }
});
test('a bounded replacement cursor retaining original tokens does not fabricate a new source origin',()=>{
  const state=genuineFrame(),first=state.issue(),original=state.parser.cursor;
  class BoundedCursor{constructor(){this.tokens=original.tokens;}peek(...args){return original.peek(...args);}}
  state.parser.cursor=new BoundedCursor();assert.equal(state.issue().sourceSha256,first.sourceSha256);assert.equal(matchesParserFacts(state.parser).captured,state.frame.captured);
});
