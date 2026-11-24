import {repositorySourceURL} from "./fixtures/repository-paths.mjs";
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {translateProject} from '../project.mjs';
import {rustFixedType} from '../checked-types.mjs';
import {PRIMITIVE_TRY_FROM_PROFILE,primitiveTryFromOriginalSource,primitiveTryFromNamespace,originalFixedTryFromInvocations,pinnedPrimitiveTryFrom,requirePrimitiveTryFromSelection,primitiveTryFromExpansion} from '../extensions/primitive-try-from-source.mjs';
import {originalPrimitiveIntegerConstant,requireOriginalPrimitiveIntegerConstant} from '../extensions/primitive-integer-constants.mjs';
import {originalStandardNumericErrorCopy,requireOriginalStandardNumericErrorCopy} from '../extensions/primitive-try-from-error.mjs';
import {capturePrimitiveTryFromScope} from '../extensions/primitive-try-from-scope.mjs';
import {requireOriginalPrimitiveTryFromBody,captureOriginalPrimitiveTryFrom,checkOriginalPrimitiveTryFrom,originalPrimitiveTryFromSelfType} from '../extensions/primitive-try-from-body.mjs';
import {HostRustParser,HostChecker,parseRust} from '../extensions/host-contracts.mjs';
import {tokenizeRust} from '../extensions/lexical.mjs';
import {standaloneMatchesMacroContext,configureMatchesMacroParser} from '../matches-macro-context.mjs';
import {captureOriginalCargoEdition} from '../cargo-edition-context.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
const root=new URL('../../../',import.meta.url),manifest=readFileSync(repositorySourceURL('Cargo.toml',root),'utf8'),type=name=>({...rustFixedType(name),rustPrimitiveName:name}),hash=value=>createHash('sha256').update(value).digest('hex');
const compile=(source,cargoManifest=manifest)=>translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source,cargoManifest});
const scalar=(name,bits,signed)=>({name,bits,signed,min:signed?-(1n<<BigInt(bits-1)):0n,max:(1n<<BigInt(signed?bits-1:bits))-1n});
const domains=['u8','u16','u32','u64','u128','i8','i16','i32','i64','i128'].map(name=>scalar(name,Number(name.slice(1)),name[0]==='i'));
function vector(name,value){if(!process.env.ROUTER_PRIMITIVE_TRY_FROM_VECTORS)return;mkdirSync(process.env.ROUTER_PRIMITIVE_TRY_FROM_VECTORS,{recursive:true});writeFileSync(process.env.ROUTER_PRIMITIVE_TRY_FROM_VECTORS+'/'+name+'.json',JSON.stringify(value));}
function find(node,predicate){if(!node||typeof node!=='object')return null;if(predicate(node))return node;for(const value of Object.values(node))for(const child of Array.isArray(value)?value:[value]){const result=find(child,predicate);if(result)return result;}return null;}
test('complete immutable numeric error declaration and all original owner/prelude links remain source bearing',{timeout:30000},()=>{
 const input=primitiveTryFromOriginalSource('library/core/src/num/error.rs'),namespace=primitiveTryFromNamespace();assert.equal(input.bytes,4772);assert.equal(hash(input.source),'ec6b580969cb8d5906090a3fc9a02dec01273f501c9c59b7777bbd88a0408970');assert.equal(input.gitBlobSha,'6ef2fdd14c1495d21d09b135b1aac4d553d22196');assert.deepEqual(namespace.trait,['core','convert','TryFrom']);assert.equal(namespace.errorLayout.fields[0].type.kind,'unit');assert.match(namespace.errorDeclaration.original,/pub struct TryFromIntError\(pub\(crate\) \(\)\);/u);assert.deepEqual(namespace.preludeRoutes.map(row=>row.edition),['2021','2024','2021','2024']);assert.equal(PRIMITIVE_TRY_FROM_PROFILE.sources.length,19);assert.equal(namespace.wholeTraitAuthority,false);const copy=originalStandardNumericErrorCopy();assert.equal(requireOriginalStandardNumericErrorCopy(copy),copy);assert.deepEqual(copy.canonicalType,['core','num','TryFromIntError']);assert.equal(copy.layout.fields.length,1);assert.equal(copy.writtenImplementations.length,7);assert.equal(copy.writtenImplementations.filter(row=>row.kind==='inherent').length,1);assert.equal(copy.errorMethodsExecuted,false);assert.equal(copy.copyDropContract.explanatoryDocumentationOnly,true);assert.equal(copy.compilerCallback.completeOutputBuilderExecuted,false);assert.equal(copy.standardSourceKernel.globalWrittenImplAbsenceClaim,false);assert.equal(primitiveTryFromOriginalSource(copy.copyDropContract.sourcePath).source.slice(copy.copyDropContract.span.start,copy.copyDropContract.span.end),copy.copyDropContract.original);vector('full-source-owner-chain',{input,namespace,copy,profile:PRIMITIVE_TRY_FROM_PROFILE});
});
test('all ten actual primitive MIN/MAX initializers execute their original AST without reading documentation values',{timeout:60000},()=>{
 const rows=[];for(const domain of domains)for(const constant of ['MIN','MAX']){const proof=originalPrimitiveIntegerConstant(type(domain.name),constant);assert.equal(BigInt(proof.decimal),constant==='MIN'?domain.min:domain.max);assert.equal(requireOriginalPrimitiveIntegerConstant(proof,type(domain.name),constant),proof);assert.equal(proof.documentationArgumentsUsedAsValues,false);assert.equal(proof.invocation.documentationArgumentsUsedAsValues,false);assert.ok(proof.bodySource.length);assert.equal(hash(proof.bodySource),proof.bodySha256);assert.equal(proof.original.includes(proof.bodySource),true);assert.equal(proof.callerNamespaceJoined,false);rows.push(proof);}vector('twenty-full-original-constant-asts',rows);
});
test('all22 whole original bounded TryFrom invocations retain all60 selected implementations and authentic expansion trees',{timeout:60000},()=>{
 const calls=originalFixedTryFromInvocations();assert.equal(calls.length,22);assert.equal(calls.reduce((count,row)=>count+row.targets.length,0),60);const rows=[];
 for(const call of calls)for(const target of call.targets){const proof=pinnedPrimitiveTryFrom(type(call.input),type(target)),expansion=primitiveTryFromExpansion(proof);assert.equal(requirePrimitiveTryFromSelection(proof),proof);assert.equal(proof.invocation,call);assert.equal(expansion.digest,proof.expansionDigest);assert.match(proof.member.source,/fn try_from/u);assert.equal(proof.constTraitCall,false);assert.equal(proof.wholeMacroAuthority,false);rows.push({proof,expansion});}vector('full-sixty-selected-macro-methods',rows);
});
test('three original bounded bodies execute extrema, failure branches and interior values in JS and strict TS',{timeout:60000},async()=>{
 const source='pub fn upper(value:u64)->i64{i64::try_from(value).unwrap_or(-7)}pub fn lower(value:i64)->u64{u64::try_from(value).unwrap_or(7)}pub fn both(value:i64)->u32{u32::try_from(value).unwrap_or(7)}pub fn only_error()->u64{let failed:Result<u64,u32>=Err(2u32);failed.unwrap_or(7u64)}';
 const result=compile(source);vector('three-ordinary-body-results',{source,result});assert.deepEqual(result.meta.refused,[]);
 // Exercise both literal helper modes independently with heterogeneous error
 // and success payloads, including the failure branch and live fallback.
 const helperFixture=typed=>`
 const numberOrError=(ok${typed?':boolean':''},success${typed?':bigint':''})=>ok?Object.freeze({$: ${typed?"'Ok' as const":"'Ok'"},field0:success}):Object.freeze({$: ${typed?"'Err' as const":"'Err'"},field0:Object.freeze({code:'bounded'})});
 const someOrNone=(some${typed?':boolean':''})=>some?Object.freeze({$: ${typed?"'Some' as const":"'Some'"},field0:'yes'}):Object.freeze({$: ${typed?"'None' as const":"'None'"}});
 const numeric${typed?':bigint':''}=ml_router_unwrap(numberOrError(true,3n),7n,false);
 const failed${typed?':bigint':''}=ml_router_unwrap(numberOrError(false,3n),7n,false);
 const optionValue${typed?':string':''}=ml_router_unwrap(someOrNone(true),'no',true);
 const optionFallback${typed?':string':''}=ml_router_unwrap(someOrNone(false),'no',true);
 if(numeric!==3n||failed!==7n||optionValue!=='yes'||optionFallback!=='no')throw Error('heterogeneous original helper inference/runtime mismatch');
 `;
 const checked={...result,javascript:result.javascript+helperFixture(false),typescript:result.typescript+helperFixture(true)};vector('heterogeneous-result-option-helper-inference',{source,result:checked});

 await verifyTypedTargets(checked,api=>{assert.equal(api.only_error(),7n);for(const [value,golden]of [[0n,0n],[1n,1n],[9223372036854775807n,9223372036854775807n],[9223372036854775808n,-7n],[18446744073709551615n,-7n]])assert.equal(api.upper(value),golden);for(const [value,golden]of [[-9223372036854775808n,7n],[-1n,7n],[0n,0n],[9223372036854775807n,9223372036854775807n]])assert.equal(api.lower(value),golden);for(const [value,golden]of [[-1n,7n],[0n,0n],[4294967295n,4294967295n],[4294967296n,7n]])assert.equal(api.both(value),golden);for(const bad of [-1n,18446744073709551616n,0,'0',true])assert.throws(()=>api.upper(bad));},{childTimeoutMs:20000});
 const wrongFallback={...checked,typescript:checked.typescript+"\nconst wrongResultFallback = ml_router_unwrap(numberOrError(false,3n), 'wrong', false);\n"};
 await assert.rejects(()=>verifyTypedTargets(wrongFallback,()=>{}, {childTimeoutMs:20000}),error=>{const stdout=String(error.stdout??'');vector('strict-wrong-result-fallback',{typescript:wrongFallback.typescript,stdout,stderr:String(error.stderr??''),status:error.status});return /TS(?:2345|2769)/u.test(stdout)&&/string/u.test(stdout);});
});
test('actual source constants compose with original TryFrom without a hardcoded maximum result',{timeout:60000},async()=>{
 const source='pub fn clamp(value:u64)->i64{i64::try_from(value).unwrap_or(i64::MAX)}',result=compile(source);vector('source-maximum-caller',{source,result});assert.deepEqual(result.meta.refused,[]);const node=find(result.meta.checkedSemanticProgram,node=>node.sourceConversionProof?.schema==='original-checked-fixed-try-from-v1');assert.ok(node);assert.equal(node.constEligible,false);assert.equal(node.sourceConversionProof.runtimeParity,false);
 await verifyTypedTargets(result,api=>{assert.equal(api.clamp(0n),0n);assert.equal(api.clamp(9223372036854775807n),9223372036854775807n);assert.equal(api.clamp(9223372036854775808n),9223372036854775807n);assert.equal(api.clamp(18446744073709551615n),9223372036854775807n);},{childTimeoutMs:20000});
 const changed=structuredClone(node);changed.body.value.value='1';assert.throws(()=>requireOriginalPrimitiveTryFromBody(changed),/changed|unissued/);
});
test('copied source selections constants malformed widths signedness and pointer pairs never issue source authority',{timeout:30000},()=>{
 const parser=new HostRustParser(tokenizeRust('Self'));assert.equal(originalPrimitiveTryFromSelfType(parser),null);assert.throws(()=>parser.type(),/Rust type Self/);
 const selection=pinnedPrimitiveTryFrom(type('u64'),type('i64')),constant=originalPrimitiveIntegerConstant(type('i64'),'MAX'),copy=originalStandardNumericErrorCopy();
 for(const fake of [structuredClone(copy),{...copy},new Proxy(copy,{})])assert.throws(()=>requireOriginalStandardNumericErrorCopy(fake),/copied|foreign|unissued/);
 for(const fake of [structuredClone(selection),{...selection},new Proxy(selection,{})])assert.throws(()=>requirePrimitiveTryFromSelection(fake),/copied|unselected/);
 for(const fake of [structuredClone(constant),{...constant},new Proxy(constant,{})])assert.throws(()=>requireOriginalPrimitiveIntegerConstant(fake,type('i64'),'MAX'),/copied|forged/);
 for(const input of [{...type('u64'),bits:32},{...type('u64'),signed:true},{...type('u64'),rustReference:{kind:'shared'}},{...type('u64'),rustOwnership:{kind:'owned'}},{...type('u64'),rustPrimitiveName:undefined}])assert.throws(()=>pinnedPrimitiveTryFrom(input,type('i64')),/actual by-value/);
 for(const input of [{...type('i64'),bits:32},{...type('i64'),signed:false},{...type('i64'),rustReference:{kind:'shared'}},{...type('i64'),rustOwnership:{kind:'owned'}}])assert.throws(()=>originalPrimitiveIntegerConstant(input,'MAX'),/actual by-value/);
 for(const [from,to]of [['usize','i64'],['u64','isize'],['u64','u64'],['u8','u64']])assert.throws(()=>pinnedPrimitiveTryFrom(type(from),type(to)),/fixed integer|bounded nonidentity/);
});
test('original trait imports shadows unknown cfg macros disabled or missing edition and borrowed inputs remain refused',{timeout:60000},()=>{
 const sources=['trait Other{fn try_from(value:u64)->Self;}pub fn bad(value:u64)->i64{i64::try_from(value).unwrap_or(0)}','trait TryFrom<T>{fn try_from(value:T)->Self;}pub fn bad(value:u64)->i64{i64::try_from(value).unwrap_or(0)}','use unknown::TimeZone;pub fn bad(value:u64)->i64{i64::try_from(value).unwrap_or(0)}','#[cfg(unix)]type i64=u64;pub fn bad(value:u64)->i64{i64::try_from(value).unwrap_or(0)}','#![no_implicit_prelude]pub fn bad(value:u64)->i64{i64::try_from(value).unwrap_or(0)}','#[no_implicit_prelude]mod inner{pub fn bad(value:u64)->i64{i64::try_from(value).unwrap_or(0)}}','use fake as core;pub fn bad(value:u64)->i64{i64::try_from(value).unwrap_or(0)}','struct i64;pub fn bad(value:u64)->i64{i64::try_from(value).unwrap_or(0)}','pub fn bad(value:&u64)->i64{i64::try_from(value).unwrap_or(0)}','pub fn bad(value:u64)->i64{unknown!();i64::try_from(value).unwrap_or(0)}','pub const fn bad(value:u64)->i64{i64::try_from(value).unwrap_or(0)}'];
 for(const [index,source]of sources.entries()){const result=compile(source);vector('namespace-refusal-'+index,{source,result});assert.equal(result.meta.executable.some(row=>row.name==='bad'),false);if(source.startsWith('#[no_implicit_prelude]mod '))assert.ok(result.meta.bindingEvidence.diagnostics.some(row=>row.message==='attribute scope requires compilation-condition or procedural expansion evidence'));else assert.ok(result.meta.refused.some(row=>row.name==='bad'));}
 for(const edition of [null,'2015','2018']){const source='pub fn bad(value:u64)->i64{i64::try_from(value).unwrap_or(0)}',result=compile(source,edition===null?null:'[package]\nname="fixture"\nedition="'+edition+'"\n');assert.equal(result.meta.executable.some(row=>row.name==='bad'),false);vector('edition-refusal-'+edition,{source,result});}
});
test('genuine original caller frames reject copied proofs prototype overrides and mutable namespace maps',{timeout:30000},()=>{
 const source='pub fn convert(value:u64)->i64{i64::try_from(value).unwrap_or(0)}';
 const guardedSurface=parseRust(source+'fn main(){}',{cargoManifest:manifest}),checker=new HostChecker('rust',[]);captureOriginalPrimitiveTryFrom(checker,guardedSurface);checker.declare=()=>{throw Error('forged declare callback');};assert.throws(()=>captureOriginalPrimitiveTryFrom(checker,guardedSurface),/method identity|callbacks/);delete checker.declare;
 const originalResolve=Object.getOwnPropertyDescriptor(HostChecker.prototype,'resolveType');try{Object.defineProperty(HostChecker.prototype,'resolveType',{...originalResolve,value(){throw Error('forged prototype callback');}});assert.throws(()=>captureOriginalPrimitiveTryFrom(checker,guardedSurface),/method identity/);}finally{Object.defineProperty(HostChecker.prototype,'resolveType',originalResolve);}
 const surface=parseRust(source+'fn main(){}',{cargoManifest:manifest}),actual=new HostChecker(surface.language,surface.externals??[]);actual.program(surface);const call=find(surface,node=>node.k==='routerPrimitiveTryFromCall');assert.ok(call);const internal=[...actual.items].find(([name])=>name==='ml_standard_source_TryFromIntError');assert.ok(internal);const [name,declaration]=internal;actual.items.set(name,{...declaration});assert.throws(()=>checkOriginalPrimitiveTryFrom(actual,call,new Map([['value',type('u64')]]),[]),/cached standard error/);actual.items.set(name,declaration);declaration.ctors[0].fields[0].type={kind:'bool'};assert.throws(()=>checkOriginalPrimitiveTryFrom(actual,call,new Map([['value',type('u64')]]),[]),/cached standard error/);
 const parser=new HostRustParser(tokenizeRust(source)),context=standaloneMatchesMacroContext(source,{cargoEditionContext:captureOriginalCargoEdition(manifest)});configureMatchesMacroParser(parser,context,{file:'src/module.rs'});const issue=()=>capturePrimitiveTryFromScope(parser,type('i64'),source.indexOf('i64::try_from'));const proof=issue();assert.equal(proof.edition.edition,'2024');parser.sourceNamespaceAliases.type.get('').set('i64',['crate','fake']);assert.throws(issue,TypeError);assert.throws(()=>capturePrimitiveTryFromScope(new Proxy(parser,{}),type('i64'),source.indexOf('i64::try_from')),TypeError);vector('private-original-frame-controls',{source,proof});
});

