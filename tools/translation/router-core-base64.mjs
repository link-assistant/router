// Concrete owned-library boundary. Complete source is data until a genuine
// parser, checked operands, whole-function flow and emission all rejoin it.
import {types} from 'node:util';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {sameType} from './checked-types.mjs';
import {monomorphicTypeName} from './monomorphic.mjs';
import {SOURCE_STR,SOURCE_STRING,sourceVector} from './extensions/source-contract-types.mjs';
import {JSON_CONTRACTS} from './extensions/json-contracts.mjs';
import {requireOriginalPrimitiveTryFromChecker} from './extensions/host-contracts.mjs';
import {originalParsedDeclarationEvidence,originalParsedSyntaxNode,checkedSourceContext,checkedSourceEvidence} from './extensions/source-links.mjs';
import {originalDataFreezeIntrinsicsUnchanged} from './original-json-intrinsics.mjs';
import {matchesParserFacts,originalMatchesDependencyProof} from './matches-macro-context.mjs';
import {deriveDependencyOriginalInputs} from './derive-dependencies.mjs';
import {captureOriginalExternalTraitPackage,originalExternalTraitPackageInputs} from './extensions/external-trait-sources.mjs';
import {originalSourceModuleItems} from './source-module-views.mjs';
import {transportConcreteSyntaxSource} from './concrete-syntax-meta.mjs';
import {createRulePipeline} from './rule-pipeline.mjs';
import {requireRouterCoreFacade,requireRouterCoreFacadeCurrent} from './router-core-formatting.mjs';
import {ROUTER_FORMATTING_FACADE_SOURCE,ROUTER_CORE_BASE64_SOURCE,ROUTER_CORE_BASE64_SHA256} from './router-core-source-data.mjs';
import {retargetCheckedCallback,alphaTree} from './extensions/standard-body-checker.mjs';
import {captureBorrowedLayouts,requireBorrowedLayouts} from './extensions/standard-borrowed-body.mjs';
import {renameFunction} from './vendor/meta-language/translation/ir.js';
import {unsupported,typeError} from './vendor/meta-language/translation/diagnostics.js';
export {ROUTER_CORE_BASE64_SOURCE,ROUTER_CORE_BASE64_SHA256};
const own=Object.hasOwn,desc=Object.getOwnPropertyDescriptor,keys=Reflect.ownKeys,proto=Object.getPrototypeOf;
const freeze=Object.freeze,define=Object.defineProperty,create=Object.create,apply=Reflect.apply,proxy=types.isProxy,array=Array.isArray;
const weakGet=WeakMap.prototype.get,weakSet=WeakMap.prototype.set,weakHas=WeakMap.prototype.has;
const mapGet=Map.prototype.get,mapSet=Map.prototype.set,mapDelete=Map.prototype.delete,mapEach=Map.prototype.forEach,mapSize=Object.getOwnPropertyDescriptor(Map.prototype,'size').get;
const functionText=Function.prototype.toString,plain=Object.prototype,arr=Array.prototype,Reference=WeakRef,deref=WeakRef.prototype.deref;
const operations=[[WeakMap.prototype,'get',weakGet],[WeakMap.prototype,'set',weakSet],[WeakMap.prototype,'has',weakHas],[Map.prototype,'get',mapGet],[Map.prototype,'set',mapSet],[Map.prototype,'delete',mapDelete],[Map.prototype,'forEach',mapEach],[Object,'freeze',freeze],[Object,'defineProperty',define],[Object,'create',create],[Reflect,'apply',apply],[WeakRef.prototype,'deref',deref],[globalThis,'WeakRef',Reference]];
const native=(fn,name)=>typeof fn==='function'&&!proxy(fn)&&apply(functionText,fn,[])===`function ${name}() { [native code] }`;
const qualified=originalDataFreezeIntrinsicsUnchanged()&&operations.every(([owner,name,fn])=>desc(owner,name)?.value===fn&&native(fn,name));
const fail=message=>{throw new TypeError('Owned base64 source boundary: '+message);};
function guard(){if(!qualified||!originalDataFreezeIntrinsicsUnchanged()||desc(Map.prototype,'size')?.get!==mapSize)fail('requires current native private data operations');for(let at=0;at<operations.length;at++){const [owner,name,fn]=operations[at];if(desc(owner,name)?.value!==fn)fail('requires current native private data operations');}}
const get=(map,key)=>apply(weakGet,map,[key]),put=(map,key,value)=>apply(weakSet,map,[key,value]);
// No live Object.values, serializer, iterator or user accessor sees mutable
// private syntax/facts. Every authoritative retained tree is own-data frozen.
function snapshot(value,budget={cells:200000},depth=0,active=[]){
 if(--budget.cells<0||depth>160)fail('data bound');
 if(value===null||typeof value!=='object'){if(['undefined','string','boolean','number','bigint'].includes(typeof value)||value===null)return value;fail('primitive data required');}
 let cycle=false;for(let at=0;at<active.length;at++)if(active[at]===value)cycle=true;const parent=proto(value);
 if(proxy(value)||cycle||parent!==plain&&parent!==null&&parent!==arr)fail('acyclic ordinary own data required');
 const names=keys(value),out=array(value)?[]:create(null),next=[...active,value];
 for(let at=0;at<names.length;at++){const key=names[at],field=desc(value,key);if(typeof key!=='string'||key==='stack'||!field||!own(field,'value'))fail('own data required');if(key==='length'&&array(value))continue;define(out,key,{value:snapshot(field.value,budget,depth+1,next),enumerable:field.enumerable,writable:false,configurable:false});}
 return freeze(out);
}
function same(a,b,budget={cells:200000},depth=0){
 if(--budget.cells<0||depth>160)return false;if(a===b)return true;
 if(a===null||b===null||typeof a!=='object'||typeof b!=='object'||proxy(a)||proxy(b)||array(a)!==array(b)||![plain,null,arr].includes(proto(a))||![plain,null,arr].includes(proto(b)))return false;
 const x=keys(a),y=keys(b);if(x.length!==y.length)return false;
 for(let at=0;at<x.length;at++){if(x[at]!==y[at]||typeof x[at]!=='string'||x[at]==='stack')return false;const p=desc(a,x[at]),q=desc(b,y[at]);if(!p||!q||!own(p,'value')||!own(q,'value')||p.enumerable!==q.enumerable||!same(p.value,q.value,budget,depth+1))return false;}return true;
}
// Genuine source-link relocation and bound source evidence use canonical
// copyMetadata key ordering. Compare every own data field only at those joins;
// array indices, values, spans and enumerability remain exact. No issuance here.
function sameSourceRelocation(a,b,budget={cells:200000},depth=0){
 if(--budget.cells<0||depth>160)return false;
 if(a===null||b===null||typeof a!=='object'||typeof b!=='object')return a===b;
 if(proxy(a)||proxy(b)||array(a)!==array(b))return false;
 const indexed=array(a),left=proto(a),right=proto(b);
 if(indexed?left!==arr||right!==arr:left!==plain&&left!==null||right!==plain&&right!==null)return false;
 const names=keys(a),wanted=keys(b);if(names.length!==wanted.length)return false;
 for(let at=0;at<names.length;at++)if(typeof names[at]!=='string'||names[at]==='stack'||!own(b,names[at]))return false;
 for(let at=0;at<wanted.length;at++){const key=wanted[at],x=desc(a,key),y=desc(b,key);if(typeof key!=='string'||key==='stack'||!x||!y||!own(x,'value')||!own(y,'value')||x.enumerable!==y.enumerable||!sameSourceRelocation(x.value,y.value,budget,depth+1))return false;}return true;
}
const byte=freeze({kind:'fixed',bits:8,signed:false,rustSourceType:true,rustPrimitiveName:'u8'}),usize=freeze({kind:'fixed',bits:64,signed:false,rustSourceType:true,rustPrimitiveName:'usize'});
const vector=sourceVector(byte),errorType={kind:'named',path:['router_core_base64','Base64Error']};
const result={kind:'named',path:[monomorphicTypeName('Result',[vector,errorType])],rustStandardGeneric:{kind:'Result',arguments:[vector,errorType]}};
const slice=JSON_CONTRACTS.find(row=>row.id==='serde_json_from_slice').params[0];
const operationsData=[
 ['standard_encode_bytes',slice],['standard_encode_text',SOURCE_STR],['standard_encode_owned_bytes',vector],['standard_no_pad_encode_text',SOURCE_STR],
 ['url_no_pad_encode_bytes',slice],['url_no_pad_encode_owned_bytes',vector],['url_no_pad_encode_owned_text',SOURCE_STRING],['url_no_pad_encode_array32',{kind:'array',element:byte,rustFixedArray:{length:32},rustSourceType:true}],
 ['standard_decode_text',SOURCE_STR],['standard_decode_owned_text',SOURCE_STRING],['standard_no_pad_decode_text',SOURCE_STR],['url_no_pad_decode_text',SOURCE_STR],['url_no_pad_decode_owned_text',SOURCE_STRING],
];
const displayContract={id:'router_core_base64_error_display',jsExport:'base64ErrorText',rustPath:[],kind:'private-formatter',family:'base64',params:[errorType],ret:SOURCE_STRING,async:false,pure:true,constEligible:false,requiresRefinement:'private-native-base64-error-display',assumptions:['Borrow the actual native Base64Error only inside a genuine source-checked owned function and original source-backed format template.','Native Display and Debug text coincide, but general Rust Debug format syntax remains independently refused.']};
export const ROUTER_CORE_BASE64_CONTRACTS=snapshot([...operationsData.map(([name,input])=>({id:'router_core_base64_'+name,jsExport:'router_core_base64_'+name,rustPath:['crate','translation_core','base64_'+name],kind:'function',family:'base64',params:[input],ret:name.includes('_decode_')?result:SOURCE_STRING,async:false,pure:true,constEligible:false,requiresRefinement:'genuine-owned-base64-call',assumptions:['Concrete base64 0.23.1 library unit; native internals intentionally untranslated.','One argument evaluates once; owned bytes/text move at the call boundary; no generic AsRef or Engine permission.','Bounded scalar UTF8 / dense immutable-runtime byte ABI, 1MiB input; allocation/OOM/Drop implementation is outside successful-resource projection.','Exact alphabet, padding, trailing bits, error variant/precedence and native Display/Debug; unsupported native dispatch remains refused.']})),displayContract]);
const contracts=new Map(ROUTER_CORE_BASE64_CONTRACTS.filter(row=>row.kind==='function').map(row=>[row.rustPath[2],row]));
export const ROUTER_CORE_BASE64_DATA=snapshot([{k:'module',name:'router_core_base64',items:[{k:'data',name:'Base64Error',generated:'router-owned-base64-error',ctors:[{name:'InvalidByte',fields:[{name:'field0',type:usize},{name:'field1',type:byte}]},{name:'InvalidLength',fields:[{name:'field0',type:usize}]},{name:'InvalidLastSymbol',fields:[{name:'offset',type:usize},{name:'symbol',type:byte},{name:'symbol_value',type:byte}]},{name:'InvalidPadding',fields:[]}]}]}]);
const calls=new WeakMap(),rawArgs=new WeakMap(),checkerFrames=new WeakMap(),activeFrames=new WeakMap(),completedFrames=new WeakMap(),issued=new WeakMap(),emitting=new WeakMap();
// Transport custody, not a source/verdict memo: each value is a WeakRef to a
// genuine current parser/checker frame. Fresh source and full body/layout joins
// are mandatory at every emission; copied ids alone are never certificates.
const transport=new Map();let serial=0n;
function transportCapacity(additional){
 guard();
 // At most 1024 live custody envelopes/tombstones. No live record is evicted
 // or accepted by a public id. Native WeakRef keeps a dereferenced record live
 // through this synchronous project's full JS+TS serialize/reparse/emission
 // job; each actual checker frame additionally retains its completed records.
 // A deferred consumer after custody expires must obtain a fresh genuine check.
 if(apply(mapSize,transport,[])+additional>1024){apply(mapEach,transport,[(reference,id)=>{if(!apply(deref,reference,[]))apply(mapDelete,transport,[id]);}]);if(apply(mapSize,transport,[])+additional>1024)fail('1024 live transport envelopes exceeded');}
}
function freshLibrary(library){
 // Existing private capture retains authenticated immutable source DATA. Its
 // memo is not a currentness check: reopen both fixed archive/profile bytes
 // on this call and join every original member again. No trait namespace or
 // generated implementation is admitted by this library-unit ABI boundary.
 const root=new URL('./source-profiles/external-traits/',import.meta.url),profile=readFileSync(new URL('manifest.json',root)),archive=readFileSync(new URL('base64-0.23.1.crate',root)),hash=value=>createHash('sha256').update(value).digest('hex');
 if(hash(profile)!=='4714bd0f2e81bed2d1fa07cb50fa3458f953af8f3b9737e2fe3081f98afcfd7a'||archive.length!==93605||hash(archive)!=='ac07cdecf99051d9a5238b80f35af32cdeba5b336e55d957b318b50137e18da5'||library.dependency.package!=='base64'||library.dependency.version!=='0.23.1'||library.dependency.archiveSha256!==hash(archive))fail('current complete locked library bytes differ');
 if(library.sources.length!==39||library.sources.reduce((n,row)=>n+row.bytes,0)!==404863)fail('complete library member domain differs');
 for(const row of library.sources){if(typeof row.source!=='string'||Buffer.byteLength(row.source)!==row.bytes||hash(row.source)!==row.sha256)fail('complete original member changed');}guard();
}
function source(parser){
 guard();const state=matchesParserFacts(parser),facade=requireRouterCoreFacade(parser),rows=state.facts.modules.filter(row=>row.path.join('::')==='translation_core::base64'),leaf=rows[0];
 if(rows.length!==1||leaf.file!=='src/translation_core/base64.rs'||leaf.source!==ROUTER_CORE_BASE64_SOURCE||leaf.configurationCondition!=='active'||!leaf.sourceView)fail('complete active owned leaf required');originalSourceModuleItems(leaf);
 const dependencies=originalMatchesDependencyProof(state.facts),inputs=deriveDependencyOriginalInputs(dependencies),capture=captureOriginalExternalTraitPackage(dependencies,'base64'),library=originalExternalTraitPackageInputs(capture);
 freshLibrary(library);
 const stage=createRulePipeline([{phase:'language',rules:[{id:'owned-base64:lossless-concrete-library-contract',apply:()=>{const actual=transportConcreteSyntaxSource(leaf.source,{language:'Rust'});if(actual.source!==ROUTER_CORE_BASE64_SOURCE)fail('leaf CST');return actual;}}]},{phase:'repository',rules:[{id:'router-core:bind-fixed-owned-base64-interface',apply:value=>value}]}]).run(null);
 requireRouterCoreFacadeCurrent(parser,facade);guard();if(matchesParserFacts(parser)!==state||deriveDependencyOriginalInputs(dependencies)!==inputs||leaf.source!==ROUTER_CORE_BASE64_SOURCE)fail('source changed');
 return {parser,state,facade,leaf,inputs,library,trace:stage.trace};
}
function current(receipt){const fresh=source(receipt.parser);if(fresh.state!==receipt.state||fresh.leaf!==receipt.leaf||fresh.inputs!==receipt.inputs||!same(snapshot(fresh.library),snapshot(receipt.library)))fail('current source differs');guard();}
export function parseRouterCoreBase64Type(parser){
 const c=parser.cursor;if(!['crate','::','translation_core','::','Base64Error'].every((word,at)=>c.is(word,at)))return null;
 const proof=source(parser);if(c.is('<',5)||c.is('::',5))fail('complete concrete error alias required');c.index+=5;requireRouterCoreFacadeCurrent(parser,proof.facade);guard();return snapshot(errorType);
}
export function parseRouterCoreBase64Call(parser,path){
 const c=parser.cursor;if(!['crate','::','translation_core','::'].every((word,at)=>c.is(word,at))||!contracts.has(c.peek(4).value))return null;
 const first=c.peek(),operation=c.peek(4).value,start=c.index,tokens=c.tokens,proof=source(parser);if(parser.cursor!==c||c.index!==start||c.tokens!==tokens)fail('cursor changed');c.index+=5;c.expect('(','owned base64');const args=[];
 while(!c.is(')')){args.push(parser.expr(path));if(!c.eat(','))break;}const last=c.expect(')','owned base64');requireRouterCoreFacadeCurrent(parser,proof.facade);guard();
 const node={k:'routerCoreBase64Call',operation,args,span:{start:first.start,end:last.end}},receipt={...proof,syntax:snapshot(node)};put(calls,node,receipt);put(rawArgs,args,receipt);return node;
}
function nodes(value,result=[],budget={cells:200000},depth=0,selection='base64'){
 // Eligibility only: uncertain/legacy data gets no new guard, hash or refusal.
 // A selected owned function is subsequently checked by strict snapshot().
 if(--budget.cells<0||depth>160||!value||typeof value!=='object'||proxy(value))return result;const names=keys(value);
 for(let at=0;at<names.length;at++){const key=names[at],field=desc(value,key);if(typeof key!=='string'||!field||!own(field,'value'))return result;}
 const kind=desc(value,'k')?.value;if(selection==='format'?kind==='routerFormat':kind==='routerCoreBase64Call'||kind==='routerHostCall'&&typeof value.id==='string'&&value.id.startsWith('router_core_base64_'))result.push(value);
 for(let at=0;at<names.length;at++){const key=names[at];if(!['type','span','length','compatibilityCore'].includes(key))nodes(desc(value,key).value,result,budget,depth+1,selection);}return result;
}
export function captureRouterCoreBase64Calls(checker,surface){
 const frames=new WeakMap();const visit=list=>{for(const entry of list)if(entry.k==='module')visit(entry.items);else if(entry.k==='fn'){
  const selected=nodes(entry);if(!selected.length)continue;guard();requireOriginalPrimitiveTryFromChecker(checker);const evidence=originalParsedDeclarationEvidence(entry);if(!evidence)fail('original function association required');
  const captured=new WeakMap();for(const node of selected){const origin=originalParsedSyntaxNode(entry,node),direct=origin&&get(calls,origin.original),tail=origin&&get(rawArgs,origin.original.args),receipt=direct??(origin?.original.block===true&&tail&&same(origin.original,snapshot({...tail.syntax,block:true}))?tail:null);
   if(!origin||origin.actual!==node||origin.parser!==receipt?.parser||!same(origin.original,direct?receipt.syntax:snapshot({...receipt.syntax,block:true}))||!sameSourceRelocation(node,origin.relocated))fail('original syntax association required');put(captured,node,{receipt,syntax:snapshot(node)});
  }const formats=new WeakMap();for(const node of nodes(entry,[],{cells:200000},0,'format'))put(formats,node,snapshot(node));put(frames,entry,{syntax:snapshot(entry),evidence:snapshot(evidence),captured,formats,calls:[]});
 }};visit(surface.items);put(checkerFrames,checker,frames);put(completedFrames,checker,[]);
}
function clean(type){return !type?.rustBorrowingUnresolved&&!type?.rustGenericIdentityUnresolved;}
const actualByte=type=>type?.kind==='fixed'&&type.bits===8&&type.signed===false&&type.rustPrimitiveName==='u8'&&type.rustSourceType===true&&!type.rustReference&&!type.rustOwnership&&!type.patternOwnershipRefusal&&clean(type);
function inputKind(type){
 if(!clean(type))return null;
 if(type.kind==='string'&&!type.rustReference&&type.rustOwnership?.source==='str'&&type.rustOwnership.kind==='borrowed'&&!type.patternOwnershipRefusal)return 'text';
 if(type.kind==='string'&&!type.rustReference&&type.rustOwnership?.source==='String'&&type.rustOwnership.kind==='owned'&&['owned String source type','ownership-bearing String type','owned String formatting',undefined].includes(type.patternOwnershipRefusal))return 'owned-text';
 if(type.kind==='array'&&actualByte(type.element)){
  if(type.rustFixedArray?.length===32&&!type.rustReference&&!type.rustOwnership&&!type.patternOwnershipRefusal&&type.rustSourceType===true)return 'array32';
  if(!type.rustReference&&!type.rustFixedArray&&type.rustOwnership?.kind==='owned'&&type.rustOwnership.source==='Vec')return 'owned-bytes';
  const p=type.rustReference?.pointee;if(type.rustReference?.kind==='shared'&&type.patternOwnershipRefusal==='shared source reference'&&type.rustOwnership?.kind==='borrowed'&&type.rustOwnership.source==='slice'&&type.rustSourceType===true&&!type.rustFixedArray&&type.rustReference.tokens?.[0]?.value==='&'&&p?.kind==='array'&&p.rustSourceType===true&&!p.rustReference&&!p.rustFixedArray&&!p.patternOwnershipRefusal&&p.rustOwnership?.kind==='borrowed'&&p.rustOwnership.source==='slice'&&actualByte(p.element))return 'bytes';
 }return null;
}
function errorLayout(checker,span){
 const type=checker.hostType(errorType,[],span),entry=checker.items.get(type.name),wanted=ROUTER_CORE_BASE64_DATA[0].items[0];
 if(entry?.hostTypePath?.join('::')!=='router_core_base64::Base64Error'||entry.generated!=='router-owned-base64-error'||entry.ctors.length!==4)fail('native error layout changed');
 for(let at=0;at<4;at++){const a=entry.ctors[at],b=wanted.ctors[at];if(a.name!==b.name||a.fields.length!==b.fields.length)fail('native error constructors changed');for(let n=0;n<b.fields.length;n++){const actual=checker.resolveType(a.fields[n].type,entry.modulePath,span),expected=checker.hostType(b.fields[n].type,[],span);if(a.fields[n].name!==b.fields[n].name||!sameType(actual,expected))fail('native error fields changed');checker.expectedPrimitiveIdentity(actual,expected,[],span);}}return type;
}
export function checkRouterCoreBase64Call(checker,node,env,path,expected){
 const frame=get(activeFrames,checker),capture=frame&&get(frame.captured,node);if(!capture||!same(node,capture.syntax))throw typeError('owned base64 call lacks its private current source association',node.span);
 requireOriginalPrimitiveTryFromChecker(checker);current(capture.receipt);if(node.args.length!==1)throw typeError('owned base64 requires one argument',node.span);
 const contract=contracts.get(node.operation),value=checker.expr(node.args[0],env,path),kind=inputKind(value.type),required=contract.params[0]===null?null:node.operation.endsWith('_array32')?'array32':node.operation.endsWith('_owned_bytes')?'owned-bytes':node.operation.endsWith('_owned_text')?'owned-text':node.operation.endsWith('_bytes')?'bytes':'text';
 if(kind!==required)throw unsupported('owned base64 operand','requires actual concrete '+required+' ownership and primitive identity',node.span);
 const valueBefore=snapshot(value);
 const error=errorLayout(checker,node.span),ret=node.operation.includes('_decode_')?checker.instantiations.result(checker.hostType(vector,path,node.span),error,node.span):checker.hostType(SOURCE_STRING,path,node.span);
 if(expected){if(!sameType(ret,expected))throw typeError('owned base64 result type differs',node.span);checker.expectedOwnership(ret,expected,path,node.span);checker.expectedPrimitiveIdentity(ret,expected,path,node.span);}
 current(capture.receipt);guard();if(!same(node,capture.syntax)||!same(value,valueBefore))fail('call or checked operand changed during checking');
 const key='owned-base64-transport-'+(++serial),call={k:'routerHostCall',id:contract.id,args:[value],type:ret,constEligible:false,span:node.span,compatibilityCore:{id:'owned-base64-v1',sourceTransport:key,sourceSha256:ROUTER_CORE_BASE64_SHA256,libraryImplementation:'untranslated-base64-0.23.1'}};
 put(issued,call,{frame,key,receipt:capture.receipt});frame.calls.push({call,key,receipt:capture.receipt});return call;
}
// Closed affine source projection. Unknown calls, loans, mutation, loops,
// closures and patterns remain refused rather than silently treating Vec/Text
// as Copy. Branches recharge the union of consumed original bindings.
function flow(checker,entry,frame){
 const owned=type=>inputKind(type)?.startsWith('owned-')||type?.kind==='data';
 const domain=(type,depth=0)=>{if(depth>16||!type||!clean(type))fail('owned type domain');if(inputKind(type))return;
  if(!type.rustReference&&!type.rustOwnership&&!type.patternOwnershipRefusal&&(type.kind==='bool'||type.kind==='unit'||type.kind==='fixed'&&type.rustSourceType===true&&['u8','u16','u32','u64','u128','usize','i8','i16','i32','i64','i128','isize'].includes(type.rustPrimitiveName)))return;
  if(type.kind==='data'&&!type.rustReference&&!type.rustOwnership&&!type.patternOwnershipRefusal){const error=errorLayout(checker,entry.span);if(sameType(type,error))return;const owner=checker.items.get(type.name),args=type.rustStandardGeneric?.arguments;
   if(owner?.standardGeneric?.kind==='Result'&&type.rustStandardGeneric?.kind==='Result'&&args?.length===2&&inputKind(args[0])==='owned-bytes'&&sameType(args[1],error)&&owner.ctors.length===2){for(let at=0;at<2;at++){const ctor=owner.ctors.find(row=>row.name===(at===0?'Ok':'Err'));if(ctor?.fields.length!==1||ctor.fields[0].name!=='field0'||!sameType(checker.resolveType(ctor.fields[0].type,owner.modulePath,entry.span),args[at]))fail('owned result layout');}return;}
  }throw unsupported('owned base64 flow type','only concrete bytes/text/native-error/byte-result and primitive controls are closed',entry.span);
 };
 for(const param of entry.params)domain(param.type);domain(entry.ret);
 const scope=new Map(entry.params.map(row=>[row.name,{linear:owned(row.type),type:snapshot(row.type),used:false}]));let cells=100000;
 const run=(node,env,depth=0)=>{if(--cells<0||depth>128)fail('owned flow bound');if(!node||typeof node!=='object')fail('checked expression required');
  if(node.k==='var'){const value=env.get(node.name);if(!value||!same(node.type,value.type))fail('unknown or retyped source binding');if(value.linear){if(value.used)fail('owned value used after move');value.used=true;}return;}
  if(node.k==='lit'||node.k==='num'||node.k==='unit')return;
  if(node.k==='let'){run(node.value,env,depth+1);const inner=new Map([...env].map(([key,value])=>[key,{...value}]));if(inner.has(node.name))fail('shadowed owned flow binding');inner.set(node.name,{linear:owned(node.value.type),type:snapshot(node.value.type),used:false});run(node.body,inner,depth+1);for(const [key,value]of env)value.used=inner.get(key).used;return;}
  if(node.k==='if'){run(node.cond,env,depth+1);const clone=()=>new Map([...env].map(([key,value])=>[key,{...value}])),a=clone(),b=clone();run(node.then,a,depth+1);run(node.else,b,depth+1);for(const [key,value]of env)value.used=a.get(key).used||b.get(key).used;return;}
  if(node.k==='routerHostCall'){const row=frame.calls.find(row=>row.call===node);if(!row)fail('unknown host call in owned flow');for(const arg of node.args){if(row.borrow){if(arg.k!=='var'||!env.has(arg.name)||env.get(arg.name).used)fail('native error borrow requires a live source local');}else run(arg,env,depth+1);}return;}
  if(node.k==='binary'&&['concat','eq','ne','and','or'].includes(node.op)){run(node.left,env,depth+1);run(node.right,env,depth+1);return;}
  if(node.k==='toString'){run(node.arg,env,depth+1);return;}
  if(node.k==='routerConstObligation'&&node.sourceFeature==='router-core-format'&&node.constEligible===false){run(node.value,env,depth+1);return;}
  if(node.k==='ctor'||node.k==='array'){domain(node.type);for(const value of node.args??node.items??node.values??[])run(value,env,depth+1);return;}
  throw unsupported('owned base64 flow','requires closed affine bindings, constructors and owned calls; '+node.k+' remains unproved',node.span);
 };run(entry.body,scope);
}
export function visitRouterCoreBase64Function(checker,item,path,entry,visit,phase){
 const frame=phase==='declaration-bodies'&&get(get(checkerFrames,checker),item);if(!frame)return visit;
 return (...args)=>{guard();requireOriginalPrimitiveTryFromChecker(checker);if(!same(item,frame.syntax)||!originalParsedDeclarationEvidence(item)||entry!==checker.items.get([...path,item.name].join('.')))fail('source function changed');
  const signature=snapshot({params:entry.params,ret:entry.ret});const signatureCurrent=()=>{guard();if(!same(item,frame.syntax)||!same(signature,snapshot({params:entry.params,ret:entry.ret})))fail('original function signature changed');
   if(signature.params.length!==frame.syntax.params.length)fail('source parameter count');for(let at=0;at<signature.params.length;at++){const source=frame.syntax.params[at],actual=signature.params[at],expected=checker.resolveType(source.type,path,item.span);if(actual.name!==source.name||!same(actual.type,snapshot(expected)))fail('source parameter type changed');}if(!same(signature.ret,snapshot(checker.resolveType(frame.syntax.ret,path,item.span))))fail('source return type changed');guard();};signatureCurrent();put(activeFrames,checker,frame);
  try{const value=visit(...args);signatureCurrent();flow(checker,entry,frame);const body=snapshot({name:entry.fullName,params:entry.params,ret:entry.ret,body:entry.body}),roots=snapshot([...entry.params.map(row=>row.type),entry.ret]),layouts=snapshot(captureBorrowedLayouts(checker,roots));for(const row of frame.calls){current(row.receipt);signatureCurrent();if(!same(body,snapshot({name:entry.fullName,params:entry.params,ret:entry.ret,body:entry.body})))fail('checked function changed across source callbacks');row.record={function:body,call:snapshot(row.call),receipt:row.receipt,roots,layouts};}get(completedFrames,checker).push({entry,body,frame});guard();return value;}finally{put(activeFrames,checker,null);}
 };
}
export function finalizeRouterCoreBase64Program(checker,program,sourceLinks){
 const completed=get(completedFrames,checker);if(!completed?.length)return;guard();requireOriginalPrimitiveTryFromChecker(checker);
 if(program.declarations!==checker.items||!checkedSourceContext(program))fail('requires the actual complete checked parser program');
 // Failed/partial declaration passes never publish transport envelopes. Only
 // the actual complete Host program can hand off its original checked frames.
 const pending=[];for(const row of completed){const evidence=checkedSourceEvidence(sourceLinks,row.entry);if(!evidence)fail('requires genuine complete checked source links');for(const key of keys(row.frame.evidence))if(!sameSourceRelocation(evidence[key],row.frame.evidence[key]))fail('checked source context differs from the original parsed function');if(program.declarations.get(row.entry.fullName)!==row.entry||!same(row.body,snapshot({name:row.entry.fullName,params:row.entry.params,ret:row.entry.ret,body:row.entry.body})))fail('complete checked function changed before transport');for(const call of row.frame.calls){current(call.receipt);pending.push(call);}}
 // All callback-capable joins finish before this complete final readback and
 // bounded publication. A failed/partial pass publishes no new envelope.
 guard();for(const row of completed)if(!same(row.body,snapshot({name:row.entry.fullName,params:row.entry.params,ret:row.entry.ret,body:row.entry.body})))fail('checked function changed across final source rejoin');
 let additional=0;for(const call of pending)if(!apply(mapGet,transport,[call.key]))additional++;transportCapacity(additional);for(const call of pending)apply(mapSet,transport,[call.key,new Reference(call.record)]);guard();
}
function spanSame(a,b){if(!a||!b||typeof a!=='object'||typeof b!=='object')return true;if(own(a,'span')&&!same(a.span,b.span))return false;for(const key of keys(a))if(key!=='span'&&typeof key==='string'&&own(b,key)&&!spanSame(a[key],b[key]))return false;return true;}
export function prepareRouterCoreBase64Emission(emitter,entry,Checker){
 const selected=nodes(entry.body);if(!selected.length)return null;guard();const baseline=snapshot({name:entry.fullName,params:entry.params,ret:entry.ret,body:entry.body}),data=()=>snapshot([...emitter.program.declarations.values()].filter(row=>row.k==='data')),layoutsBefore=data(),verifier=new Checker('Rust',[]);requireOriginalPrimitiveTryFromChecker(verifier);
 verifier.program({language:'Rust',items:layoutsBefore.map(row=>({...row,name:row.fullName})),main:null});
 for(const call of selected){const reference=apply(mapGet,transport,[call.compatibilityCore?.sourceTransport]),record=reference&&apply(deref,reference,[]);if(!record)fail('copied or expired transport receipt');current(record.receipt);const wanted=snapshot(retargetCheckedCallback(record.function,emitter.program)),actual=snapshot({name:entry.fullName,params:entry.params,ret:entry.ret,body:entry.body});
  if(entry.fullName!==record.function.name&&entry.fullName!=='rp_'+Buffer.from(record.function.name).toString('hex')||!same(snapshot(alphaTree({params:actual.params,ret:actual.ret,body:actual.body})),snapshot(alphaTree({params:wanted.params,ret:wanted.ret,body:wanted.body})))||!spanSame(actual,wanted))fail('complete original function or spans changed');errorLayout(verifier,call.span);requireBorrowedLayouts(record.layouts,verifier,emitter.program,snapshot(retargetCheckedCallback(record.roots,emitter.program)));guard();
 }
 const rejoin=()=>{guard();if(!same(baseline,snapshot({name:entry.fullName,params:entry.params,ret:entry.ret,body:entry.body}))||!same(layoutsBefore,data()))fail('emission inputs changed across source/layout callbacks');};rejoin();
 const renamed=snapshot(renameFunction(entry,emitter.state.ident,emitter.state.localReserved()));rejoin();const prior=get(emitting,emitter);put(emitting,emitter,nodes(renamed.body).map(snapshotNode=>snapshot(snapshotNode)));return ()=>put(emitting,emitter,prior);
}
export function requireRouterCoreBase64Emission(emitter,node){
 if(!node?.id?.startsWith('router_core_base64_'))return;guard();if(!get(emitting,emitter)?.some(wanted=>same(node,wanted)))fail('emission lacks its complete current private source frame');
}
export function originalBase64ErrorDisplay(checker,node,piece,value,bind){
 const frame=get(activeFrames,checker),syntax=frame&&get(frame.formats,node);if(!syntax||!same(node,syntax)||piece.spec||!node.sourceTemplateControl||!node.sourceDisplayScope)return null;
 const error=errorLayout(checker,node.span);if(!sameType(value.type,error)||value.type.rustReference||value.type.rustOwnership||value.type.patternOwnershipRefusal||!clean(value.type))return null;
 const receipt=frame.calls[0]?.receipt;if(!receipt)fail('formatter requires an actual owned call in its original source function');current(receipt);requireOriginalPrimitiveTryFromChecker(checker);guard();if(!same(node,syntax))fail('original formatter changed during source checking');
 const key='owned-base64-transport-'+(++serial),call={k:'routerHostCall',id:displayContract.id,args:[value],type:checker.hostType(SOURCE_STRING,[],node.span),constEligible:false,span:node.span,compatibilityCore:{id:'owned-base64-v1',sourceTransport:key,sourceSha256:ROUTER_CORE_BASE64_SHA256,libraryImplementation:'untranslated-base64-0.23.1'}};
 frame.calls.push({call,key,receipt,borrow:true});return bind(call);
}
// Reproducible source-DATA rendering; not admission or a manually repinned
// generated asset. Root receiving must invoke this API and compare full bytes.
export function prepareCoreBase64SourceData(){
 const facade=readFileSync(new URL('../../src/translation_core.rs',import.meta.url),'utf8'),leaf=readFileSync(new URL('../../src/translation_core/base64.rs',import.meta.url),'utf8');
 if(facade!==ROUTER_FORMATTING_FACADE_SOURCE||leaf!==ROUTER_CORE_BASE64_SOURCE)fail('physical facade/leaf differ from complete source data');
 const hash=value=>createHash('sha256').update(value).digest('hex'),before=readFileSync(new URL('./router-core-source-data.mjs',import.meta.url),'utf8'),edits=[];let rendered=before;
 for(const [name,value]of [['ROUTER_FORMATTING_FACADE_SOURCE',facade],['ROUTER_FORMATTING_FACADE_SHA256',hash(facade)],['ROUTER_CORE_BASE64_SOURCE',leaf],['ROUTER_CORE_BASE64_SHA256',hash(leaf)]]){
  const prefix='export const '+name+'=',start=rendered.indexOf(prefix);if(start<0||rendered.indexOf(prefix,start+prefix.length)>=0)fail('source-data assignment is not unique');const end=rendered.indexOf('\n',start);if(end<0||rendered[end-1]!==';')fail('complete source-data assignment required');const expected=rendered.slice(start,end),replacement=prefix+JSON.stringify(value)+';';edits.push({span:[start,end],expected,replacement});rendered=rendered.slice(0,start)+replacement+rendered.slice(end);
 }
 return {facade:{source:facade,sha256:hash(facade)},leaf:{source:leaf,sha256:hash(leaf)},sourceData:{before,source:rendered,sha256:hash(rendered),edits},executableAdmission:false};
}
