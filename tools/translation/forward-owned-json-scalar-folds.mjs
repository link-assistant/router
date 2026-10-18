// NEW finite definition format; checked products and current source issue rows.
import {createHash} from 'node:crypto';
import {JSON_DATA} from './extensions/json-contracts.mjs';
import {HostRustParser,HostChecker} from './extensions/host-contracts.mjs';
import {requirePinnedStandardBody} from './extensions/standard-body-checker.mjs';
import {valueSchema} from './type-layout.mjs';
import {annotateRuntimeTypes} from './translate.mjs';
import {ownershipCompiler} from './js-to-rust/vendor/module-syntax.mjs';
import {assertReverseConcreteSourceHost} from './js-to-rust/concrete-source.mjs';
import {createRulePipeline} from './rule-pipeline.mjs';
import {prepareOwnedCorePairedTypes} from './js-to-rust/owned-core-paired-types.mjs';
const fail=message=>{throw new TypeError('Forward Json scalar fold: '+message);};
const hash=source=>{assertReverseConcreteSourceHost();const result=createHash('sha256').update(source).digest('hex');assertReverseConcreteSourceHost();return result;};
const roles=['Value','Number','MapEntry','Map_String_Value'];
const ordered=value=>Array.isArray(value)?value.map(ordered):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,ordered(value[key])])):value;
const same=(left,right)=>JSON.stringify(ordered(left))===JSON.stringify(ordered(right));
function renamed(value,names){
 if(Array.isArray(value))return value.map(child=>renamed(child,names));
 if(!value||typeof value!=='object')return value;
 return Object.fromEntries(Object.entries(value).map(([key,child])=>[key,key==='name'&&typeof child==='string'&&names.has(child)?names.get(child):key==='path'&&Array.isArray(child)&&names.has(child.filter((part,at)=>at!==0||part!=='crate').join('.'))?['crate',names.get(child.filter((part,at)=>at!==0||part!=='crate').join('.'))]:renamed(child,names)]));
}
function layouts(checked,target,lowered){
 const sourceNames=new Map(),targetNames=new Map(),sourceData=new Map(),targetData=new Map(),lowerData=new Map();
 for(const role of roles){
  const rows=[...checked.declarations.values()].filter(row=>row.k==='data'&&row.generated==='router-json-contract'&&row.hostTypePath?.join('::')==='serde_json::'+role);if(rows.length!==1)fail('actual canonical Json owner absent or ambiguous');
  const original=rows[0],name=target.names.get(original.fullName),current=target.program.declarations.get(name),lower=lowered.program.declarations.get(name);
  if(!current||!lower||current.generated!=='router-project-flattened'||lower.generated!=='router-project-flattened'||current.hostTypePath?.join('::')!=='serde_json::'+role||lower.hostTypePath?.join('::')!=='serde_json::'+role)fail('actual canonical target owner differs');
  sourceNames.set(original.fullName,'serde_json.'+role);targetNames.set(name,'serde_json.'+role);sourceData.set(original.fullName,original);targetData.set(name,current);lowerData.set(name,lower);
 }
 const wanted=new Map(JSON_DATA[0].items.filter(row=>roles.includes(row.name)).map(row=>['serde_json.'+row.name,{...row,fullName:'serde_json.'+row.name}]));
 const schema=(data,names)=>{const all=valueSchema(data);return {schemaVersion:all.schemaVersion,types:Object.fromEntries([...names].map(([name,registered])=>[registered,renamed(all.types[name],names)]))};};
 const expected=schema(wanted,new Map([...wanted.keys()].map(name=>[name,name])));
 for(const [data,names]of [[sourceData,sourceNames],[targetData,targetNames],[lowerData,targetNames]])if(!same(schema(data,names),expected))fail('complete canonical Json layouts differ');
 return {sourceNames,targetNames};
}
function scalar(type){
 if(type?.rustReference||type?.rustOwnership||type?.rustGenericIdentityUnresolved||type?.rustBorrowingUnresolved)return null;
 if(type?.kind==='bool')return 'bool';
 if(type?.kind==='fixed'&&type.bits===64&&type.signed===true&&type.rustPrimitiveName==='i64')return 'i64';
 return null;
}
function optional(type,program,names){
 if(type?.kind!=='data'||type.rustReference||type.rustGenericIdentityUnresolved||type.rustBorrowingUnresolved)fail('actual by-value Option required');
 const row=program.declarations.get(type.name),source=type.rustStandardGeneric??row?.standardGeneric;
 if(row?.standardGeneric?.kind!=='Option'||source?.kind!=='Option'||source.arguments?.length!==1||row.standardGeneric.arguments?.length!==1||row.ctors?.length!==2)fail('complete actual Option provenance required');
 const none=row.ctors.filter(ctor=>ctor.name==='None'),some=row.ctors.filter(ctor=>ctor.name==='Some');
 if(none.length!==1||none[0].fields.length||some.length!==1||some[0].fields.length!==1||some[0].fields[0].name!=='field0')fail('complete None Some layout differs');
 const payload=some[0].fields[0].type,domain=value=>{
  if(value?.rustGenericIdentityUnresolved||value?.rustBorrowingUnresolved)return null;
  const nominal=value?.name??(value?.kind==='named'?value.path?.filter((part,at)=>at!==0||part!=='crate').join('.'):null),pointee=value?.rustReference?.pointee;
  const target=pointee?.name??(pointee?.kind==='named'?pointee.path?.filter((part,at)=>at!==0||part!=='crate').join('.'):null);
  return names.get(nominal)==='serde_json.Value'&&value.rustReference?.kind==='shared'&&names.get(target)==='serde_json.Value'?'json':scalar(value);
 };
 const role=domain(payload);if(!role||domain(source.arguments[0])!==role||domain(row.standardGeneric.arguments[0])!==role)fail('actual Option payload identities differ');return {role,payload};
}
function sharedJson(type,names){return type?.kind==='data'&&names.get(type.name)==='serde_json.Value'&&type.rustReference?.kind==='shared'&&type.rustReference.pointee?.kind==='data'&&names.get(type.rustReference.pointee.name)==='serde_json.Value'&&!type.rustBorrowingUnresolved&&!type.rustGenericIdentityUnresolved;}
function i64Literal(text){
 if(typeof text!=='string'||!text.length||text.length>19||text.length>1&&text[0]==='0')return false;
 for(let at=0;at<text.length;at++)if(text[at]<'0'||text[at]>'9')return false;
 return text.length<19||text<='9223372036854775807';
}
function project(fn,program,names){
 const role=scalar(fn?.ret);if(fn?.k!=='fn'||fn.async||fn.params.length!==1||!role||!sharedJson(fn.params[0].type,names)||fn.body?.k!=='routerPinnedStandardBody')return null;
 // These are genuine imported constructors, dispatch hints to the unchanged
 // complete private/source verifier; no public callback field selects them.
 requirePinnedStandardBody(fn.body,HostRustParser,{Checker:HostChecker,program});
 const proof=fn.body.pinnedStandardBodyProof;if(proof.method!=='unwrap_or')return null;
 const self=fn.body.body,fallback=self?.body,match=fallback?.body;
 if(self?.k!=='let'||fallback?.k!=='let'||self.mutable===true||fallback.mutable===true||typeof self.name!=='string'||typeof fallback.name!=='string'||self.name===fallback.name||!same(fn.body.type,fn.ret)||!same(self.type,fn.ret)||!same(fallback.type,fn.ret))fail('exact eager original parameter bindings required');
 const owner=optional(self.value?.type,program,names);if(owner.role!==role||!same(owner.payload,fallback.value?.type)||scalar(fallback.value?.type)!==role)fail('actual eager scalar argument differs');
 const literal=fallback.value;if(literal.k!=='lit'||role==='bool'&&typeof literal.value!=='boolean'||role==='i64'&&(!i64Literal(literal.value)))fail('eager primitive literal default required');
 if(match?.k!=='match'||match.cases?.length!==2||match.scrutinee?.k!=='var'||match.scrutinee.name!==self.name||!same(match.scrutinee.type,self.value.type)||!same(match.type,fn.ret))fail('complete original unwrap_or match required');
 const branches=new Map();for(const branch of match.cases){const pattern=branch.pattern;if(pattern?.k!=='ctor'||pattern.data!==self.value.type.name||!['None','Some'].includes(pattern.ctor)||branches.has(pattern.ctor)||pattern.binds?.length!==(pattern.ctor==='Some'?1:0))fail('complete actual unwrap_or constructors required');branches.set(pattern.ctor,branch);}
 const absent=branches.get('None'),present=branches.get('Some');if(!absent||!present||absent.body?.k!=='var'||absent.body.name!==fallback.name||!same(absent.body.type,fn.ret)||present.body?.k!=='var'||present.body.name!==present.pattern.binds[0]||!same(present.body.type,fn.ret))fail('actual unwrap_or payload/default result differs');
 let cells=0;const tick=depth=>{if(++cells>4096||depth>64)fail('finite reader fold budget');};
 const variable=(node,name,type)=>node?.k==='var'&&node.name===name&&same(node.type,type);
 function argument(node,id){
  if(node?.k==='routerStandardSharedReceiver'){
   if(node.sourceReceiverCopy?.profile!=='rust-1.89-shared-reference-copy'||node.sourceReceiverCopy.contract!==id)fail('actual shared receiver copy differs');node=node.object;
  }
  return node;
 }
 function get(node,name,type,path,depth){
  tick(depth);if(node?.k!=='routerHostCall'||node.id!=='serde_json_value_get_string'||node.args?.length!==2||!variable(argument(node.args[0],node.id),name,type)||!sharedJson(type,names)||optional(node.type,program,names).role!=='json')fail('actual canonical get on its own Json binding required');
  const key=node.args[1];if(key?.k!=='lit'||key.type?.kind!=='string'||key.type.rustReference||key.type.rustBorrowingUnresolved||typeof key.value!=='string')fail('actual scalar literal lookup key required');return [...path,key.value];
 }
 function bind(node,depth){
  tick(depth);
  if(node?.k==='routerHostCall')return {path:get(node,fn.params[0].name,fn.params[0].type,[],depth+1),role:'json',type:node.type};
  if(node?.k!=='routerOptionCallback'||node.op!=='and_then')fail('only actual checked Option and_then readers required');
  const input=bind(node.value,depth+1),inputOption=optional(node.value.type,program,names),output=optional(node.type,program,names),lambda=node.callback,local=lambda?.binding;
  if(input.role!=='json'||inputOption.role!=='json'||lambda?.k!=='routerLambda'||lambda.arity!==1||local?.k!=='let'||local.mutable===true||local.value?.k!=='routerLambdaInput'||local.value.position!==0||!same(local.value.type,inputOption.payload)||!same(lambda.type?.result,node.type))fail('one actual checked lexical Json callback input required');
  const call=local.body;if(call?.k!=='routerHostCall')fail('callback must be one complete canonical reader');
  if(call.id==='serde_json_value_get_string'){
   if(output.role!=='json')fail('lookup callback output must retain its actual Json loan');return {path:get(call,local.name,local.value.type,input.path,depth+1),role:'json',type:node.type};
  }
  const wanted=role==='bool'?'serde_json_value_as_bool':'serde_json_value_as_i64';
  if(call.id!==wanted||input.role!=='json'||output.role!==role||call.args?.length!==1||!variable(argument(call.args[0],call.id),local.name,local.value.type)||!same(call.type,node.type))fail('complete own-input scalar reader required');
  return {path:input.path,role,type:node.type};
 }
 const chain=bind(self.value,0);if(chain.role!==role||!chain.path.length)fail('one scalar reader must finish the chain');
 return {kind:'checked-json-scalar-fold',parameter:'input0',role,path:chain.path,default:role==='i64'?String(literal.value):literal.value,standard:{profile:proof.profile,method:proof.method,owner:proof.owner,selection:proof.selection,syntaxSha256:proof.syntaxSha256,evaluationOrder:proof.evaluationOrder},Some:'exact checked payload',None:'exact eager primitive literal',semanticAuthority:false};
}
function render(model,typed){
 const operation=model.role==='bool'?'serde_json_value_as_bool':'serde_json_value_as_i64',imports='import {serde_json_value_get_string as get_field,'+operation+' as read_scalar} from "../runtime/json-runtime.mjs";\n';
 const fallback=model.role==='bool'?String(model.default):model.default+'n';
 function lookup(at,input,indent){
  const pad=' '.repeat(indent),field='field'+at,head=pad+'const '+field+' = get_field('+input+', '+JSON.stringify(model.path[at])+');\n'+pad+'if ('+field+'.$ === "Some") {\n';
  let selected;
  if(at+1<model.path.length)selected=lookup(at+1,field+'.field0',indent+2);
  else selected=pad+'  const scalar = read_scalar('+field+'.field0);\n'+pad+'  if (scalar.$ === "Some") {\n'+pad+'    return scalar.field0;\n'+pad+'  } else {\n'+pad+'    return '+fallback+';\n'+pad+'  }\n';
  return head+selected+pad+'} else {\n'+pad+'  return '+fallback+';\n'+pad+'}\n';
 }
 return imports+'function core_definition(input0'+(typed?':Parameters<typeof get_field>[0]':'')+')'+(typed&&model.role==='bool'?':boolean':'')+'{\n'+lookup(0,'input0',2)+'}\n';
}
/** Called only on the compiler's genuine current checked project branch. */
export function prepareForwardJsonScalarFoldDefinition({project:projectName,entry,checked,target,sourceModules,lower,index,transform,format}){
 if(format!=='core-reader')return null;
 const original=checked.declarations.get(entry.name),current=target.program.declarations.get(target.names.get(entry.name));if(entry.term!=='fn'||!original||!current||!scalar(original.ret)||original.body?.k!=='routerPinnedStandardBody'||current.body?.k!=='routerPinnedStandardBody')return null;
 const receiver=original.params[0]?.type,receiverOwner=checked.declarations.get(receiver?.name);
 if(original.async||original.params.length!==1||receiverOwner?.k!=='data'||receiverOwner.generated!=='router-json-contract'||receiverOwner.hostTypePath?.join('::')!=='serde_json::Value'||!sharedJson(receiver,new Map([[receiverOwner.fullName,'serde_json.Value']])))return null;
 const lowered=lower(entry),{sourceNames,targetNames}=layouts(checked,target,lowered),models=[project(original,checked,sourceNames),project(current,target.program,targetNames),project(lowered.own,lowered.program,targetNames)];
 if(models.some(model=>!model)||!same(models[0],models[1])||!same(models[1],models[2]))fail('three genuine checked scalar folds differ');
 const renames=new Map([...target.names].map(([name,flat])=>[name,flat]));for(const [before,after]of [[original,current],[current,lowered.own]]){const normalize=before===original?value=>renamed(value,renames):value=>value;if(before.params.length!==after.params.length||before.params.some((param,at)=>!same(normalize(param.type),after.params[at]?.type))||!same(normalize(before.ret),after.ret))fail('complete source target lower signatures differ');}
 const mappings=lowered.emitted.mappings.filter(row=>row.source===lowered.own.fullName);if(mappings.length!==1)fail('unique actual emitted mapping required');const mapping=mappings[0];
 const parents=sourceModules.filter(module=>module.file===entry.file&&same(module.path,entry.path));if(parents.length!==1)fail('unique complete physical parent required');const parent=parents[0];
 if(!Number.isSafeInteger(entry.span.start)||!Number.isSafeInteger(entry.span.end)||entry.span.start<0||entry.span.start>=entry.span.end||entry.span.end>parent.source.length)fail('actual declaration span required');
 const model=models[2],javascript=render(model,false),typescript=render(model,true),javascriptPath='app/owned-definitions/definition_'+index+'.mjs',typescriptPath='typed/owned-definitions/definition_'+index+'.mts',ts=ownershipCompiler();
 function exported(source,path,kind,language){const file=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,kind);if(file.parseDiagnostics.length||file.statements.length!==2)fail('complete scalar template syntax');const fn=file.statements[1];if(!ts.isFunctionDeclaration(fn)||fn.name?.text!=='core_definition'||fn.parameters.length!==1||!fn.body)fail('complete scalar template declaration differs');return transform(source,[{start:fn.getStart(file),end:fn.getStart(file),replacement:'export '},{start:fn.name.getStart(file),end:fn.name.end,replacement:mapping.target}],language);}
 const pipeline=createRulePipeline([
  {phase:'language',rules:[{id:'checked-json-scalar-fold:three-genuine-products-and-standard-reissue',apply:()=>({javascript,typescript,models})}]},
  {phase:'repository',rules:[{id:'router-json-scalar-fold:actual-runtime-import-and-definition',apply:value=>({...value,javascript:exported(value.javascript,javascriptPath,ts.ScriptKind.JS,'JavaScript'),typescript:exported(value.typescript,typescriptPath,ts.ScriptKind.TS,'TypeScript')})}]},
 ]),result=pipeline.run(null),pair=prepareOwnedCorePairedTypes(javascriptPath,result.value.javascript.after.source,typescriptPath,result.value.typescript.after.source),sourceHash=hash(parent.source),source=parent.source.slice(entry.span.start,entry.span.end),parentId=entry.file+':'+sourceHash;
 const declarations=[...lowered.program.declarations.values()].filter(row=>row.k==='data'),guardedTypescript=annotateRuntimeTypes(lowered.emitted.text,new Map([[mapping.target,lowered.own.params]]),declarations,new Map([[mapping.target,lowered.own.ret]]),lowered.emitted.checkedLocalBindings??[]);
 assertReverseConcreteSourceHost();return {parent:{id:parentId,file:entry.file,source:parent.source,sha256:sourceHash},row:{identity:Buffer.from(JSON.stringify([projectName,entry.file,sourceHash,entry.name,entry.span,'json-scalar-fold-v1']),'utf8').toString('hex'),name:entry.name,source:entry.file,sourceSha256:sourceHash,span:entry.span,original:{parent:parentId,source,sha256:hash(source)},javascriptPath,typescriptPath,target:mapping.target,canonicalAbi:'registered-json-scalar-fold-definition-v1',targetFormat:'checked-json-scalar-fold-v1',parameterCorrespondence:[{original:original.params[0].name,target:'input0',index:0}],signature:{original:{params:original.params,ret:original.ret},target:{params:current.params,ret:current.ret},lowered:{params:lowered.own.params,ret:lowered.own.ret}},semanticProjection:{original:models[0],target:models[1],lowered:models[2]},javascript:result.value.javascript,typescript:result.value.typescript,pair,trace:result.trace,retainedGuardedEmission:{javascript:lowered.emitted,typescript:guardedTypescript},oldGuardObservationEquivalent:false,newSourceRequiresIndependentReverseAdmission:true,semanticAuthority:false,moduleStartupEquivalent:false,applicationEffectCompleteness:false}};
}
