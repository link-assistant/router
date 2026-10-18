// Internal NEW definition format. Public proposal DATA never issues an item.
import {createHash} from 'node:crypto';
import {JSON_DATA} from './extensions/json-contracts.mjs';
import {valueSchema} from './type-layout.mjs';
import {ownershipCompiler} from './js-to-rust/vendor/module-syntax.mjs';
import {assertReverseConcreteSourceHost} from './js-to-rust/concrete-source.mjs';
import {createRulePipeline} from './rule-pipeline.mjs';
import {prepareOwnedCorePairedTypes} from './js-to-rust/owned-core-paired-types.mjs';
const fail=message=>{throw TypeError('Forward optional Json composition: '+message);};
const hash=value=>{assertReverseConcreteSourceHost();const result=createHash('sha256').update(value).digest('hex');assertReverseConcreteSourceHost();return result;};
const roles=['Value','Number','MapEntry','Map_String_Value'];
const ordered=value=>Array.isArray(value)?value.map(ordered):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,ordered(value[key])])):value;
const same=(a,b)=>JSON.stringify(ordered(a))===JSON.stringify(ordered(b));
function renamed(value,names){
 if(Array.isArray(value))return value.map(child=>renamed(child,names));
 if(!value||typeof value!=='object')return value;
 return Object.fromEntries(Object.entries(value).map(([key,child])=>[key,key==='name'&&typeof child==='string'&&names.has(child)?names.get(child):key==='path'&&Array.isArray(child)&&names.has(child.filter((part,at)=>at!==0||part!=='crate').join('.'))?['crate',names.get(child.filter((part,at)=>at!==0||part!=='crate').join('.'))]:renamed(child,names)]));
}
function canonicalLayouts(checked,target,lowered){
 const sourceNames=new Map(),targetNames=new Map(),sourceData=new Map(),targetData=new Map(),lowerData=new Map();
 for(const role of roles){
  const path='serde_json::'+role,rows=[...checked.declarations.values()].filter(row=>row.k==='data'&&row.generated==='router-json-contract'&&row.hostTypePath?.join('::')===path);
  if(rows.length!==1)fail('actual canonical JSON source owner absent or ambiguous');
  const source=rows[0],name=target.names.get(source.fullName),current=target.program.declarations.get(name),actual=lowered.program.declarations.get(name);
  if(!current||!actual||current.generated!=='router-project-flattened'||actual.generated!=='router-project-flattened'||current.hostTypePath?.join('::')!==path||actual.hostTypePath?.join('::')!==path)fail('actual canonical JSON target owner differs');
  sourceNames.set(source.fullName,'serde_json.'+role);targetNames.set(name,'serde_json.'+role);sourceData.set(source.fullName,source);targetData.set(name,current);lowerData.set(name,actual);
 }
 const expected=new Map(JSON_DATA[0].items.filter(row=>roles.includes(row.name)).map(row=>['serde_json.'+row.name,{...row,fullName:'serde_json.'+row.name}]));
 const schema=(data,names)=>{const all=valueSchema(data);return {schemaVersion:all.schemaVersion,types:Object.fromEntries([...names].map(([name,registered])=>[registered,renamed(all.types[name],names)]))};};
 const wanted=schema(expected,new Map([...expected.keys()].map(name=>[name,name])));
 for(const [data,names]of [[sourceData,sourceNames],[targetData,targetNames],[lowerData,targetNames]])if(!same(schema(data,names),wanted))fail('complete canonical JSON layouts differ');
 return {sourceNames,targetNames};
}
function optional(type,declarations,names){
 if(type?.kind!=='data'||type.rustReference||type.rustGenericIdentityUnresolved||type.rustBorrowingUnresolved)fail('actual by-value Option required');
 const entry=declarations.get(type.name),provenance=type.rustStandardGeneric??entry?.standardGeneric;
 if(entry?.standardGeneric?.kind!=='Option'||provenance?.kind!=='Option'||provenance.arguments?.length!==1||entry.standardGeneric.arguments?.length!==1||entry.ctors?.length!==2)fail('actual standard Option layout required');
 const some=entry.ctors.filter(row=>row.name==='Some'),none=entry.ctors.filter(row=>row.name==='None');
 if(some.length!==1||none.length!==1||some[0].fields.length!==1||some[0].fields[0].name!=='field0'||none[0].fields.length||entry.ctors[0].name!=='None'||entry.ctors[1].name!=='Some')fail('complete Some None layout differs');
 const payload=some[0].fields[0].type;
 const nominal=value=>value?.kind==='data'?value.name:value?.kind==='named'&&Array.isArray(value.path)?value.path.filter((part,index)=>index!==0||part!=='crate').join('.'):null;
 // Declarations retain their original named generic argument syntax; their
 // resolved field and each occurrence use checked data names. Both must join
 // the same full canonical layouts, not merely the same written spelling.
 const domain=value=>{
  if(value?.rustGenericIdentityUnresolved||value?.rustBorrowingUnresolved)fail('unresolved optional payload');
  if(names.get(nominal(value))==='serde_json.Value'&&value.rustReference?.kind==='shared'&&names.get(nominal(value.rustReference.pointee))==='serde_json.Value')return 'optional-json';
  if(value?.kind==='string'&&!value.rustReference&&value.rustOwnership?.kind==='borrowed'&&value.rustOwnership.source==='str')return 'optional-str';
  fail('Option payload needs canonical borrowed Json or str');
 };
 const kind=domain(payload);if(domain(provenance.arguments[0])!==kind||domain(entry.standardGeneric.arguments[0])!==kind)fail('actual source generic payload domain differs');return {kind,payload};
}
// This vocabulary is projected independently from all three genuine checked
// products. Variable correspondence is lexical; public IR shape is no permit.
function projectFunction(fn,declarations,names){
 if(fn?.k!=='fn'||fn.async||fn.params.length!==1||optional(fn.params[0].type,declarations,names).kind!=='optional-json'||optional(fn.ret,declarations,names).kind!=='optional-str')return null;
 let cells=0,sequence=0,operations=0;const tick=depth=>{if(++cells>4096||depth>64)fail('finite semantic projection budget');};
 const fresh=()=> 'local'+sequence++;
 const binding=(env,node)=>{const row=env.get(node.name);if(node.k!=='var'||!row||!same(node.type,row.type))fail('actual lexical binding or type differs');return row;};
 const text=node=>node?.type?.kind==='string'&&!node.type.rustReference&&!node.type.rustBorrowingUnresolved;
 function value(node,env,depth){
  tick(depth);if(!node||typeof node!=='object')fail('checked expression required');
  if(node.k==='var'){const row=binding(env,node);if(row.role==='input')fail('opaque input must remain inside the actual optional operation');return {kind:'var',name:row.name,role:row.role,root:row.root};}
  if(node.k==='lit'&&text(node)&&typeof node.value==='string')return {kind:'string',value:node.value,role:'str',root:null};
  if(node.k==='lit'&&node.type?.kind==='bool'&&typeof node.value==='boolean')return {kind:'bool',value:node.value,role:'bool',root:null};
  if(node.k==='binary'&&['eq','ne','and','or'].includes(node.op)&&node.type?.kind==='bool'){
   const left=value(node.left,env,depth+1),right=value(node.right,env,depth+1),boolean=node.op==='and'||node.op==='or';
   if(boolean?left.role!=='bool'||right.role!=='bool':left.role!=='str'||right.role!=='str')fail('closed string equality or boolean decision required');
   return {kind:'binary',op:node.op,left,right,role:'bool',root:null};
  }
  if(node.k==='routerOptionCallback'){
   if(node.op!=='and_then')fail('only actual optional as_str composition');
   const input=binding(env,node.value);if(input.role!=='input')fail('optional receiver must be the original parameter');
   if(optional(node.value.type,declarations,names).kind!=='optional-json'||optional(node.type,declarations,names).kind!=='optional-str')fail('actual callback result domain differs');
   const lambda=node.callback,letInput=lambda?.binding;
   if(lambda?.k!=='routerLambda'||lambda.arity!==1||letInput?.k!=='let'||letInput.value?.k!=='routerLambdaInput'||letInput.value.position!==0||!same(letInput.value.type,optional(node.value.type,declarations,names).payload)||!same(lambda.type?.result,node.type))fail('actual checked one-input lambda required');
   const call=letInput.body;if(call?.k!=='routerHostCall'||call.id!=='serde_json_value_as_str'||call.args?.length!==1||!same(call.type,node.type))fail('complete canonical as_str callback required');
   let argument=call.args[0];if(argument?.k==='routerStandardSharedReceiver'){
    if(argument.sourceReceiverCopy?.profile!=='rust-1.89-shared-reference-copy'||argument.sourceReceiverCopy.contract!==call.id)fail('actual shared receiver copy differs');argument=argument.object;
   }
   if(argument?.k!=='var'||argument.name!==letInput.name||!same(argument.type,letInput.value.type))fail('lambda argument must be its own actual bound input');
   operations++;return {kind:'optional-reader',name:input.name,role:'optional-str',root:'input0'};
  }
  if(node.k==='ctor'){
   if(node.data!==node.type?.name||optional(node.type,declarations,names).kind!=='optional-str')fail('actual optional string constructor required');
   if(node.ctor==='None'&&node.args?.length===0)return {kind:'none',role:'optional-str',root:null};
   if(node.ctor==='Some'&&node.args?.length===1){const child=value(node.args[0],env,depth+1);if(child.role!=='str'||child.root===null&&child.kind!=='string')fail('Some needs a real literal or live string loan');return {kind:'some',value:child,role:'optional-str',root:child.root};}
   fail('closed optional constructor differs');
  }
  fail('expression outside finite optional Json composition: '+node.k);
 }
 function body(node,env,depth){
  tick(depth);
  if(node.k==='let'){
   if(node.mutable===true||typeof node.name!=='string'||env.has(node.name))fail('fresh checked immutable local required');
   const checked=value(node.value,env,depth+1),name=fresh(),inner=new Map(env);inner.set(node.name,{name,type:node.value.type,role:checked.role,root:checked.root});
   return {kind:'let',name,value:checked,body:body(node.body,inner,depth+1)};
  }
  if(node.k==='if'){
   const cond=value(node.cond,env,depth+1);if(cond.role!=='bool')fail('checked boolean condition required');
   return {kind:'if',cond,then:body(node.then,new Map(env),depth+1),else:body(node.else,new Map(env),depth+1)};
  }
  if(node.k==='match'){
   const current=value(node.scrutinee,env,depth+1);if(current.role!=='optional-str'||node.cases?.length!==2||optional(node.scrutinee.type,declarations,names).kind!=='optional-str')fail('complete canonical optional string match required');
   const selected=new Map();for(const row of node.cases){const pattern=row.pattern;if(pattern?.k!=='ctor'||pattern.data!==node.scrutinee.type.name||!['Some','None'].includes(pattern.ctor)||selected.has(pattern.ctor)||pattern.binds?.length!==(pattern.ctor==='Some'?1:0))fail('complete unique optional match constructors required');selected.set(pattern.ctor,row);}
   if(selected.size!==2)fail('exhaustive optional match required');
   const temporary=fresh(),some=selected.get('Some'),inner=new Map(env),bind=some.pattern.binds[0];let name=null;
   if(bind!==null){if(typeof bind!=='string'||inner.has(bind))fail('fresh Some payload binding required');name=fresh();inner.set(bind,{name,type:optional(node.scrutinee.type,declarations,names).payload,role:'str',root:current.root});}
   return {kind:'match',name:temporary,value:current,bind:name,then:body(some.body,inner,depth+1),else:body(selected.get('None').body,new Map(env),depth+1)};
  }
  const returned=value(node,env,depth+1);if(returned.role!=='optional-str')fail('optional string result required');return {kind:'return',value:returned};
 }
 const env=new Map([[fn.params[0].name,{name:'input0',type:fn.params[0].type,role:'input',root:'input0'}]]),result=body(fn.body,env,0);
 if(operations!==1)fail('one complete original optional as_str call required');return {parameter:'input0',body:result};
}
function render(model){
 const expression=value=>{
  if(value.kind==='var')return value.name;
  if(value.kind==='string'||value.kind==='bool')return JSON.stringify(value.value);
  if(value.kind==='none')return "({$:'None'})";
  if(value.kind==='some')return "({$:'Some',field0:"+expression(value.value)+'})';
  if(value.kind==='optional-reader')return 'optional_as_str('+value.name+')';
  if(value.kind==='binary')return '('+expression(value.left)+' '+({eq:'===',ne:'!==',and:'&&',or:'||'}[value.op])+' '+expression(value.right)+')';
  fail('unknown projected expression');
 };
 const statements=(node,indent)=>{
  const pad=' '.repeat(indent);
  if(node.kind==='return')return pad+'return '+expression(node.value)+';\n';
  if(node.kind==='let')return pad+'const '+node.name+' = '+expression(node.value)+';\n'+statements(node.body,indent);
  if(node.kind==='if')return pad+'if ('+expression(node.cond)+') {\n'+statements(node.then,indent+2)+pad+'} else {\n'+statements(node.else,indent+2)+pad+'}\n';
  if(node.kind==='match')return pad+'const '+node.name+' = '+expression(node.value)+';\n'+pad+"if ("+node.name+".$ === 'Some') {\n"+(node.bind?pad+'  const '+node.bind+' = '+node.name+'.field0;\n':'')+statements(node.then,indent+2)+pad+'} else {\n'+statements(node.else,indent+2)+pad+'}\n';
  fail('unknown projected statement');
 };
 return statements(model.body,2);
}
/** Internal proposal only. Genuine callers supply all three private products. */
export function prepareForwardJsonCompositionDefinition({project,entry,checked,target,sourceModules,lower,index,transform,format}){
 if(format!=='core-reader'||entry.term!=='fn')return null;
 const original=checked.declarations.get(entry.name),current=target.program.declarations.get(target.names.get(entry.name));
 if(original?.params?.length!==1||current?.params?.length!==1)return null;
 // Cheap filtering is not a permit; complete layouts and fresh lowering follow.
 const input=checked.declarations.get(original.params[0].type?.name);if(input?.standardGeneric?.kind!=='Option')return null;
 const lowered=lower(entry),{sourceNames,targetNames}=canonicalLayouts(checked,target,lowered),renames=new Map(target.names);
 for(const [before,after]of [[original,current],[current,lowered.own]]){
  const normalize=before===original?value=>renamed(value,renames):value=>value;
  if(before.params.length!==after.params.length||before.params.some((param,at)=>!same(normalize(param.type),after.params[at].type))||!same(normalize(before.ret),after.ret))fail('complete current original target lower signature differs');
 }
 const originalModel=projectFunction(original,checked.declarations,sourceNames),targetModel=projectFunction(current,target.program.declarations,targetNames),lowerModel=projectFunction(lowered.own,lowered.program.declarations,targetNames);
 if(!originalModel||!targetModel||!lowerModel||!same(originalModel,targetModel)||!same(targetModel,lowerModel))fail('three independently checked semantic projections differ');
 const mappings=lowered.emitted.mappings.filter(row=>row.source===lowered.own.fullName);if(mappings.length!==1)fail('unique actual emitted mapping required');const mapping=mappings[0];
 const parents=sourceModules.filter(module=>module.file===entry.file&&same(module.path,entry.path));if(parents.length!==1)fail('unique actual physical parent required');const parent=parents[0];
 if(!Number.isSafeInteger(entry.span.start)||!Number.isSafeInteger(entry.span.end)||entry.span.start<0||entry.span.start>=entry.span.end||entry.span.end>parent.source.length)fail('actual original declaration span required');
 const source=parent.source.slice(entry.span.start,entry.span.end),sourceHash=hash(parent.source),parentId=entry.file+':'+sourceHash,stem='definition_'+index,javascriptPath='app/owned-definitions/'+stem+'.mjs',typescriptPath='typed/owned-definitions/'+stem+'.mts';
 const preamble='import {__optional_operation as optional_as_str} from "../runtime/json-option-runtime.mjs";\n',statements=render(lowerModel);
 const javascript=preamble+'function core_definition(input0){\n'+statements+'}\n',typescript=preamble+'function core_definition(input0:Parameters<typeof optional_as_str>[0]):ReturnType<typeof optional_as_str>{\n'+statements+'}\n',ts=ownershipCompiler();
 function bind(text,path,kind,language){
  const file=ts.createSourceFile(path,text,ts.ScriptTarget.Latest,true,kind);if(file.parseDiagnostics.length||file.statements.length!==2)fail('complete new composition syntax differs');
  const [imported,fn]=file.statements,leaves=ts.isImportDeclaration(imported)&&imported.importClause?.namedBindings&&ts.isNamedImports(imported.importClause.namedBindings)&&imported.importClause.namedBindings.elements;
  if(!leaves||leaves.length!==1||leaves[0].propertyName?.text!=='__optional_operation'||leaves[0].name.text!=='optional_as_str'||!ts.isFunctionDeclaration(fn)||fn.name?.text!=='core_definition'||fn.parameters.length!==1||!fn.body)fail('complete new composition template differs');
  return transform(text,[{start:leaves[0].propertyName.getStart(file),end:leaves[0].propertyName.end,replacement:'router_core_json_option_as_str'},{start:fn.getStart(file),end:fn.getStart(file),replacement:'export '},{start:fn.name.getStart(file),end:fn.name.end,replacement:mapping.target}],language);
 }
 const pipeline=createRulePipeline([
  {phase:'language',rules:[{id:'checked-optional-json:three-genuine-semantic-products',apply:()=>({javascript,typescript,originalModel,targetModel,lowerModel})}]},
  {phase:'repository',rules:[{id:'router-optional-json:real-import-and-target-cst',apply:value=>({...value,javascript:bind(value.javascript,javascriptPath,ts.ScriptKind.JS,'JavaScript'),typescript:bind(value.typescript,typescriptPath,ts.ScriptKind.TS,'TypeScript')})}]},
 ]),result=pipeline.run(null),pair=prepareOwnedCorePairedTypes(javascriptPath,result.value.javascript.after.source,typescriptPath,result.value.typescript.after.source);
 assertReverseConcreteSourceHost();return {parent:{id:parentId,file:entry.file,source:parent.source,sha256:sourceHash},row:{identity:Buffer.from(JSON.stringify([project,entry.file,sourceHash,entry.name,entry.span,'optional-json-as-str-v1']),'utf8').toString('hex'),name:entry.name,source:entry.file,sourceSha256:sourceHash,span:entry.span,original:{parent:parentId,source,sha256:hash(source)},javascriptPath,typescriptPath,target:mapping.target,canonicalAbi:'registered-optional-json-as-str-definition-v1',targetFormat:'checked-optional-json-composition-v1',parameterCorrespondence:[{original:original.params[0].name,target:'input0',index:0}],signature:{original:{params:original.params,ret:original.ret},target:{params:current.params,ret:current.ret},lowered:{params:lowered.own.params,ret:lowered.own.ret}},semanticProjection:{original:originalModel,target:targetModel,lowered:lowerModel},javascript:result.value.javascript,typescript:result.value.typescript,pair,trace:result.trace,retainedGuardedEmission:lowered.emitted,oldGuardObservationEquivalent:false,newSourceRequiresIndependentReverseAdmission:true,semanticAuthority:false,moduleStartupEquivalent:false,applicationEffectCompleteness:false}};
}
