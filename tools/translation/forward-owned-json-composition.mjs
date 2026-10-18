// Internal NEW definition format. Public proposal DATA never issues an item.
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {BOOL} from './checked-types.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta,serializeConcreteSyntaxMeta} from './concrete-syntax-meta.mjs';
import {JSON_DATA} from './extensions/json-contracts.mjs';
import {valueSchema} from './type-layout.mjs';
import {ownershipCompiler} from './js-to-rust/vendor/module-syntax.mjs';
import {assertReverseConcreteSourceHost} from './js-to-rust/concrete-source.mjs';
import {createRulePipeline} from './rule-pipeline.mjs';
import {prepareOwnedCorePairedTypes} from './js-to-rust/owned-core-paired-types.mjs';
import {readOriginalNonemptyStrFilter} from './extensions/standard-option-callback-body.mjs';
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
// Complete reviewed predicate DATA is a premise of this finite new-format
// theorem. It cannot issue a declaration or replace any checked product.
const IMMUTABLE_COPY_SOURCE="// Immutable guards run before typed layout guards, rejecting proxies and\n// accessors before any record inspection in the derived-Copy profile.\nimport {types} from 'node:util';\nexport function assertImmutableCopy(value){\n  const active=new Set(),done=new Set();\n  function visit(value){\n    if(value===null||typeof value!=='object')return;\n    if(types.isProxy(value)||!Object.isFrozen(value))throw new TypeError('Copy receiver requires immutable checked records and sized arrays');\n    if(Array.isArray(value)) {\n      if(Object.getPrototypeOf(value)!==Array.prototype)throw new TypeError('Copy array has an unsupported prototype');\n      const length=Object.getOwnPropertyDescriptor(value,'length')?.value,keys=Reflect.ownKeys(value);\n      if(!Number.isSafeInteger(length)||length>4096||keys.length!==length+1||keys.some(key=>key!=='length'&&(typeof key!=='string'||!/^(?:0|[1-9][0-9]*)$/u.test(key)||Number(key)>=length)))throw new TypeError('Copy array requires a dense checked layout');\n    }\n    if(active.has(value))throw new TypeError('Copy receiver cannot contain a cycle');\n    if(done.has(value))return;\n    active.add(value);\n    for(const key of Reflect.ownKeys(value)){\n      const descriptor=Object.getOwnPropertyDescriptor(value,key);\n      if(typeof key!=='string'||!descriptor||!Object.hasOwn(descriptor,'value'))throw new TypeError('Copy receiver requires own data fields');\n      visit(descriptor.value);\n    }\n    active.delete(value);done.add(value);\n  }\n  visit(value);return true;\n}\n";
const GUARDED_OPTIONAL_EQUATION='let N=R(x); discard G(N); N == guarded_optional_value(R(x))';
function freshOptionalGuardPredicate(){
 assertReverseConcreteSourceHost();const source=readFileSync(new URL('./extensions/copy-runtime.mjs',import.meta.url),'utf8');assertReverseConcreteSourceHost();
 const pipeline=createRulePipeline([
  {phase:'language',rules:[{id:'javascript:complete-immutable-predicate-cst',apply:source=>{const first=transportConcreteSyntaxSource(source,{language:'JavaScript'}),meta=serializeConcreteSyntaxMeta(first.document),reparsed=transportConcreteSyntaxMeta(meta);if(reparsed.source!==source)fail('complete predicate CST source differs');return {source,meta,sourceEncoding:reparsed.document.sourceEncoding};}}]},
  {phase:'repository',rules:[{id:'router:closed-optional-result-predicate-equation',apply:value=>{if(value.source!==IMMUTABLE_COPY_SOURCE)fail('complete immutable predicate source changed');return {...value,profile:{id:'controlled-frozen-optional-string-immutable-copy-v1',predicateSource:value.source,predicateSha256:hash(value.source),predicate:'assertImmutableCopy',equation:GUARDED_OPTIONAL_EQUATION,resultCases:[{tag:'None',ownDataKeys:['$'],primitiveFields:['$']},{tag:'Some',ownDataKeys:['$','field0'],primitiveFields:['$','field0']}],premises:['Actual fixed optional as_str result uses captured create/define/freeze.','Result is a nonProxy ordinary frozen record with primitive string fields only.','The complete native predicate visits one record and one or two primitive fields.'],oldGuardObservationEquivalent:false,semanticAuthority:false}};}}]},
 ]),result=pipeline.run(source);
 return {profile:result.value.profile,receipt:{...result.value,trace:result.trace},verify(){assertReverseConcreteSourceHost();const current=readFileSync(new URL('./extensions/copy-runtime.mjs',import.meta.url),'utf8');assertReverseConcreteSourceHost();if(current!==source)fail('complete immutable predicate source changed during projection');}};
}
// Pure finite grammar recognizer, separately exercised as source DATA in tests.
// All wrapper checks precede the sole operand projection. No generic let or
// discarded guard is admitted by this helper.
function guardedOptionalValue(node,env,project,equal,booleanType){
 const reject=()=>{throw TypeError('Forward optional Json composition: exact guarded optional value required');};
 const fields=(value,allowed)=>value&&typeof value==='object'&&!Array.isArray(value)&&Reflect.ownKeys(value).every(key=>typeof key==='string'&&allowed.includes(key));
 if(!fields(node,['k','name','value','body','type','span','mutable'])||node.k!=='let'||node.mutable!==undefined&&node.mutable!==false||typeof node.name!=='string'||!node.name||env.has(node.name))reject();
 const operand=node.value,discard=node.body,guard=discard?.value,returned=discard?.body;
 if(operand?.k!=='routerOptionCallback'||!node.type||!operand.type||!equal(node.type,operand.type)||!fields(discard,['k','value','body','type','span'])||discard.k!=='routerDiscard'||!equal(discard.type,operand.type))reject();
 if(!fields(guard,['k','object','type','span'])||guard.k!=='routerPatternImmutable'||!equal(guard.type,booleanType))reject();
 for(const variable of [guard.object,returned])if(!fields(variable,['k','name','type','span'])||variable.k!=='var'||variable.name!==node.name||!equal(variable.type,operand.type))reject();
 const value=project(operand);
 if(value?.kind!=='optional-reader'||value.role!=='optional-str'||value.root!=='input0')reject();
 return value;
}
// This vocabulary is projected independently from all three genuine checked
// products. Variable correspondence is lexical; public IR shape is no permit.
function projectFunction(fn,declarations,names,guardPredicate){
 if(fn?.k!=='fn'||fn.async||fn.params.length!==1||optional(fn.params[0].type,declarations,names).kind!=='optional-json'||optional(fn.ret,declarations,names).kind!=='optional-str')return null;
 let cells=0,sequence=0,operations=0;const tick=depth=>{if(++cells>4096||depth>64)fail('finite semantic projection budget');};
 const fresh=()=> 'local'+sequence++;
 const binding=(env,node)=>{const row=env.get(node.name);if(node.k!=='var'||!row||!same(node.type,row.type))fail('actual lexical binding or type differs');return row;};
 const text=node=>node?.type?.kind==='string'&&!node.type.rustReference&&!node.type.rustBorrowingUnresolved;
 function value(node,env,depth){
  tick(depth);if(!node||typeof node!=='object')fail('checked expression required');
  if(node.k==='let'){const projected=guardedOptionalValue(node,env,operand=>value(operand,env,depth+1),same,BOOL);if(optional(node.type,declarations,names).kind!=='optional-str')fail('guarded optional string domain differs');return {kind:'guarded-optional-value',value:projected,guard:guardPredicate().profile,role:'optional-str',root:projected.root};}
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
  if(value.kind==='guarded-optional-value')return expression(value.value);
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
 let predicate=null;const guardPredicate=()=>predicate??(predicate=freshOptionalGuardPredicate());
 const originalModel=projectFunction(original,checked.declarations,sourceNames,guardPredicate),targetModel=projectFunction(current,target.program.declarations,targetNames,guardPredicate),lowerModel=projectFunction(lowered.own,lowered.program.declarations,targetNames,guardPredicate);
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
 assertReverseConcreteSourceHost();const candidate={parent:{id:parentId,file:entry.file,source:parent.source,sha256:sourceHash},row:{identity:Buffer.from(JSON.stringify([project,entry.file,sourceHash,entry.name,entry.span,'optional-json-as-str-v1']),'utf8').toString('hex'),name:entry.name,source:entry.file,sourceSha256:sourceHash,span:entry.span,original:{parent:parentId,source,sha256:hash(source)},javascriptPath,typescriptPath,target:mapping.target,canonicalAbi:'registered-optional-json-as-str-definition-v1',targetFormat:'checked-optional-json-composition-v1',parameterCorrespondence:[{original:original.params[0].name,target:'input0',index:0}],signature:{original:{params:original.params,ret:original.ret},target:{params:current.params,ret:current.ret},lowered:{params:lowered.own.params,ret:lowered.own.ret}},semanticProjection:{original:originalModel,target:targetModel,lowered:lowerModel},guardedOptionalPredicate:predicate?.receipt??null,javascript:result.value.javascript,typescript:result.value.typescript,pair,trace:result.trace,retainedGuardedEmission:lowered.emitted,oldGuardObservationEquivalent:false,newSourceRequiresIndependentReverseAdmission:true,semanticAuthority:false,moduleStartupEquivalent:false,applicationEffectCompleteness:false}};
 if(predicate)predicate.verify();assertReverseConcreteSourceHost();return candidate;
}

// NEW explicit repository format for one complete source pattern. All old
// optional composition readers/renderers above retain their exact bodies.
function projectNonemptyField(fn,program,names){
 if(fn?.k!=='fn'||fn.async||fn.params.length!==2||fn.body?.k!=='routerPinnedOptionCallbackBody')return null;
 const [input,key]=fn.params,receiver=input.type;
 if(receiver.kind!=='data'||names.get(receiver.name)!=='serde_json.Value'||receiver.rustReference?.kind!=='shared'||receiver.rustReference.pointee?.kind!=='data'||names.get(receiver.rustReference.pointee.name)!=='serde_json.Value'||key.type.kind!=='string'||key.type.rustReference||key.type.rustOwnership?.kind!=='borrowed'||key.type.rustOwnership.source!=='str'||optional(fn.ret,program.declarations,names).kind!=='optional-str')fail('actual shared Json key and optional string signature required');
 const filtered=readOriginalNonemptyStrFilter(fn.body,program);if(!filtered)fail('actual privately reissued nonempty string filter required');
 const bind=filtered.receiver;if(bind.k!=='routerOptionCallback'||bind.op!=='and_then'||optional(bind.type,program.declarations,names).kind!=='optional-str'||!same(bind.type,fn.body.type))fail('exact checked optional as_str bind required');
 const get=bind.value;if(get.k!=='routerHostCall'||get.id!=='serde_json_value_get_string'||get.args.length!==2||optional(get.type,program.declarations,names).kind!=='optional-json')fail('actual canonical get string source call required');
 let original=get.args[0];if(original.k==='routerStandardSharedReceiver'){if(original.sourceReceiverCopy?.profile!=='rust-1.89-shared-reference-copy'||original.sourceReceiverCopy.contract!==get.id)fail('actual field receiver copy source differs');original=original.object;}
 if(original.k!=='var'||original.name!==input.name||!same(original.type,input.type)||get.args[1].k!=='var'||get.args[1].name!==key.name||!same(get.args[1].type,key.type))fail('get needs the two actual original parameters in order');
 const callback=bind.callback,binding=callback?.binding;
 if(callback?.k!=='routerLambda'||callback.arity!==1||binding?.k!=='let'||binding.value?.k!=='routerLambdaInput'||binding.value.position!==0||!same(binding.value.type,optional(get.type,program.declarations,names).payload)||!same(callback.type.result,bind.type))fail('actual one-input checked as_str callback required');
 const call=binding.body;if(call.k!=='routerHostCall'||call.id!=='serde_json_value_as_str'||call.args.length!==1||!same(call.type,bind.type))fail('complete canonical as_str operation required');
 let argument=call.args[0];if(argument.k==='routerStandardSharedReceiver'){if(argument.sourceReceiverCopy?.profile!=='rust-1.89-shared-reference-copy'||argument.sourceReceiverCopy.contract!==call.id)fail('actual string receiver copy differs');argument=argument.object;}
 if(argument.k!=='var'||argument.name!==binding.name||!same(argument.type,binding.value.type))fail('as_str must use its own checked lambda input');
 return {kind:'json-nonempty-string-field',parameters:['input0','input1'],root:'input0',readers:['serde_json_value_get_string','serde_json_value_as_str'],filter:{originalMethodSource:filtered.originalMethodSource,selectionEquation:filtered.selectionEquation,methodSource:filtered.methodSource,methodBody:filtered.methodBody,sourceProfile:filtered.sourceProfile,equation:filtered.equation,predicate:filtered.predicate,callbackEvaluations:filtered.callbackEvaluations},semanticAuthority:false};
}
/** Proposal only: actual compiler products and all source fences are mandatory. */
export function prepareForwardJsonNonemptyFieldDefinition({project,entry,checked,target,sourceModules,lower,index,transform,format}){
 if(format!=='core-reader'||entry.term!=='fn')return null;
 const original=checked.declarations.get(entry.name),current=target.program.declarations.get(target.names.get(entry.name));
 if(original?.params?.length!==2||original.body?.k!=='routerPinnedOptionCallbackBody'||current?.params?.length!==2||current.body?.k!=='routerPinnedOptionCallbackBody')return null;
 const lowered=lower(entry),{sourceNames,targetNames}=canonicalLayouts(checked,target,lowered),renames=new Map(target.names);
 for(const [before,after]of [[original,current],[current,lowered.own]]){const normalize=before===original?value=>renamed(value,renames):value=>value;if(before.params.some((param,at)=>!same(normalize(param.type),after.params[at]?.type))||!same(normalize(before.ret),after.ret))fail('complete nonempty source target lower signatures differ');}
 const originalModel=projectNonemptyField(original,checked,sourceNames),targetModel=projectNonemptyField(current,target.program,targetNames),lowerModel=projectNonemptyField(lowered.own,lowered.program,targetNames);
 if(!originalModel||!targetModel||!lowerModel||!same(originalModel,targetModel)||!same(targetModel,lowerModel))fail('three genuine nonempty field projections differ');
 const mappings=lowered.emitted.mappings.filter(row=>row.source===lowered.own.fullName);if(mappings.length!==1)fail('unique actual nonempty emitted mapping required');const mapping=mappings[0];
 const parents=sourceModules.filter(module=>module.file===entry.file&&same(module.path,entry.path));if(parents.length!==1)fail('unique physical nonempty parent required');const parent=parents[0];
 if(!Number.isSafeInteger(entry.span.start)||!Number.isSafeInteger(entry.span.end)||entry.span.start<0||entry.span.start>=entry.span.end||entry.span.end>parent.source.length)fail('actual nonempty original declaration span required');
 const source=parent.source.slice(entry.span.start,entry.span.end),sourceHash=hash(parent.source),parentId=entry.file+':'+sourceHash,stem='definition_'+index,javascriptPath='app/owned-definitions/'+stem+'.mjs',typescriptPath='typed/owned-definitions/'+stem+'.mts';
 const preamble='import {serde_json_value_get_string as get_field,serde_json_value_as_str as read_string} from "../runtime/json-runtime.mjs";\n';
 const body='  const field = get_field(input0, input1);\n  if (field.$ === "Some") {\n    const text = read_string(field.field0);\n    if (text.$ === "Some") {\n      if (text.field0 !== "") { return text; } else { return {$:"None"}; }\n    } else { return {$:"None"}; }\n  } else { return {$:"None"}; }\n';
 const javascript=preamble+'function core_definition(input0, input1){\n'+body+'}\n',typescript=preamble+'function core_definition(input0:Parameters<typeof get_field>[0], input1:Parameters<typeof get_field>[1]):ReturnType<typeof read_string>{\n'+body+'}\n',ts=ownershipCompiler();
 function bind(text,path,kind,language){const file=ts.createSourceFile(path,text,ts.ScriptTarget.Latest,true,kind);if(file.parseDiagnostics.length||file.statements.length!==2)fail('complete nonempty template syntax');const fn=file.statements[1];if(!ts.isFunctionDeclaration(fn)||fn.name?.text!=='core_definition'||fn.parameters.length!==2||!fn.body)fail('actual nonempty declaration template differs');return transform(text,[{start:fn.getStart(file),end:fn.getStart(file),replacement:'export '},{start:fn.name.getStart(file),end:fn.name.end,replacement:mapping.target}],language);}
 const pipeline=createRulePipeline([{phase:'language',rules:[{id:'checked-json-field:three-reissued-filter-relations',apply:()=>({javascript,typescript,originalModel,targetModel,lowerModel})}]},{phase:'repository',rules:[{id:'router-json-field:existing-readers-and-explicit-some-dominance',apply:value=>({...value,javascript:bind(value.javascript,javascriptPath,ts.ScriptKind.JS,'JavaScript'),typescript:bind(value.typescript,typescriptPath,ts.ScriptKind.TS,'TypeScript')})}]}]),result=pipeline.run(null),pair=prepareOwnedCorePairedTypes(javascriptPath,result.value.javascript.after.source,typescriptPath,result.value.typescript.after.source);
 assertReverseConcreteSourceHost();return {parent:{id:parentId,file:entry.file,source:parent.source,sha256:sourceHash},row:{identity:Buffer.from(JSON.stringify([project,entry.file,sourceHash,entry.name,entry.span,'json-nonempty-field-v1']),'utf8').toString('hex'),name:entry.name,source:entry.file,sourceSha256:sourceHash,span:entry.span,original:{parent:parentId,source,sha256:hash(source)},javascriptPath,typescriptPath,target:mapping.target,canonicalAbi:'registered-json-nonempty-field-definition-v1',targetFormat:'checked-json-nonempty-field-v1',parameterCorrespondence:original.params.map((param,index)=>({original:param.name,target:'input'+index,index})),signature:{original:{params:original.params,ret:original.ret},target:{params:current.params,ret:current.ret},lowered:{params:lowered.own.params,ret:lowered.own.ret}},semanticProjection:{original:originalModel,target:targetModel,lowered:lowerModel},javascript:result.value.javascript,typescript:result.value.typescript,pair,trace:result.trace,retainedGuardedEmission:lowered.emitted,oldGuardObservationEquivalent:false,newSourceRequiresIndependentReverseAdmission:true,semanticAuthority:false,moduleStartupEquivalent:false,applicationEffectCompleteness:false}};
}
