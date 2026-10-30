// Canonical Rust syntax supplies source proposals only. The fixed consumer
// freshly checks the entire JS proposal and reproduces every original Rust token.
import {posix} from 'node:path';
import {httpResourceCallerOperationNames,httpResourceCallerContract,httpResourceResult} from './http-resource-caller-contracts.mjs';
import {httpResourceOption} from './http-resource-options.mjs';
import {httpResourceNativeDomain} from './http-resource-native-domains.mjs';
import {httpResourcePublicInputType,httpResourceOwnedSignatureDomain} from './http-resource-public-domains.mjs';
import {httpResourceCallerName} from './http-resource-caller-flow.mjs';
import {emitAsyncControlU64Guards} from './async-control-u64-guards.mjs';
import {UnsupportedOwnedRustSource} from './http-resource-rust-syntax.mjs';
const fail=message=>{throw new UnsupportedOwnedRustSource('Async control proposal: '+message);};

export function projectHttpResourceRustFunctions(functions,{javascriptPath,runtimeRoot}={}){
 const imports=new Map(),used=new Set(),localProposals=new Map();for(const fn of functions){if(localProposals.has(fn.name))fail('unique actual native local function required');localProposals.set(fn.name,{local:true,javascriptName:fn.name,rustPath:fn.name,args:fn.parameters.map(parameter=>httpResourceNativeDomain(parameter.type)),ret:httpResourceNativeDomain(fn.returns),async:fn.asynchronous,release:null});}let cells=0,sequence=0;
 const tick=depth=>{if(++cells>100000||depth>160)fail('complete canonical HTTP source projection bound');};
 const name=value=>{try{return httpResourceCallerName(value);}catch(error){if(!(error instanceof TypeError))throw error;fail(error.message);}};
 const reserve=(value,depth=0)=>{tick(depth);if(typeof value==='string')used.add(value);else if(value&&typeof value==='object')for(const child of Object.values(value))reserve(child,depth+1);};reserve(functions);
 function imported(id){
  if(!imports.has(id)){const operation=httpResourceCallerContract(id);if(!operation&&id!=='deferFilesystemFlow')fail('actual registered import proposal required');let local;do{local='http_operation_'+sequence++;}while(used.has(local));used.add(local);imports.set(id,{name:id,local,module:operation?.runtimeModule??'extensions/filesystem-effects-runtime.mjs'});}return imports.get(id).local;
 }
 function inputType(text){return httpResourcePublicInputType(httpResourceNativeDomain(text),imported);}
 function unwrap(node,depth=0){tick(depth);return node?.kind==='temporary'?unwrap(node.value,depth+1):node;}
 function borrowed(node,depth=0){node=unwrap(node,depth);return ['borrow','dereference'].includes(node?.kind)?borrowed(node.value,depth+1):node;}
 function operation(path){if(localProposals.has(path))return localProposals.get(path);const rows=httpResourceCallerOperationNames().map(httpResourceCallerContract).filter(row=>!row.nativeForm&&row.rustPath===path);if(rows.length!==1)fail('one actual complete native HTTP operation path required');return rows[0];}
 function domain(node,locals,depth=0){
  tick(depth);node=borrowed(node,depth+1);if(node.kind==='name')return locals.get(node.name)?.type??null;if(['boolean','string','integer'].includes(node.kind))return {boolean:'bool',string:'str',integer:node.type}[node.kind];
  if(node.kind==='field'&&node.name==='await')return domain(node.value,locals,depth+1);if(node.kind==='effect-try')return httpResourceResult(domain(node.value,locals,depth+1))?.value??null;
  if(node.kind==='json-list-literal')return 'json-list-owned';
  if(node.kind==='choose'){if(node.yes.statements.length||node.no.statements.length||!node.yes.tail||!node.no.tail)return null;const yes=domain(node.yes.tail,locals,depth+1),no=domain(node.no.tail,locals,depth+1);return yes===no?yes:null;}
  if(node.kind==='call'){if(['Ok','Some'].includes(node.path)&&node.args.length===1){const value=unwrap(node.args[0],depth+1);return value?.kind==='name'?locals.get(value.name)?.fullType??null:null;}return operation(node.path).ret;}if(['json-array','json-null','json-scalar'].includes(node.kind))return 'json';if(node.kind==='binary'&&['&&','||','==','!=','<','<=','>','>='].includes(node.op))return 'bool';return null;
 }
 function expression(node,locals,asynchronous,depth=0){
  tick(depth);node=unwrap(node,depth+1);if(!node)fail('complete original HTTP expression required');
  if(node.kind==='typed-lambda'){
   if(node.parameters.length>64)fail('complete typed native callback parameters required');const declared=new Map(locals),names=new Set(),parameters=node.parameters.map(row=>{const id=name(row.name),type=httpResourceNativeDomain(row.type);if(names.has(id))fail('unique actual native callback parameter required');names.add(id);declared.set(id,{guarded:false,type});return id;});return '('+parameters.join(', ')+') => '+body(node.body,declared,false,depth+1);
  }
  if(['borrow','dereference'].includes(node.kind))return expression(borrowed(node,depth+1),locals,asynchronous,depth+1);
  if(node.kind==='name'){const id=name(node.name);return locals.get(id)?.guarded?id+'.field0':id;}
  if(node.kind==='choose'){if(node.yes.statements.length||node.no.statements.length||!node.yes.tail||!node.no.tail)fail('canonical conditional value requires complete expression-only native arms');return '('+expression(node.condition,locals,asynchronous,depth+1)+' ? '+expression(node.yes.tail,locals,asynchronous,depth+1)+' : '+expression(node.no.tail,locals,asynchronous,depth+1)+')';}
  if(node.kind==='json-list-literal')return '['+node.elements.map(value=>expression(value,locals,asynchronous,depth+1)).join(', ')+']';
  if(node.kind==='unit')return 'null';if(node.kind==='integer'){if(node.type!=='u64')fail('closed unsigned count required');return node.value+'n';}if(node.kind==='boolean')return String(node.value);if(node.kind==='string')return JSON.stringify(node.value);
  if(node.kind==='json-null')return imported('json_macro_null')+'()';if(node.kind==='json-array'){if(node.elements.length)fail('nonempty JSON arrays require complete element source rules');return imported('json_macro_array')+'([])';}
  if(node.kind==='json-scalar'){const type=domain(node.value,locals,depth+1),form={str:'string',bool:'bool',u64:'u64'}[type];if(!form)fail('native JSON scalar needs an actual whole source scalar domain');return imported('json_macro_'+form)+'('+expression(node.value,locals,asynchronous,depth+1)+')';}
  if(node.kind==='not')return '(!'+expression(node.value,locals,asynchronous,depth+1)+')';if(node.kind==='binary'&&['&&','||','==','!=','<','<=','>','>='].includes(node.op))return '('+expression(node.left,locals,asynchronous,depth+1)+' '+(node.op==='=='?'===':node.op==='!='?'!==':node.op)+' '+expression(node.right,locals,asynchronous,depth+1)+')';
  let awaited=false;if(node.kind==='field'&&node.name==='await'){awaited=true;node=unwrap(node.value,depth+1);}if(node.kind!=='call')fail('actual canonical HTTP operation required');
  if(['Ok','Some'].includes(node.path)){const value=unwrap(node.args[0],depth+1),actual=value?.kind==='name'?locals.get(value.name):null;if(awaited||node.args.length!==1||!actual?.guarded||actual.carrier!==(node.path==='Ok'?'result':'option'))fail('canonical wrapper must restore its actual same guarded container');return name(value.name);}
  const row=operation(node.path);if(Boolean(row.async)!==awaited||awaited&&!asynchronous||node.args.length!==row.args.length||row.args.includes('deferred-callback'))fail('complete canonical operation/await/arity domain differs');
  return (awaited?'await ':'')+(row.local?name(row.javascriptName):imported(row.javascriptName))+'('+node.args.map(argument=>expression(borrowed(argument,depth+1),locals,asynchronous,depth+1)).join(', ')+')';
 }
 function propagated(node,locals,asynchronous,depth){
  tick(depth);node=unwrap(node,depth+1);if(node.kind==='effect-try')return {node:node.value,value:expression(node.value,locals,asynchronous,depth+1),cleanup:[],option:httpResourceOption(domain(node.value,locals,depth+1))?{same:true,cleanup:[]}:null};if(node.kind!=='match'||node.arms.length!==2)return null;
  if(node.arms.some(row=>row.pattern==='Some(__ro_http_some)')){
   const some=node.arms.find(row=>row.pattern==='Some(__ro_http_some)'),none=node.arms.find(row=>row.pattern==='None'),success=unwrap(some?.value,depth+1),failure=unwrap(none?.value,depth+1);if(!some||!none||success?.kind!=='name'||success.name!=='__ro_http_some'||failure?.kind!=='block'||failure.tail)fail('complete canonical absent Option control arm required');if(failure.statements.length!==1||failure.statements[0].kind!=='return'||unwrap(failure.statements[0].value,depth+1)?.kind!=='block')return {node:node.value,value:expression(node.value,locals,asynchronous,depth+1),cleanup:[],option:{loop:true,body:failure}};const returned=unwrap(failure.statements[0].value,depth+1);let fallback;
   if(returned.tail?.kind==='name'&&returned.tail.name==='None'){const cleanup=returned.statements.map(statement=>{const value=unwrap(statement.value,depth+1);if(statement.kind!=='effect'||value?.kind!=='call'||!operation(value.path).release&&!operation(value.path).local)fail('canonical None cleanup needs an actual or whole-checkable local release');return expression(value,locals,asynchronous,depth+1)+';';});fallback={same:true,cleanup};}
   else fallback={same:false,body:returned};return {node:node.value,value:expression(node.value,locals,asynchronous,depth+1),cleanup:[],option:fallback};
  }
  if(node.arms.some(row=>row.pattern==='Err(_)')){
   const ok=node.arms.find(row=>row.pattern==='Ok(__ro_http_value)'),err=node.arms.find(row=>row.pattern==='Err(_)'),success=unwrap(ok?.value,depth+1),failure=unwrap(err?.value,depth+1);if(!ok||!err||success?.kind!=='name'||success.name!=='__ro_http_value'||failure?.kind!=='block'||failure.tail||failure.statements.length!==1||failure.statements[0].kind!=='return')fail('complete canonical discarded-error Result fallback required');const returned=unwrap(failure.statements[0].value,depth+1);if(returned?.kind!=='block')fail('complete original Result fallback source block required');return {node:node.value,value:expression(node.value,locals,asynchronous,depth+1),cleanup:[],resultFallback:returned};
  }
  const ok=node.arms.find(row=>row.pattern==='Ok(__ro_http_value)'),err=node.arms.find(row=>row.pattern==='Err(__ro_http_error)');if(!ok||!err)fail('whole canonical HTTP cleanup arms required');const success=unwrap(ok.value,depth+1),failure=unwrap(err.value,depth+1);
  if(success?.kind!=='name'||success.name!=='__ro_http_value'||failure?.kind!=='block'||failure.tail||!failure.statements.length)fail('whole canonical HTTP success/error branch required');const last=failure.statements.at(-1),returned=unwrap(last.value,depth+1);
  if(last.kind!=='return'||returned?.kind!=='call'||returned.path!=='Err'||returned.args.length!==1||unwrap(returned.args[0],depth+1)?.name!=='__ro_http_error')fail('cleanup must return the actual whole original error');
  const cleanup=failure.statements.slice(0,-1).map(statement=>{const value=unwrap(statement.value,depth+1);if(statement.kind!=='effect'||value?.kind!=='call'||!operation(value.path).release&&!operation(value.path).local)fail('canonical error cleanup needs an actual or whole-checkable local release');return expression(value,locals,asynchronous,depth+1)+';';});return {node:node.value,value:expression(node.value,locals,asynchronous,depth+1),cleanup};
 }
 function body(block,outer,asynchronous,depth=0,fragment=false){
  tick(depth);const locals=new Map(outer),lines=[];let terminal=false;
  for(let index=0;index<block.statements.length;index++){
   const statement=block.statements[index];tick(depth+1);if(terminal)fail('statement after complete canonical HTTP return');
   if(statement.kind==='let'){
    const id=name(statement.name);if(locals.has(id))fail('ordinary nonshadowed canonical local required');const value=propagated(statement.value,locals,asynchronous,depth+1);
    if(value){const fullType=domain(value.node,locals,depth+1),carrier=value.option?httpResourceOption(fullType):httpResourceResult(fullType),type=carrier?.value;if(!type)fail('canonical propagation requires an actual whole container');const fallback=value.resultFallback?body(value.resultFallback,locals,asynchronous,depth+1):value.option?.loop?body(value.option.body,locals,asynchronous,depth+1,true):value.option?(value.option.same?'{ '+value.option.cleanup.join(' ')+' return '+id+'; }':body(value.option.body,locals,asynchronous,depth+1)):'{ '+value.cleanup.join(' ')+' return '+id+'; }';lines.push('const '+id+' = '+value.value+';','if ('+id+'.$ === '+JSON.stringify(value.option?'None':'Err')+') '+fallback);locals.set(id,{guarded:true,carrier:value.option?'option':'result',type,fullType});}
    else{const type=domain(statement.value,locals,depth+1),mutable=!!statement.mutable&&['bool','u64','text-owned','json','json-list-owned','bytes-owned'].includes(type);lines.push((mutable?'let ':'const ')+id+' = '+expression(statement.value,locals,asynchronous,depth+1)+';');locals.set(id,{guarded:false,type,mutable});}continue;
   }
   if(statement.kind==='let-tuple'){const value=unwrap(statement.value,depth+1);if(statement.bindings.length!==2||value?.kind!=='name'||!locals.get(value.name)?.guarded||locals.get(value.name).type!=='channel-pair')fail('complete guarded channel pair required');const names=statement.bindings.map(row=>name(row.name));lines.push('const ['+names.join(', ')+'] = '+name(value.name)+'.field0;');names.forEach((id,index)=>locals.set(id,{guarded:false,type:index?'receiver-owned':'sender-owned'}));continue;}
   if(statement.kind==='for-shared-json'){
    const id=name(statement.name),source=borrowed(statement.iterable,depth+1),type=domain(statement.iterable,locals,depth+1),owned=type==='json-list-owned';if(locals.has(id)||source?.kind!=='name'||!['json-list-owned','json-list-ref'].includes(type)||owned&&(statement.iterable.kind!=='borrow'||statement.iterable.mutable)||!owned&&statement.iterable.kind!=='name')fail('canonical shared slice requires its original live qualified list and nonshadowing element');const scope=new Map(locals);scope.set(id,{guarded:false,type:'json-ref',mutable:false});lines.push('for (const '+id+' of '+expression(statement.iterable,locals,asynchronous,depth+1)+') '+body(statement.body,scope,asynchronous,depth+1,true));continue;
   }
   if(statement.kind==='loop'){lines.push('for (;;) '+body(statement.body,locals,asynchronous,depth+1,true));continue;}
   if(statement.kind==='while'){lines.push('while ('+expression(statement.condition,locals,asynchronous,depth+1)+') '+body(statement.body,locals,asynchronous,depth+1,true));continue;}
   if(statement.kind==='assign'){const id=name(statement.name),actual=locals.get(id);if(!actual?.mutable||!['bool','u64','text-owned','json','json-list-owned','bytes-owned'].includes(actual.type))fail('actual canonical mutable scalar, owned String, JSON or JSON list assignment required');lines.push(id+' = '+expression(statement.value,locals,asynchronous,depth+1)+';');continue;}
   if(statement.kind==='effect'){lines.push(expression(statement.value,locals,asynchronous,depth+1)+';');continue;}
   if(statement.kind==='if'){const complete=index===block.statements.length-1&&!block.tail,innerFragment=!complete||fragment;lines.push('if ('+expression(statement.condition,locals,asynchronous,depth+1)+') '+body(statement.yes,locals,asynchronous,depth+1,innerFragment)+' else '+body(statement.no,locals,asynchronous,depth+1,innerFragment));if(complete)terminal=true;continue;}
   if(['break','continue'].includes(statement.kind)){if(!fragment||index!==block.statements.length-1||block.tail)fail('complete nearest-loop canonical control exit required');lines.push(statement.kind+';');terminal=true;continue;}
   if(statement.kind==='return'&&index===block.statements.length-1&&!block.tail){lines.push('return '+expression(statement.value,locals,asynchronous,depth+1)+';');terminal=true;continue;}fail('original HTTP statement needs a complete source substitution rule');
  }
  if(fragment&&block.tail)fail('canonical loop fallthrough cannot add a return expression');if(block.tail){if(terminal)fail('competing complete source tails');lines.push('return '+expression(block.tail,locals,asynchronous,depth+1)+';');terminal=true;}if(!terminal&&!fragment)fail('every original HTTP path requires a complete return');return '{\n'+lines.join('\n')+'\n}';
 }
 const sourceFunctions=functions.map(fn=>{
  const parameters=fn.parameters.map(parameter=>({name:name(parameter.name),type:inputType(parameter.type)})),locals=new Map(fn.parameters.map(parameter=>[parameter.name,{guarded:false,type:httpResourceNativeDomain(parameter.type)}]));if(new Set(parameters.map(row=>row.name)).size!==parameters.length)fail('duplicate original caller parameters');
  const rawBody=body(fn.body,locals,fn.asynchronous),guards=emitAsyncControlU64Guards(fn.parameters.filter(parameter=>parameter.type==='u64').map(parameter=>name(parameter.name))),inner=guards?'{\n'+guards+'\n'+rawBody.slice(1):rawBody,docs=parameters.map(row=>' * @param {'+row.type+'} '+row.name),returnDomain=httpResourceNativeDomain(fn.returns),settledType=returnDomain==='unit'?'null':httpResourceOwnedSignatureDomain(returnDomain)||returnDomain==='str'?httpResourcePublicInputType(returnDomain,imported):null,returnType=fn.asynchronous?settledType?'ReturnType<typeof '+imported('deferFilesystemFlow')+'<'+settledType+'>>':null:({bool:'boolean',u64:'bigint','text-owned':'string',unit:'null'}[returnDomain]??settledType);if(returnType)docs.push(' * @returns {'+returnType+'}');
  return (docs.length?'/**\n'+docs.join('\n')+'\n */\n':'')+(fn.exported?'export ':'')+'function '+name(fn.name)+'('+parameters.map(row=>row.name).join(', ')+') '+(fn.asynchronous?'{ return '+imported('deferFilesystemFlow')+'(async () => '+inner+'); }':inner);
 }).join('\n\n');
 const edge=target=>{const value=posix.relative(posix.dirname(javascriptPath),target);return value.startsWith('.')?value:'./'+value;},source=[...imports.values()].map(row=>'import { '+row.name+' as '+row.local+' } from '+JSON.stringify(edge(runtimeRoot+'/'+row.module))+';').join('\n')+'\n\n'+sourceFunctions+'\n';if(source.length>2097152)fail('complete canonical HTTP source proposal bound');return {source,imports:[...imports.values()],sourceAuthority:false,semanticAuthority:false};
}
