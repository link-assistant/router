// Explicit definition-only normal bodies; source/owner issuers stay private.
import {createHash} from 'node:crypto';
import {types} from 'node:util';
import {JSON_DATA} from './extensions/json-contracts.mjs';
import {annotateRuntimeTypes} from './translate.mjs';
import {ownershipCompiler} from './js-to-rust/vendor/module-syntax.mjs';
import {assertReverseConcreteSourceHost} from './js-to-rust/concrete-source.mjs';
import {createRulePipeline} from './rule-pipeline.mjs';
import {prepareOwnedCorePairedTypes} from './js-to-rust/owned-core-paired-types.mjs';
import {originalDataFreezeIntrinsicsUnchanged,originalCapturedFunctionSource} from './original-json-intrinsics.mjs';
import {originalParsedDeclarationEvidence,originalParsedSyntaxNode,checkedSourceContext,bindCheckedSourceLinks,checkedSourceEvidence} from './extensions/source-links.mjs';
import {jsonMacroParserOriginal,assertJsonMacroCall,sealJsonMacroCall} from './json-macro-context.mjs';
import {parseJsonMacroSyntax} from './json-macro-syntax.mjs';
import {capturedRustTokenSource} from './extensions/lexical.mjs';
import {requireRouterCoreFacade,requireRouterCoreFacadeCurrent} from './router-core-formatting.mjs';
const fail=message=>{throw new TypeError('Forward Json constructor: '+message);};
const hash=source=>{assertReverseConcreteSourceHost();const result=createHash('sha256').update(source).digest('hex');assertReverseConcreteSourceHost();return result;};
const roles=['Value','Number','MapEntry','Map_String_Value'];
const descriptor=Object.getOwnPropertyDescriptor,keys=Reflect.ownKeys,prototype=Object.getPrototypeOf,freeze=Object.freeze,isArray=Array.isArray,own=Object.hasOwn;
const objectPrototype=Object.prototype,arrayPrototype=Array.prototype,mapPrototype=Map.prototype,mapEntries=Map.prototype.entries,mapGet=Map.prototype.get,apply=Reflect.apply;
const jsonOwner=JSON,jsonStringify=descriptor(jsonOwner,'stringify');
const typeOwner=types,proxyDescriptor=descriptor(typeOwner,'isProxy'),isProxy=proxyDescriptor&&own(proxyDescriptor,'value')?proxyDescriptor.value:null;
const initiallyQualified=typeof isProxy==='function'&&originalCapturedFunctionSource(isProxy)==='function isProxy() { [native code] }'&&!isProxy(typeOwner)&&jsonStringify&&own(jsonStringify,'value')&&originalCapturedFunctionSource(jsonStringify.value)==='function stringify() { [native code] }'&&originalDataFreezeIntrinsicsUnchanged();
// Identity is tested before reflecting the live built-in owner: a rebound
// Proxy cannot install a callback inside the protected native-only region.
function ready(){
 if(!initiallyQualified||types!==typeOwner||isProxy(typeOwner))return false;
 const actual=descriptor(typeOwner,'isProxy');
 return !!(actual&&own(actual,'value')&&actual.value===isProxy&&actual.enumerable===proxyDescriptor.enumerable&&actual.configurable===proxyDescriptor.configurable&&actual.writable===proxyDescriptor.writable&&originalDataFreezeIntrinsicsUnchanged());
}
function ownData(value,name){if(!value||typeof value!=='object'||isProxy(value))fail('own data source carrier required');const field=descriptor(value,name);if(!field||!own(field,'value'))fail('own data source carrier field required');return field.value;}
function entryIdentity(entry){return snapshot({term:ownData(entry,'term'),name:ownData(entry,'name'),file:ownData(entry,'file'),path:ownData(entry,'path'),span:ownData(entry,'span'),globalSpan:ownData(entry,'globalSpan')});}
function parentIdentity(parent){return snapshot({file:ownData(parent,'file'),path:ownData(parent,'path'),source:ownData(parent,'source')});}
// No Hash/JSON/Buffer/FS/observer boundary occurs inside this fresh snapshot.
// Complete keys (including lazy stack rejection) precede descriptors/children;
// no live mutable authoritative node or unfinished projection escapes it.
function snapshot(input){
 if(!ready())fail('native source data operations changed');
 let cells=200000,units=4194304;const active=[];
 function visit(value,depth){
  if(--cells<0||depth>160)fail('source snapshot budget');
  if(value===null||value===undefined||typeof value==='boolean'||typeof value==='bigint')return value;
  if(typeof value==='string'){units-=3*value.length;if(units<0)fail('source snapshot text budget');return value;}
  if(typeof value==='number'){if(value%1!==0||value>9007199254740991||value< -9007199254740991)fail('source snapshot number');return value;}
  if(!value||typeof value!=='object'||isProxy(value)||active.includes(value))fail('acyclic own data source required');
  const array=isArray(value),parent=prototype(value);if(array?parent!==arrayPrototype:parent!==objectPrototype&&parent!==null)fail('source snapshot prototype');
  const names=keys(value),fields=[];for(let at=0;at<names.length;at++)if(typeof names[at]!=='string'||names[at]==='stack')fail('source snapshot hidden or lazy field');
  for(let at=0;at<names.length;at++){const field=descriptor(value,names[at]);if(!field||!own(field,'value')||!field.enumerable&&!(array&&names[at]==='length'))fail('source snapshot accessor or hidden field');fields[at]=field;}
  const length=array?descriptor(value,'length').value:0;if(array&&(length%1!==0||length<0||length>cells||names.length!==length+1))fail('dense source array required');
  active[active.length]=value;const result=array?[]:{__proto__:null};
  for(let at=0;at<names.length;at++){const name=names[at];if(array&&name==='length')continue;if(array&&name!==''+at)fail('ordered dense source array required');result[name]=visit(fields[at].value,depth+1);}
  active.length--;return freeze(result);
 }
 const result=visit(input,0);if(!ready())fail('native source operations changed during snapshot');return result;
}
// Frozen snapshot/model equality only; JSON observer calls cannot influence it.
function same(left,right,budget={cells:200000},depth=0){
 if(--budget.cells<0||depth>160)return false;if(left===right)return true;
 if(!left||!right||typeof left!=='object'||typeof right!=='object'||isProxy(left)||isProxy(right)||isArray(left)!==isArray(right))return false;
 const a=keys(left),b=keys(right);if(a.length!==b.length)return false;
 for(let at=0;at<a.length;at++)if(typeof a[at]!=='string'||a[at]==='stack'||typeof b[at]!=='string'||b[at]==='stack')return false;
 for(let at=0;at<a.length;at++){const name=a[at],x=descriptor(left,name),y=descriptor(right,name);if(!x||!y||!own(x,'value')||!own(y,'value')||x.enumerable!==y.enumerable||!same(x.value,y.value,budget,depth+1))return false;}return true;
}
function renamed(value,names){
 if(Array.isArray(value))return value.map(child=>renamed(child,names));
 if(!value||typeof value!=='object')return value;
 return Object.fromEntries(Object.entries(value).map(([key,child])=>[key,key==='name'&&typeof child==='string'&&names.has(child)?names.get(child):key==='path'&&Array.isArray(child)&&names.has(child.filter((part,at)=>at!==0||part!=='crate').join('.'))?['crate',names.get(child.filter((part,at)=>at!==0||part!=='crate').join('.'))]:renamed(child,names)]));
}
// Fresh callback-free products. Native Map iteration is reached only after
// its brand/prototype/own-key qualification; no public Map method is called.
function products(original,current,lowered,checked,target){
 if(!ready())fail('native product capture operations changed');
 function field(value,name){if(!value||typeof value!=='object'||isProxy(value))fail('own data product owner required');const result=descriptor(value,name);if(!result||!own(result,'value'))fail('own data product field required');return result.value;}
 function rows(map){if(!map||isProxy(map)||prototype(map)!==mapPrototype||keys(map).length)fail('actual unmodified declaration Map required');return [...apply(mapEntries,map,[])];}
 function data(map){const result=[];for(const pair of rows(map)){const row=pair[1];if(field(row,'k')!=='data')continue;const path=descriptor(row,'hostTypePath');if(!path)continue;if(!own(path,'value'))fail('own native owner path required');const actual=snapshot(path.value);if(isArray(actual)&&actual.length===2&&actual[0]==='serde_json'&&roles.includes(actual[1]))result.push(row);}return result;}
 const sourceMap=field(checked,'declarations'),targetMap=field(field(target,'program'),'declarations'),lowerMap=field(field(lowered,'program'),'declarations'),names=field(target,'names'),lower=field(lowered,'own');
 for(const map of [sourceMap,targetMap,lowerMap,names])rows(map);
 const name=field(original,'fullName'),flat=apply(mapGet,names,[name]);
 if(apply(mapGet,sourceMap,[name])!==original||field(current,'fullName')!==flat||field(lower,'fullName')!==flat||apply(mapGet,targetMap,[flat])!==current||apply(mapGet,lowerMap,[flat])!==lower)fail('live declaration membership differs');
 return snapshot({original,current,lowered:lower,sourceData:data(sourceMap),targetData:data(targetMap),lowerData:data(lowerMap),lowerDeclarations:rows(lowerMap).map(pair=>pair[1]).filter(row=>field(row,'k')==='data'),emitted:field(lowered,'emitted'),names:rows(names)});
}
// The exact portable schema subset used by these four registered owners.
// This mirrors valueSchema's field order/names/recursive references, but uses
// private literal records rather than the otherwise unpinned Object.create.
function canonicalSchema(data,names){
 function type(value){
  if(['bool','string','float'].includes(value.kind))return {kind:value.kind};
  if(value.kind==='fixed'&&[8,16,32,64,128].includes(value.bits)&&typeof value.signed==='boolean')return {kind:'fixed',bits:value.bits,signed:value.signed};
  if(value.kind==='array'&&value.rustFixedArray===undefined)return {kind:'array',element:type(value.element)};
  const name=value.kind==='data'?value.name:value.kind==='named'?value.path.filter((part,at)=>at!==0||part!=='crate').join('.'):null,registered=names.get(name);
  if(!registered)fail('complete registered recursive field type required');return {kind:'data',name:registered};
 }
 return data.map(row=>({kind:'data',name:names.get(row.fullName),ctors:row.ctors.map(ctor=>({name:ctor.name,fields:ctor.fields.map((field,at)=>({name:field.name??'field'+at,type:type(field.type)}))}))}));
}
function layouts(frozen){
 const sourceNames=new Map(),targetNames=new Map(),sourceData=[],targetData=[],lowerData=[],names=new Map(frozen.names);
 for(const role of roles){
  const rows=frozen.sourceData.filter(row=>row.generated==='router-json-contract'&&row.hostTypePath?.join('::')==='serde_json::'+role);if(rows.length!==1)fail('actual canonical Json owner absent or ambiguous');
  const original=rows[0],name=names.get(original.fullName),targets=frozen.targetData.filter(row=>row.fullName===name),lowers=frozen.lowerData.filter(row=>row.fullName===name);
  if(targets.length!==1||lowers.length!==1)fail('unique actual canonical target owner required');const current=targets[0],lower=lowers[0];
  if(current.generated!=='router-project-flattened'||lower.generated!=='router-project-flattened'||current.hostTypePath?.join('::')!=='serde_json::'+role||lower.hostTypePath?.join('::')!=='serde_json::'+role)fail('actual canonical target owner differs');
  sourceNames.set(original.fullName,'serde_json.'+role);targetNames.set(name,'serde_json.'+role);sourceData.push(original);targetData.push(current);lowerData.push(lower);
 }
 const registered=snapshot(JSON_DATA),wanted=registered[0].items.filter(row=>roles.includes(row.name)).map(row=>({...row,fullName:'serde_json.'+row.name})),expected=canonicalSchema(wanted,new Map(roles.map(role=>['serde_json.'+role,'serde_json.'+role])));
 for(const [data,registered]of [[sourceData,sourceNames],[targetData,targetNames],[lowerData,targetNames]])if(!same(canonicalSchema(data,registered),expected))fail('complete canonical Json layouts differ');
 return {sourceNames,targetNames};
}
function role(type){
 if(!type||type.rustReference||type.patternOwnershipRefusal||type.rustGenericIdentityUnresolved||type.rustBorrowingUnresolved)return null;
 if(type.kind==='bool'&&!type.rustOwnership&&(type.rustPrimitiveName===undefined||type.rustPrimitiveName==='bool'))return 'bool';
 if(type.kind==='string'&&same(type.rustOwnership,{kind:'borrowed',source:'str'}))return 'str';return null;
}
function canonicalJson(type,names){return type?.kind==='data'&&names.get(type.name)==='serde_json.Value'&&!type.rustReference&&!type.rustOwnership&&!type.patternOwnershipRefusal&&!type.rustBorrowingUnresolved&&!type.rustGenericIdentityUnresolved;}
function shifted(value,offset){return isArray(value)?value.map(child=>shifted(child,offset)):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).map(([name,child])=>[name,name==='span'?{start:child.start+offset,end:child.end+offset}:shifted(child,offset)])):value;}
function sourceCalls(entry,parent){
 const evidence=originalParsedDeclarationEvidence(entry.surface),checkedSpan=snapshot(ownData(entry.surface,'span'));
 // Item spans include visibility/attributes; the parser's fn span starts only
 // after those tokens. Both coordinate frames retain their actual private join.
 if(!evidence||evidence.sourcePath!==entry.file||evidence.sourceSha256!==hash(parent.source)||evidence.declarationSha256!==hash(parent.source.slice(entry.span.start,entry.span.end))||!same(evidence.declarationSpan,entry.span)||!same(evidence.checkedSpan,checkedSpan)||evidence.sourceOffset!==entry.globalSpan.start-entry.span.start||evidence.sourceOffset!==entry.globalSpan.end-entry.span.end||checkedSpan.start<entry.globalSpan.start||checkedSpan.end>entry.globalSpan.end||checkedSpan.end<checkedSpan.start)fail('genuine full original parent association required');
 const calls=[];let cells=200000;
 function visit(node,depth=0){
  if(--cells<0||depth>160)fail('original call census budget');if(!node||typeof node!=='object')return;
  if(node.k==='routerJsonMacro'||node.k==='routerCoreJsonCall'){
   const origin=originalParsedSyntaxNode(entry.surface,node);if(!origin||origin.actual!==node)fail('actual original parsed macro node required');
   const raw=origin.original,span=raw.span,captured=capturedRustTokenSource(origin.parser.cursor.tokens),source=captured?.source.slice(span.start,span.end);
   if(!captured||captured.source!==parent.source.slice(entry.span.start,entry.span.end)||typeof source!=='string'||!source.length)fail('complete original declaration token source differs');
   const syntax=parseJsonMacroSyntax(source);if(!same(raw.jsonTree,shifted(syntax.value,span.start))||!same(node.jsonTree,origin.relocated.jsonTree))fail('original macro tree source association differs');
   let proof,facade;
   if(raw.k==='routerJsonMacro'){
    const original=assertJsonMacroCall(raw.jsonMacroProof),facts=jsonMacroParserOriginal(origin.parser);
    if(!facts||facts.source!==captured.source||facts.offset!==entry.span.start||facts.file!==entry.file||!same(facts.modulePath,entry.path)||original.originalSource!==source)fail('ordinary original macro parser context differs');
    proof=sealJsonMacroCall(origin.parser,{segments:syntax.path,start:span.start,end:span.end,syntax});
   }else{
    if(syntax.path.join('::')!=='crate::translation_core::json')fail('actual qualified owned macro source required');
    facade=requireRouterCoreFacade(origin.parser);requireRouterCoreFacadeCurrent(origin.parser,facade);
   }
   calls.push({node,origin,syntax,proof,facade,source});return;
  }
  for(const [name,value]of Object.entries(node))if(!['type','span','jsonMacroProof','jsonTree'].includes(name)){if(isArray(value))value.forEach(child=>visit(child,depth+1));else visit(value,depth+1);}
 }
 visit(entry.surface.body);if(calls.length!==1)fail('one complete source-bound constructor call required');return calls;
}
function project(fn,names){
 if(fn.k!=='fn'||fn.async||!canonicalJson(fn.ret,names)||!fn.params.length||fn.params.length>8)fail('ordinary scalar parameters and owned canonical Json return required');
 const scope=new Map(),parameters=fn.params.map((parameter,at)=>{const kind=role(parameter.type);if(!kind||parameter.type.rustSourceType!==true||scope.has(parameter.name))fail('actual primitive source parameter required');scope.set(parameter.name,{name:'input'+at,role:kind,type:parameter.type});return {name:'input'+at,role:kind};});
 let cells=0,locals=0,macros=0;const tick=depth=>{if(++cells>4096||depth>64)fail('finite normal body budget');};
 function expression(node,bindings,depth){
  tick(depth);const kind=role(node?.type);if(!kind)fail('actual checked scalar expression required');
  if(node.k==='var'){const bound=bindings.get(node.name);if(!bound||bound.role!==kind||!same(bound.type,node.type))fail('actual lexical scalar binding differs');return {kind:'variable',name:bound.name,role:kind};}
  if(node.k==='lit'){
   if(kind==='str'&&(typeof node.value!=='string'||node.type.rustBorrowLifetime?.kind!=='static'||node.type.rustBorrowLifetime.source!=='string-literal')||kind==='bool'&&typeof node.value!=='boolean')fail('actual standard scalar literal required');return {kind:'literal',value:node.value,role:kind};
  }
  if(node.k==='if'){const cond=expression(node.cond,bindings,depth+1),yes=expression(node.then,bindings,depth+1),no=expression(node.else,bindings,depth+1);if(cond.role!=='bool'||yes.role!==kind||no.role!==kind)fail('complete conditional scalar domains differ');return {kind:'choose',condition:cond,then:yes,else:no,role:kind};}
  if(node.k==='binary'&&['eq','ne'].includes(node.op)){const left=expression(node.left,bindings,depth+1),right=expression(node.right,bindings,depth+1);if(kind!=='bool'||left.role!==right.role||role(node.domain)!==left.role)fail('actual equality primitive domains differ');return {kind:'compare',op:node.op,left,right,role:'bool'};}
  fail('effect, unresolved operation or unsupported scalar node');
 }
 function body(node,bindings,depth){
  tick(depth);if(!canonicalJson(node?.type,names))fail('complete body canonical Json result required');
  if(node.k==='let'){
   if(node.mutable===true||typeof node.name!=='string'||bindings.has(node.name)||locals>=64)fail('fresh immutable lexical local required');
   const value=expression(node.value,bindings,depth+1),name='local'+locals++,inner=new Map(bindings);inner.set(node.name,{name,role:value.role,type:node.value.type});return {kind:'let',name,value,body:body(node.body,inner,depth+1)};
  }
  if(node.k!=='routerJsonMacro'||++macros!==1||!isArray(node.args))fail('one complete checked constructor tail required');
  const arguments_=node.args.map(argument=>{const value=expression(argument.value,bindings,depth+1);if(argument.serialization!==(value.role==='str'?'string':'bool'))fail('actual standard serialization owner differs');return value;});
  const used=new Set();function tree(value,at){
   tick(at);if(value.kind==='null')return {kind:'null'};if(value.kind==='bool'&&typeof value.value==='boolean'||value.kind==='string'&&typeof value.value==='string')return {kind:value.kind,value:value.value};
   if(value.kind==='object'){if(!isArray(value.entries)||value.entries.length>4096)fail('bounded literal object required');const seen=new Set();return {kind:'object',entries:value.entries.map(row=>{if(typeof row.key!=='string'||seen.has(row.key))fail('unique original literal key required');seen.add(row.key);return {key:row.key,value:tree(row.value,at+1)};})};}
   if(value.kind==='expression'){if(value.index!==used.size||used.has(value.index)||!arguments_[value.index])fail('exact left-to-right interpolation partition required');used.add(value.index);return {kind:'scalar',value:arguments_[value.index]};}
   fail('unsupported constructor tree node');
  }
  const result=tree(node.jsonTree,depth+1);if(used.size!==arguments_.length)fail('all actual interpolations must occur exactly once');return {kind:'json',value:result};
 }
 return {kind:'checked-normal-json-constructor',parameters,body:body(fn.body,scope,0),semanticAuthority:false};
}
function render(model,typed){
 const quote=value=>apply(jsonStringify.value,jsonOwner,[value]);
 const imports='import {json_macro_null,json_macro_bool,json_macro_string,json_macro_object} from "../runtime/json-macro-runtime.mjs";\n';
 function scalar(value){if(value.kind==='variable')return value.name;if(value.kind==='literal')return quote(value.value);if(value.kind==='choose')return '('+scalar(value.condition)+' ? '+scalar(value.then)+' : '+scalar(value.else)+')';return '('+scalar(value.left)+(value.op==='eq'?' === ':' !== ')+scalar(value.right)+')';}
 function tree(value){if(value.kind==='null')return 'json_macro_null()';if(value.kind==='bool'||value.kind==='string')return 'json_macro_'+value.kind+'('+quote(value.value)+')';if(value.kind==='scalar')return 'json_macro_'+(value.value.role==='str'?'string':'bool')+'('+scalar(value.value)+')';return 'json_macro_object(['+value.entries.map(row=>'['+quote(row.key)+','+tree(row.value)+']').join(',')+'])';}
 function body(value){return value.kind==='let'?'  const '+value.name+' = '+scalar(value.value)+';\n'+body(value.body):'  return '+tree(value.value)+';\n';}
 const doc=model.parameters.map(row=>' * @param {'+(row.role==='str'?'string':'boolean')+'} '+row.name).join('\n');
 const validation=model.parameters.map((row,at)=>'  const checked_argument'+at+' = json_macro_'+(row.role==='str'?'string':'bool')+'('+row.name+');\n').join('');
 return imports+'/**\n'+doc+'\n */\nfunction core_definition('+model.parameters.map(row=>row.name+(typed?':'+(row.role==='str'?'string':'boolean'):'')).join(',')+')'+(typed?':ReturnType<typeof json_macro_object>':'')+'{\n'+validation+body(model.body)+'}\n';
}
/** The compiler supplies the genuine checked program; public IR cannot bind it. */
export function prepareForwardJsonConstructorDefinition({project:projectName,entry,checked,genuineOrigin,target,sourceModules,lower,index,transform,format}){
 if(format!=='core-reader'||ownData(entry,'term')!=='fn')return null;
 const identity=entryIdentity(entry),surface=ownData(entry,'surface'),sourceEntry=freeze({...identity,surface});
 const original=checked.declarations.get(identity.name),current=target.program.declarations.get(target.names.get(identity.name));if(!original||!current||!original.params.length)return null;
 const owner=checked.declarations.get(original.ret?.name);if(owner?.generated!=='router-json-contract'||owner.hostTypePath?.join('::')!=='serde_json::Value')return null;
 if(!isArray(sourceModules)||isProxy(sourceModules)||prototype(sourceModules)!==arrayPrototype)fail('actual source module array required');
 const parents=[];for(let at=0;at<ownData(sourceModules,'length');at++){const module=ownData(sourceModules,''+at);if(ownData(module,'file')===identity.file&&same(snapshot(ownData(module,'path')),identity.path))parents.push(module);}
 if(parents.length!==1)fail('unique whole physical parent required');const liveParent=parents[0],parent=parentIdentity(liveParent);
 function currentIdentity(){if(ownData(entry,'surface')!==surface||!same(entryIdentity(entry),identity)||!same(parentIdentity(liveParent),parent))fail('live entry or parent source identity changed');}
 const context=checkedSourceContext(genuineOrigin);if(!context)fail('genuine checked parser program required');const token=bindCheckedSourceLinks(genuineOrigin,context,{targetProfile:{schema:'normal-json-constructor-definition-v1'}});
 const parsedEvidence=originalParsedDeclarationEvidence(surface);if(!parsedEvidence)fail('private original parsed declaration required');const originalEvidence=snapshot(parsedEvidence);
 function authenticate(fn){
  const evidence=checkedSourceEvidence(token,fn);if(!evidence)fail('private checked original declaration association required');
  if(!ready())fail('native source evidence operations changed');
  // A genuine token from another same-shaped function/parent is insufficient.
  for(const name of keys(originalEvidence)){const field=descriptor(evidence,name);if(!field||!own(field,'value')||!same(originalEvidence[name],field.value))fail('complete original checked parent association differs');}return evidence;
 }
 authenticate(original);const calls=sourceCalls(sourceEntry,parent),lowered=lower(entry);
 const frozen=products(original,current,lowered,checked,target),callData=snapshot(calls.map(call=>({source:call.source,span:call.origin.relocated.span,tree:call.origin.relocated.jsonTree,leaves:call.syntax.leaves.length,route:call.origin.original.k})));
 // Validate the immutable function against a token issued from the genuine
 // checked program, then close the last live-to-model mutation window. The
 // fresh products/equality/layout/model/freeze region has NO JSON/Hash/FS.
 authenticate(frozen.original);
 if(!ready())fail('native model operations changed');
 currentIdentity();const live=products(original,current,lowered,checked,target);if(!same(live,frozen))fail('live checked products changed before model capture');
 const {sourceNames,targetNames}=layouts(live),models=snapshot([project(live.original,sourceNames),project(live.current,targetNames),project(live.lowered,targetNames)]);
 if(!same(models[0],models[1])||!same(models[1],models[2]))fail('three complete genuine normal bodies differ');
 const renames=new Map(frozen.names);for(const [before,after]of [[frozen.original,frozen.current],[frozen.current,frozen.lowered]]){const normalize=before===frozen.original?value=>renamed(value,renames):value=>value;if(!same(normalize(before.params.map(row=>row.type)),after.params.map(row=>row.type))||!same(normalize(before.ret),after.ret))fail('all complete checked signatures must agree');}
 const macro=[];const find=node=>{if(!node||typeof node!=='object')return;if(node.k==='routerJsonMacro')macro.push(node);else for(const [name,value]of Object.entries(node))if(!['type','span'].includes(name)){if(isArray(value))value.forEach(find);else find(value);}};find(frozen.original.body);
 if(macro.length!==1||!same(macro[0].span,callData[0].span)||!same(macro[0].jsonTree,callData[0].tree)||macro[0].args.length!==callData[0].leaves)fail('entire checked macro source partition differs');
 const mappings=frozen.emitted.mappings.filter(row=>row.source===frozen.lowered.fullName);if(mappings.length!==1)fail('one complete actual emitted mapping required');const mapping=mappings[0],model=models[2],javascriptPath='app/owned-definitions/definition_'+index+'.mjs',typescriptPath='typed/owned-definitions/definition_'+index+'.mts',ts=ownershipCompiler();
 function exported(source,path,kind,language){const file=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,kind),fns=file.statements.filter(ts.isFunctionDeclaration);if(file.parseDiagnostics.length||file.statements.length!==2||fns.length!==1||fns[0].name?.text!=='core_definition'||!fns[0].body||fns[0].parameters.length!==model.parameters.length)fail('complete normal definition template required');const fn=fns[0];return transform(source,[{start:fn.getStart(file),end:fn.getStart(file),replacement:'export '},{start:fn.name.getStart(file),end:fn.name.end,replacement:mapping.target}],language);}
 const result=createRulePipeline([{phase:'language',rules:[{id:'normal-json-constructor:complete-three-product-projection-and-original-call-reissue',apply:()=>{if(!ready())fail('native language render operations changed');return {javascript:render(model,false),typescript:render(model,true)};}}]},{phase:'repository',rules:[{id:'router-json-constructor:registered-core-definition-and-complete-cst',apply:value=>({javascript:exported(value.javascript,javascriptPath,ts.ScriptKind.JS,'JavaScript'),typescript:exported(value.typescript,typescriptPath,ts.ScriptKind.TS,'TypeScript')})}]}]).run(null);
 const pair=prepareOwnedCorePairedTypes(javascriptPath,result.value.javascript.after.source,typescriptPath,result.value.typescript.after.source),sourceHash=hash(parent.source),source=parent.source.slice(identity.span.start,identity.span.end),parentId=identity.file+':'+sourceHash;
 const data=frozen.lowerDeclarations,guardedTypescript=annotateRuntimeTypes(frozen.emitted.text,new Map([[mapping.target,frozen.lowered.params]]),data,new Map([[mapping.target,frozen.lowered.ret]]),frozen.emitted.checkedLocalBindings??[]);
 assertReverseConcreteSourceHost();const output=snapshot({parent:{id:parentId,file:identity.file,source:parent.source,sha256:sourceHash},row:{identity:Buffer.from(JSON.stringify([projectName,identity.file,sourceHash,identity.name,identity.span,'normal-json-constructor-v1']),'utf8').toString('hex'),name:identity.name,source:identity.file,sourceSha256:sourceHash,span:identity.span,original:{parent:parentId,source,sha256:hash(source)},javascriptPath,typescriptPath,target:mapping.target,canonicalAbi:'registered-normal-json-constructor-definition-v1',targetFormat:'checked-normal-json-constructor-v1',parameterValidation:{order:'each source parameter left-to-right before the normal body',operations:model.parameters.map(row=>row.role==='str'?'json_macro_string':'json_macro_bool'),allocationBoundary:'existing registered scalar wrappers; constructed validation values are intentionally unused',oldGuardObservationEquivalent:false},parameterCorrespondence:frozen.original.params.map((row,at)=>({original:row.name,target:'input'+at,index:at})),signature:{original:{params:frozen.original.params,ret:frozen.original.ret},target:{params:frozen.current.params,ret:frozen.current.ret},lowered:{params:frozen.lowered.params,ret:frozen.lowered.ret}},semanticProjection:{original:models[0],target:models[1],lowered:models[2]},originalMacroSources:callData.map(call=>({source:call.source,sha256:hash(call.source),route:call.route,sourceSpan:call.span})),javascript:result.value.javascript,typescript:result.value.typescript,pair,trace:result.trace,retainedGuardedEmission:{javascript:frozen.emitted,typescript:guardedTypescript},semanticAuthority:false,newSourceRequiresIndependentReverseAdmission:true,oldGuardObservationEquivalent:false,moduleStartupEquivalent:false,applicationEffectCompleteness:false}});
 // Output is already immutable DATA. Reissue actual source/owner proofs, then
 // perform the final native-only current product join before publication.
 const fresh=sourceCalls(sourceEntry,parent);if(fresh.length!==calls.length||fresh[0].origin.original!==calls[0].origin.original||fresh[0].origin.parser!==calls[0].origin.parser)fail('original macro association changed');
 authenticate(frozen.original);
 currentIdentity();if(!same(products(original,current,lowered,checked,target),frozen))fail('live products changed before publication');return output;
}