test('ordinary no-conversion Host extensions check without acquiring numeric source-body authority',{timeout:30000},()=>{
 class Extension extends HostChecker{program(surface){const program=super.program(surface);this.completed=true;return program;}}
 const plain='pub const GOOD:u8=1;pub fn unchanged(value:u8)->u8{value}',extension=new Extension('Rust',[]),program=extension.program(parseRust(plain+'fn main(){}'));
 assert.equal(extension.completed,true);assert.equal(program.declarations.get('GOOD').body.value,'1');assert.ok(program.declarations.has('unchanged'));
 const sources=['pub fn convert(value:u64)->i64{i64::try_from(value).unwrap_or(0)}','pub fn bound()->i64{i64::MAX}'],outcomes=[];
 for(const source of sources){
  const surface=parseRust(source+'fn main(){}',{cargoManifest:manifest}),subclass=new Extension('Rust',[]);
  assert.throws(()=>subclass.program(surface),/actual original Host checker/);assert.equal(subclass.completed,undefined);
  const genuine=new HostChecker('Rust',[]);captureOriginalPrimitiveTryFrom(genuine,surface);
  let reads=0;const fake={get expr(){reads++;throw Error('checker getter');}},proxy=new Proxy(genuine,{get(){reads++;throw Error('checker proxy');},getPrototypeOf(){reads++;throw Error('checker proxy');}});
  for(const wrong of [fake,proxy,{...genuine}])assert.throws(()=>captureOriginalPrimitiveTryFrom(wrong,surface),/actual original Host checker/);
  assert.equal(reads,0);
  const copied=structuredClone(surface),node=find(surface,node=>['routerPrimitiveTryFromCall','routerPrimitiveSourceConstant'].includes(node.k));assert.ok(node);
  captureOriginalPrimitiveTryFrom(genuine,copied);assert.throws(()=>checkOriginalPrimitiveTryFrom(genuine,node,new Map(),[]),/exact privately captured original caller syntax/);
  captureOriginalPrimitiveTryFrom(genuine,surface);captureOriginalPrimitiveTryFrom(genuine,parseRust(plain+'fn main(){}'));assert.throws(()=>checkOriginalPrimitiveTryFrom(genuine,node,new Map(),[]),/exact privately captured original caller syntax/);
  node.span={...node.span,start:node.span.start+1};assert.throws(()=>captureOriginalPrimitiveTryFrom(genuine,surface),/changed after source capture/);
  outcomes.push({source,subclassRefused:true,copiedSourceUnissued:true,oldCallerRevoked:true,mutatedSourceRefused:true,checkerReads:reads});
 }
 let reads=0;const badSurface={get items(){reads++;throw Error('surface getter');}},proxySurface=new Proxy({items:[]},{get(){reads++;throw Error('surface proxy');},getOwnPropertyDescriptor(){reads++;throw Error('surface proxy');}}),proxyItems=new Proxy([],{get(){reads++;throw Error('items proxy');},getOwnPropertyDescriptor(){reads++;throw Error('items proxy');}}),accessorItem={get k(){reads++;throw Error('item getter');}};
 for(const surface of [badSurface,proxySurface,{items:proxyItems},{items:[accessorItem]}])assert.throws(()=>captureOriginalPrimitiveTryFrom(extension,surface),TypeError);
 assert.equal(reads,0);vector('conditional-original-capture-controls',{plain,constant:program.declarations.get('GOOD'),outcomes,hostileSurfaceReads:reads});
});
