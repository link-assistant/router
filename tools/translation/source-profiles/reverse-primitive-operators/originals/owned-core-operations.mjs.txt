// Checked owned-core operations, separate from the legacy portable profile.
// The body is always reconstructed from the current complete original source.
import {isDeepStrictEqual,types} from 'node:util';
import {posix} from 'node:path';
import {analyzeOriginalOwnedCoreSource,requireOwnedCoreSourceCurrent,ownedPlainData,ownedCoreSourceData,withOwnedRuntimeImportEdges} from './owned-core-source.mjs';
import {originalNamespaceTraversalIntrinsicsUnchanged,originalStaticSourceIntrinsicsUnchanged} from '../original-json-intrinsics.mjs';
import {ownedBase64Operation,ownedBase64RustCall,ownedBase64RustTypes,ownedBase64TypeScriptTypes} from './owned-base64-source.mjs';
import {ownedJsonReaderOperation,ownedJsonOptionalPayload,ownedJsonBorrowed,ownedJsonRustTypes,ownedJsonTypeScriptTypes,ownedJsonReaderRustCall,ownedJsonReaderTypeWitness} from './owned-json-source.mjs';
import {ownedJsonOptionalReaderOperation,ownedJsonOptionalReaderRustCall} from './owned-json-source.mjs';
import {ownedAsciiOperation,ownedAsciiRustCall} from './owned-ascii-source.mjs';
const issued=new WeakMap(),runtimes=new WeakMap();
const fail=message=>{throw new TypeError('Owned reverse operation: '+message);};
const OPS=Object.freeze({
 router_core_json_copy:{args:['json'],ret:'json',rust:'json_copy'},
 router_core_json_with_field:{args:['json','str','json'],ret:'json',rust:'json_with_field'},
 router_core_json_index_str:{args:['json','str'],ret:'json-ref',rust:'json_index_str',root:0},
 router_core_json_index_usize:{args:['json','usize'],ret:'json-ref',rust:'json_index_usize',root:0},
 router_core_json_map_index:{args:['map-ref','str'],ret:'json-ref',rust:'json_map_index',root:0},
 json_macro_value:{args:['json'],ret:'json',rust:'json_copy'},
 json_macro_null:{args:[],ret:'json',rust:null},
 json_macro_bool:{args:['bool'],ret:'json',rust:null},
 json_macro_string:{args:['str'],ret:'json',rust:null},
 json_macro_u64:{args:['u64'],ret:'json',rust:null},
 json_macro_i64:{args:['i64'],ret:'json',rust:null},
});
const KEYS=new Set('as async await break const continue crate default do dyn else enum export extern false fn for function if impl import in let loop match mod move mut new null pub ref return self static struct super switch this throw trait true try type typeof undefined unsafe use var void where while with yield abstract become box final gen macro override priv unsized virtual'.split(' '));
function rustName(name){
 if(!/^[a-z][A-Za-z0-9_]*$/u.test(name)||KEYS.has(name))fail('nonportable declaration name');
 const rust=name.replace(/[A-Z]/gu,c=>'_'+c.toLowerCase());if(KEYS.has(rust))fail('reserved declaration name');return rust;
}
const json=type=>type==='json'||type==='json-ref';
const compatible=(actual,wanted)=>wanted==='json'?json(actual):wanted==='i64'?actual==='i64'||actual==='usize':wanted==='u64'?actual==='usize':actual===wanted;
/** Only a private original check can create an executable item. */
export const isOwnedCoreItem=item=>!!item&&typeof item==='object'&&!types.isProxy(item)&&Object.getOwnPropertyDescriptor(item,'kind')?.value==='owned-function';
export function analyzeOwnedCoreModule(context,path){
 const result=analyzeOriginalOwnedCoreSource(context,path);
 for(const item of result.program)issued.set(item,{context});
 return result;
}
/** Reconstruct the exact original function; detached or edited items refuse. */
export function checkOwnedCoreItem(item,context=issued.get(item)?.context){
 if(!context)fail('unissued function');const input=ownedPlainData(item),analysis=analyzeOwnedCoreModule(context,input.source.path);
 if(analysis.source!==input.source.source)fail('complete caller source differs');
 const candidates=analysis.program.filter(value=>value.source.span[0]===input.source.span[0]&&value.source.span[1]===input.source.span[1]);
 if(candidates.length!==1)fail('original function span or checked domain differs');const result=candidates[0];
 if(!isDeepStrictEqual(result,input))fail('checked function/meta differs');return result;
}
// This synchronous storage lifetime never escapes its consumer invocation.
// Every accepted row still joins its full current private source/context.
export function withOwnedCoreItemChecks(run){
 let active=true,enabled=originalNamespaceTraversalIntrinsicsUnchanged(),admit=true,groups=null,native=null;
 const contexts=[];let groupCount=0,retainedCells=0,retainedUnits=0;
 if(enabled){native={Map,apply:Reflect.apply,get:Map.prototype.get,set:Map.prototype.set,clear:Map.prototype.clear};groups=new native.Map();}
 const get=(map,key)=>native.apply(native.get,map,[key]),set=(map,key,value)=>native.apply(native.set,map,[key,value]);
 const disable=()=>{enabled=false;admit=false;if(groups)native.apply(native.clear,groups,[]);};
 function cost(value){
  let cells=0,units=0;const ancestors=new Set();
  function visit(value,depth){
   if(++cells>100000-retainedCells||depth>160)return false;
   if(typeof value==='string'){units+=value.length;return units<=16777216-retainedUnits;}
   if(value===null||typeof value==='boolean'||typeof value==='number')return true;
   if(typeof value!=='object'||types.isProxy(value)||ancestors.has(value))return false;
   const array=Array.isArray(value),parent=Object.getPrototypeOf(value);
   if(array?parent!==Array.prototype:parent!==Object.prototype&&parent!==null)return false;
   const names=Reflect.ownKeys(value);if(names.length>100000-retainedCells-cells+1)return false;
   const fields=Object.getOwnPropertyDescriptors(value);
   for(const name of names){if(typeof name!=='string'||name==='stack'||!Object.hasOwn(fields,name)||!Object.hasOwn(fields[name],'value'))return false;}
   let length=names.length;
   if(array){const field=fields.length;if(!field||typeof field.value!=='number'||field.value<0||field.value%1!==0||names.length!==field.value+1)return false;length=field.value;}
   ancestors.add(value);
   for(let at=0;at<length;at++){
    const name=array?''+at:names[at],field=fields[name];
    if(!field||!Object.hasOwn(field,'value')||!field.enumerable){ancestors.delete(value);return false;}
    if(!array){units+=name.length;if(units>16777216-retainedUnits){ancestors.delete(value);return false;}}
    if(!visit(field.value,depth+1)){ancestors.delete(value);return false;}
   }
   ancestors.delete(value);return true;
  }
  return visit(value,0)?{cells,units}:null;
 }
 function canonicalCopy(value,input=false){
  const ops={isProxy:types.isProxy,isArray:Array.isArray,prototype:Object.getPrototypeOf,keys:Reflect.ownKeys,fields:Object.getOwnPropertyDescriptors,has:Object.hasOwn,define:Object.defineProperty,apply:Reflect.apply,Set,hasCycle:Set.prototype.has,addCycle:Set.prototype.add,deleteCycle:Set.prototype.delete,objectPrototype:Object.prototype,arrayPrototype:Array.prototype};
  const ancestors=new ops.Set();let cells=0,units=0,failed=false;
  const bad=()=>{failed=true;return undefined;};
  function visit(value,depth){
   if(failed||++cells>100000||depth>160)return bad();
   if(value===null||typeof value==='boolean'||typeof value==='number')return value;
   if(typeof value==='string'){units+=value.length;return units>16777216?bad():value;}
   if(typeof value!=='object'||ops.isProxy(value)||ops.apply(ops.hasCycle,ancestors,[value]))return bad();
   const array=ops.isArray(value),parent=ops.prototype(value);
   if(array?parent!==ops.arrayPrototype:parent!==ops.objectPrototype&&(input||parent!==null))return bad();
   const names=ops.keys(value);if(names.length>100000-cells+1)return bad();const fields=ops.fields(value);
   for(let at=0;at<names.length;at++){const name=names[at];if(typeof name!=='string'||name==='stack'||!ops.has(fields,name)||!ops.has(fields[name],'value'))return bad();const field=fields[name];if(name==='length'&&array){if(field.enumerable||field.configurable||!field.writable)return bad();}else if(!field.enumerable||!field.writable||!field.configurable)return bad();}
   let length=names.length;
   if(array){const field=fields.length;if(!field||typeof field.value!=='number'||field.value<0||field.value>4096||field.value%1!==0||names.length!==field.value+1)return bad();length=field.value;}
   ops.apply(ops.addCycle,ancestors,[value]);const result=array?[]:parent===null?{__proto__:null}:{};
   for(let at=0;at<length;at++){
    const name=array?''+at:names[at],field=fields[name];
    if(!field||!ops.has(field,'value')||!field.enumerable)return bad();
    const item=visit(field.value,depth+1);if(failed)return undefined;
    ops.define(result,name,{value:item,enumerable:true,writable:true,configurable:true});
   }
   ops.apply(ops.deleteCycle,ancestors,[value]);return result;
  }
  const result=visit(value,0);return failed?null:result;
 }
 const check=(item,context)=>{
  if(!active)fail('closed item-check invocation');
  if(!enabled||!originalNamespaceTraversalIntrinsicsUnchanged()){disable();return checkOwnedCoreItem(item,context);}
  if(context===undefined)context=issued.get(item)?.context;
  if(!context)fail('unissued function');
  const input=ownedPlainData(item),path=input.source.path;
  let paths=get(groups,context),analysis=paths&&get(paths,path);const retained=!!analysis;
  if(retained)requireOwnedCoreSourceCurrent(context);else analysis=analyzeOwnedCoreModule(context,path);
  // Source/hash/issuer observers may retain or mutate the original public
  // copies. Detach them through qualified native descriptors before comparison.
  if(!originalNamespaceTraversalIntrinsicsUnchanged()||!originalStaticSourceIntrinsicsUnchanged()){disable();return checkOwnedCoreItem(input,context);}
  const snapshot=canonicalCopy(input,true);if(!snapshot){disable();return checkOwnedCoreItem(item,context);}
  if(!retained){analysis=canonicalCopy(analysis);if(!analysis){disable();return checkOwnedCoreItem(item,context);}}
  if(analysis.source!==snapshot.source.source)fail('complete caller source differs');
  const candidates=analysis.program.filter(value=>value.source.span[0]===snapshot.source.span[0]&&value.source.span[1]===snapshot.source.span[1]);
  if(candidates.length!==1)fail('original function span or checked domain differs');
  // Only separate, private ordinary-data copies enter equality. The canonical
  // return never aliases the analysis that may be retained for later rows.
  const result=canonicalCopy(candidates[0]);if(!result){disable();return checkOwnedCoreItem(item,context);}
  if(!isDeepStrictEqual(result,snapshot))fail('checked function/meta differs');
  if(!originalNamespaceTraversalIntrinsicsUnchanged()||!originalStaticSourceIntrinsicsUnchanged()){disable();return checkOwnedCoreItem(input,context);}
  if(admit&&!retained){
   // Retain the qualified private copy made before equality. Returned and
   // original issued rows remain separate; the census and all fences still run.
   const privateAnalysis=analysis;
   const size=groupCount<64?cost(privateAnalysis):null;
   if(size){
    if(!paths){paths=new native.Map();set(groups,context,paths);contexts[contexts.length]=context;}
    set(paths,path,privateAnalysis);groupCount++;retainedCells+=size.cells;retainedUnits+=size.units;
   }else admit=false;
  }
  issued.set(result,{context});return result;
 };
 let failed=false;
 try{return run(check);}catch(error){failed=true;throw error;}
 finally{
  active=false;if(groups)native.apply(native.clear,groups,[]);
  let exitFailed=false,exitError;
  try{for(let at=0;at<contexts.length;at++)try{requireOwnedCoreSourceCurrent(contexts[at]);}catch(error){if(!exitFailed){exitFailed=true;exitError=error;}}}
  finally{contexts.length=0;}
  // Preserve the original primary error, including null/undefined, while
  // attempting every final fence. No failed fence can produce a success.
  if(!failed&&exitFailed)throw exitError;
 }
}
export function checkOwnedCoreProgram(program,context){
 if(!Array.isArray(program)||program.length>4096)fail('invalid program');const names=new Set();return withOwnedRuntimeImportEdges(()=>withOwnedCoreItemChecks(check=>program.map(item=>{const result=check(item,context);if(names.has(result.name))fail('duplicate function');names.add(result.name);return result;})));
}
export function ownedCoreContext(item){return issued.get(checkOwnedCoreItem(item))?.context;}
const rustString=value=>'"'+value.replace(/[\\"\x00-\x1f\x7f]/gu,c=>({'\\':'\\\\','"':'\\"','\n':'\\n','\r':'\\r','\t':'\\t'}[c]??'\\u{'+c.codePointAt(0).toString(16)+'}'))+'"';
const TS_TYPES={...primitiveBitwiseTypeScriptTypes,...ownedBase64TypeScriptTypes,...ownedJsonTypeScriptTypes,'json-option-input':'Parameters<typeof __ro_router_core_json_option_as_str>[0]',json:'JsonValue','json-ref':'JsonValue','map-ref':"Extract<JsonValue,{readonly $:'Object'}>['field0']",str:'string',bool:'boolean',usize:'bigint'};
const RUST_TYPES={...primitiveBitwiseRustTypes,...ownedBase64RustTypes,...ownedJsonRustTypes,'json-option-input':"::std::option::Option<&'a crate::translation_core::Json>",json:'crate::translation_core::Json','json-ref':"&'a crate::translation_core::Json",'map-ref':"&'a ::serde_json::Map<::std::string::String,crate::translation_core::Json>",str:"&'a str",bool:'bool',usize:'u64'};
export function emitOwnedCoreProgram(input,target,{outputPath}={}){
 const program=checkOwnedCoreProgram(input),rust=target==='rust';if(!rust&&target!=='typescript')fail('unknown target');if(!program.length)return '';
 const context=issued.get(program[0]).context;requireOwnedCoreSourceCurrent(context);const sourceData=ownedCoreSourceData(context),rustTypes=sourceData.primitiveOperators===true?{...RUST_TYPES,...primitiveBitwiseRustTypes}:RUST_TYPES;
 if(program.some(item=>issued.get(item).context!==context))fail('mixed receiving contexts');
 let sequence=0;const imports=new Set(),primitiveTypeImports=new Set();
 function publicTypeScriptType(type){if(sourceData.primitiveOperators===true&&primitiveBitwiseType(type)){const row=primitiveBitwiseType(type);primitiveTypeImports.add(row.alias);return row.alias;}if(type==='json-option-input'){imports.add('router_core_json_option_as_str');return TS_TYPES[type];}const witness=ownedJsonReaderTypeWitness(type);if(witness){imports.add(witness);return 'ReturnType<typeof __ro_'+witness+'>';}return TS_TYPES[type];}

 function expr(value,borrowOwned=false){
  switch(value.kind){
   case 'variable':if(rust&&value.type==='text-owned')return borrowOwned?'&'+rustName(value.name):rustName(value.name)+'.to_owned()';return rust?(value.type==='json'?(borrowOwned?'&'+rustName(value.name):'__ro_copy(&'+rustName(value.name)+')'):rustName(value.name)):value.name;
   case 'string':return rust?rustString(value.value):JSON.stringify(value.value);
   case 'bool':return String(value.value);
   case 'integer':return rust?value.value+'_'+(primitiveBitwiseType(value.type)?.name??(value.type==='i64'?'i64':'u64')):value.value+'n';
   case 'not':return '(!'+expr(value.value)+')';
   case 'binary':return '('+expr(value.left)+' '+(rust?({'===':'==','!==':'!='}[value.op]??value.op):value.op)+' '+expr(value.right)+')';
   case 'choose':return rust?'(if '+expr(value.cond)+' { '+expr(value.then)+' } else { '+expr(value.else)+' })':'('+expr(value.cond)+' ? '+expr(value.then)+' : '+expr(value.else)+')';
   case 'json-array':case 'json-object':{
    const name=value.kind==='json-array'?'json_macro_array':'json_macro_object';imports.add(name);
    const children=value.kind==='json-array'?value.items:value.entries.map(entry=>entry.value);
    if(!rust)return '__ro_'+name+'(['+(value.kind==='json-array'?children.map(child=>expr(child)):value.entries.map(entry=>'['+JSON.stringify(entry.key)+', '+expr(entry.value)+']')).join(', ')+'])';
    const names=children.map(()=> '__ro_json_'+sequence++),bindings=children.map((child,index)=>'let '+names[index]+' = '+expr(child)+';');
    const literal=value.kind==='json-array'?'['+names.join(', ')+']':'{'+value.entries.map((entry,index)=>rustString(entry.key)+': '+names[index]).join(', ')+'}';
    return '{ '+bindings.join(' ')+' let __ro_result = crate::translation_core::json!('+literal+'); __ro_domain(&__ro_result); __ro_result }';
   }
   case 'option-none':return rust?'None':"({$:'None'})";
   case 'option-some':return rust?'Some('+expr(value.value)+')':"({$:'Some',field0:"+expr(value.value)+'})';
   case 'option-test':return rust?'('+expr(value.value)+').is_'+(value.some?'some':'none')+'()':'('+expr(value.value)+'.$ === '+JSON.stringify(value.some?'Some':'None')+')';
   case 'option-field':return rust?'(match '+expr(value.value)+' { Some(value) => value, None => unreachable!("checked original Some branch") })':expr(value.value)+'.field0';
   case 'primitive-bitwise-call':{
    const domain=primitiveBitwiseType(value.type),boolean=value.type==='bool';if(value.name!=='primitiveBitwise'||!boolean&&!domain||domain&&(value.bits!==domain.bits||value.signed!==domain.signed)||value.args.length!==2||value.args.some(argument=>!primitiveBitwiseCompatible(argument.type,value.type))||!ownedBooleanBitwiseOperator(value.operation))fail('checked primitive bitwise contract differs');imports.add(value.name);if(!rust)return '__ro_primitiveBitwise('+value.args.map(argument=>expr(argument)).join(', ')+', '+JSON.stringify(value.operation)+', '+(domain?domain.bits:'null')+', '+(domain?domain.signed:'null')+')';const names=value.args.map(()=> '__ro_arg_'+sequence++),bindings=value.args.map((argument,index)=>'let '+names[index]+' = '+expr(argument)+';');return '{ '+bindings.join(' ')+' '+ownedBooleanBitwiseRustCall(value.operation,names)+' }';
   }
   case 'json-option-call':{
    const op=ownedJsonOptionalReaderOperation(value.name);if(!op||value.type!==op.ret||value.args.length!==1||value.args[0].type!==op.input)fail('checked optional Json operation differs');imports.add(value.name);
    if(!rust)return '__ro_'+value.name+'('+expr(value.args[0])+')';
    const name='__ro_arg_'+sequence++;return '{ let '+name+' = '+expr(value.args[0])+'; '+ownedJsonOptionalReaderRustCall(value.name,name)+' }';
   }
   case 'json-reader-call':{
    const op=ownedJsonReaderOperation(value.name);if(!op||value.type!==op.ret||value.args.length!==op.args.length)fail('checked JSON reader contract differs');imports.add(value.name);
    if(!rust)return '__ro_'+value.name+'('+value.args.map(value=>expr(value)).join(', ')+')';
    const names=value.args.map(()=> '__ro_arg_'+sequence++),bindings=value.args.map((argument,index)=>'let '+names[index]+' = '+(argument.type==='json'?(argument.kind==='variable'?expr(argument,true):'&'+expr(argument)):expr(argument))+';');
    return '{ '+bindings.join(' ')+' '+ownedJsonReaderRustCall(value.name,names)+' }';
   }
   case 'ascii-call':{
    const op=ownedAsciiOperation(value.name);if(!op||value.type!==op.ret||value.args.length!==op.args.length||value.args.some(argument=>argument.type!=='str'))fail('checked ASCII contract differs');imports.add(value.name);
    if(!rust)return '__ro_'+value.name+'('+value.args.map(argument=>expr(argument)).join(', ')+')';
    const names=value.args.map(()=> '__ro_arg_'+sequence++),bindings=value.args.map((argument,index)=>'let '+names[index]+' = '+expr(argument)+';');
    return '{ '+bindings.join(' ')+' '+ownedAsciiRustCall(value.name,names)+' }';
   }
   case 'base64-call':{
    const op=ownedBase64Operation(value.name);if(!op||value.args.length!==1||value.copy!==op.copy||value.type!==op.ret)fail('checked base64 contract differs');imports.add(value.name);
    if(!rust)return '__ro_'+value.name+'('+expr(value.args[0])+')';
    const argument=value.args[0],name='__ro_arg_'+sequence++;
    const source=argument.type==='text-owned'?(argument.kind==='variable'?expr(argument,true):'&'+expr(argument)):expr(argument);
    return '{ let '+name+' = '+source+'; '+ownedBase64RustCall(value.name,name)+' }';
   }
   case 'owned-call':{
    const op=OPS[value.name];imports.add(value.name);
    if(!rust)return '__ro_'+value.name+'('+value.args.map(expr).join(', ')+')';
    const names=value.args.map(()=> '__ro_arg_'+sequence++),lines=value.args.map((argument,index)=>{
     const source=argument.type==='json'?(argument.kind==='variable'?expr(argument,true):'&'+expr(argument)):expr(argument);
     return 'let '+names[index]+' = '+source+';';
    });
    // All source arguments are bound in order. Owned local variables are
    // borrowed here; compensating copies happen only inside the fixed call.
    const args=names;
    let call;
    if(value.name==='json_macro_null')call='::serde_json::Value::Null';
    else if(value.name==='json_macro_bool')call='::serde_json::Value::Bool('+args[0]+')';
    else if(value.name==='json_macro_string')call='::serde_json::Value::String('+args[0]+'.to_owned())';
    else if(value.name==='json_macro_u64')call='::serde_json::Value::from('+args[0]+')';
    else if(value.name==='json_macro_i64')call='::serde_json::Value::from(i64::try_from('+args[0]+').expect("owned reverse i64 bound"))';
    else if(op.rust==='json_copy')call='__ro_copy('+args.join(', ')+')';
    else if(op.rust==='json_with_field')call='__ro_with_field('+args.join(', ')+')';
    else if(op.rust==='json_index_usize')call='match usize::try_from('+args[1]+') { Ok(index) => crate::translation_core::json_index_usize('+args[0]+', index), Err(_) => &::serde_json::Value::Null }';
    else call='crate::translation_core::'+op.rust+'('+args.join(', ')+')';
    return '{ '+lines.join(' ')+' '+call+' }';
   }
   default:fail('unissued expression kind');
  }
 }
 function body(statements,indent){return statements.map(statement=>{
  const pad=' '.repeat(indent);
  if(statement.kind==='let')return pad+(rust?'let ':'const ')+(rust?rustName(statement.name):statement.name)+' = '+expr(statement.value)+';';
  if(statement.kind==='return')return pad+'return '+expr(statement.value)+';';
  return pad+'if '+(rust?'':'(')+expr(statement.cond)+(rust?'':')')+' {\n'+body(statement.then,indent+4)+'\n'+pad+'} else {\n'+body(statement.else,indent+4)+'\n'+pad+'}';
 }).join('\n');}
 const code=program.map(item=>{
  const rustTypes=item.hostCalls.some(call=>ownedAsciiOperation(call.name))?{...RUST_TYPES,str:"&'a crate::translation_core::Str"}:RUST_TYPES;
  const borrowed=type=>['json-ref','map-ref','str','bytes-ref','base64-error-ref','json-option-input'].includes(type)||ownedJsonBorrowed(type),loan=borrowed(item.returns),explicit=loan&&item.resultRoot!==null&&item.params.filter(param=>borrowed(param.type)).length>1;
  const parameters=item.params.map(param=>{
   const type=rust?rustTypes[param.type].replace("'a ",explicit&&param.name===item.resultRoot?"'a ":''):publicTypeScriptType(param.type);
   return (rust?param.rust:param.name)+': '+type;
  }).join(', ');
  const returns=rust?rustTypes[item.returns].replace("'a ",item.resultRoot===null?"'static ":explicit?"'a ":''):publicTypeScriptType(item.returns);
  const signature=rust?'#[must_use]\n#[rustfmt::skip]\n'+(item.exported?'pub ':'')+'fn '+item.name+(explicit?"<'a>":'')+'(':(item.exported?'export ':'')+'function '+item.javascript+'(';
  return signature+parameters+')'+(rust?' -> ':': ')+returns+' {\n'+body(item.body,4)+'\n}';
 }).join('\n\n');
 requireOwnedCoreSourceCurrent(context);
 if(rust)return RUST_SUPPORT+'\n\n'+code+'\n';
 const output=outputPath??program[0].source.path,relative=(name,base=sourceData.runtimeRoot)=>{const path=posix.relative(posix.dirname(output),base+'/'+name);return path.startsWith('.')?path:'./'+path;};
 const lines=['import type {JsonValue} from '+JSON.stringify(relative('json-macro-runtime.mjs',[...imports].some(ownedAsciiOperation)?sourceData.declarationRoot:sourceData.runtimeRoot))+';'];
 if(primitiveTypeImports.size){const location=posix.relative(posix.dirname(output),(sourceData.declarationRoot??sourceData.runtimeRoot)+'/primitive-operator-runtime.mjs');lines.push('import type { '+[...primitiveTypeImports].join(', ')+' } from '+JSON.stringify(location.startsWith('.')?location:'./'+location)+';');}
 if([...imports].some(name=>ownedBase64Operation(name)))lines.push('import type {Base64Error,Base64Result} from '+JSON.stringify(relative('base64-runtime.mjs'))+';');
 for(const family of ['primitive-operator','json-update','json-macro','base64','json','json-option','string-iterator']){
  const names=[...imports].filter(name=>(ownedBooleanBitwiseOperation(name)?'primitive-operator':ownedAsciiOperation(name)?'string-iterator':ownedJsonOptionalReaderOperation(name)?'json-option':ownedBase64Operation(name)?'base64':ownedJsonReaderOperation(name)?'json':name.startsWith('json_macro_')?'json-macro':'json-update')===family);
  if(names.length)lines.push('import { '+names.map(name=>name+' as __ro_'+name).join(', ')+' } from '+JSON.stringify(relative(family+'-runtime.mjs'))+';');
 }
 return lines.join('\n')+'\n\n'+code+'\n';
}
// Matching the canonical successful-resource envelope is part of this NEW
// profile. Native panics are not advertised as catchable JavaScript Errors.
export const RUST_SUPPORT=`#[allow(dead_code)]
#[rustfmt::skip]
fn __ro_domain(value: &crate::translation_core::Json) {
    fn visit(value: &crate::translation_core::Json, depth: usize, nodes: &mut usize) {
        *nodes += 1;
        assert!(*nodes <= 4096 && depth <= 32, "owned reverse JSON budget");
        match value {
            ::serde_json::Value::Array(items) => {
                assert!(items.len() <= 4096, "owned reverse dense bound");
                for item in items { visit(item, depth + 1, nodes); }
            }
            ::serde_json::Value::Object(items) => {
                assert!(items.len() <= 4096, "owned reverse dense bound");
                for item in items.values() { visit(item, depth + 1, nodes); }
            }
            _ => {}
        }
    }
    visit(value, 0, &mut 0);
}
#[allow(dead_code)]
#[rustfmt::skip]
fn __ro_copy(value: &crate::translation_core::Json) -> crate::translation_core::Json {
    __ro_domain(value);
    crate::translation_core::json_copy(value)
}
#[allow(dead_code)]
#[rustfmt::skip]
fn __ro_with_field(base: &crate::translation_core::Json, key: &str, value: &crate::translation_core::Json) -> crate::translation_core::Json {
    let base = __ro_copy(base);
    let value = __ro_copy(value);
    assert!(base.is_null() || base.is_object(), "Owned JSON string-key update requires an object or null");
    let result = crate::translation_core::json_with_field(base, key, value);
    __ro_domain(&result);
    result
}`;
/** Prepare only the actual registered module, after fresh complete source joins. */
export async function prepareOwnedCoreRuntime(input){
 const program=checkOwnedCoreProgram(input),modules={update:await import('../json-update-runtime.mjs'),macro:await import('../json-macro-runtime.mjs')};
 if(program.some(item=>item.hostCalls.some(call=>ownedBooleanBitwiseOperation(call.name))))modules.primitive=await import('../extensions/primitive-operator-runtime.mjs');
 if(program.some(item=>item.hostCalls.some(call=>ownedJsonReaderOperation(call.name))))modules.json=await import('../extensions/json-runtime.mjs');
 if(program.some(item=>item.hostCalls.some(call=>ownedJsonOptionalReaderOperation(call.name))))modules.optional=await import('../json-option-runtime.mjs');
 if(program.some(item=>item.hostCalls.some(call=>ownedBase64Operation(call.name))))modules.base64=await import('../base64-runtime.mjs');
 if(program.some(item=>item.hostCalls.some(call=>ownedAsciiOperation(call.name))))modules.ascii=await import('../extensions/string-iterator-runtime.mjs');
 checkOwnedCoreProgram(program);const token=Object.freeze({schema:'owned-core-runtime-v1'});runtimes.set(token,{program,modules});return token;
}
export function evaluateOwnedCoreProgram(input,name,args,token){
 const program=checkOwnedCoreProgram(input),state=runtimes.get(token);if(!state||!isDeepStrictEqual(state.program,program))fail('unissued runtime/program');
 const item=program.find(item=>item.name===name||item.javascript===name);if(!item||!Array.isArray(args)||args.length!==item.params.length)fail('actual arguments differ');
 const env=new Map(item.params.map((param,index)=>[param.name,args[index]]));
 const get=(value,scope)=>{
  switch(value.kind){
   case 'variable':return scope.get(value.name);
   case 'string':case 'bool':return value.value;
   case 'integer':return BigInt(value.value);
   case 'not':return !get(value.value,scope);
   case 'choose':return get(value.cond,scope)?get(value.then,scope):get(value.else,scope);
   case 'binary':{const left=get(value.left,scope);if(value.op==='&&')return left&&get(value.right,scope);if(value.op==='||')return left||get(value.right,scope);const right=get(value.right,scope);switch(value.op){case '===':return left===right;case '!==':return left!==right;case '<':return left<right;case '<=':return left<=right;case '>':return left>right;case '>=':return left>=right;default:fail('unissued checked binary operator');}}
   case 'json-array':return state.modules.macro.json_macro_array(value.items.map(child=>get(child,scope)));
   case 'json-object':return state.modules.macro.json_macro_object(value.entries.map(entry=>[entry.key,get(entry.value,scope)]));
   case 'ascii-call':{if(!state.modules.ascii||!ownedAsciiOperation(value.name))fail('unissued ASCII runtime');return Reflect.apply(state.modules.ascii[value.name],undefined,value.args.map(value=>get(value,scope)));}
   case 'base64-call':{const op=ownedBase64Operation(value.name);if(!op||!state.modules.base64)fail('unissued base64 runtime');return Reflect.apply(state.modules.base64[value.name],undefined,value.args.map(value=>get(value,scope)));}
   case 'option-none':return {$:'None'};
   case 'option-some':return {$:'Some',field0:get(value.value,scope)};
   case 'option-test':return get(value.value,scope).$===(value.some?'Some':'None');
   case 'option-field':return get(value.value,scope).field0;
   case 'primitive-bitwise-call':{if(!state.modules.primitive||!ownedBooleanBitwiseOperation(value.name)||!ownedBooleanBitwiseOperator(value.operation))fail('unissued boolean primitive runtime');const domain=primitiveBitwiseType(value.type);return Reflect.apply(state.modules.primitive.primitiveBitwise,undefined,[get(value.args[0],scope),get(value.args[1],scope),value.operation,domain?.bits??null,domain?.signed??null]);}
   case 'json-option-call':{if(!state.modules.optional||!ownedJsonOptionalReaderOperation(value.name))fail('unissued optional Json runtime');return Reflect.apply(state.modules.optional[value.name],undefined,[get(value.args[0],scope)]); }
   case 'json-reader-call':return Reflect.apply(state.modules.json[value.name],undefined,value.args.map(value=>get(value,scope)));
   case 'owned-call':{const module=value.name.startsWith('json_macro_')?state.modules.macro:state.modules.update;return Reflect.apply(module[value.name],undefined,value.args.map(value=>get(value,scope)));}
   default:fail('unknown evaluated expression');
  }
 };
 const run=(body,scope)=>{for(const statement of body){if(statement.kind==='let')scope.set(statement.name,get(statement.value,scope));else if(statement.kind==='return')return get(statement.value,scope);else return run(get(statement.cond,scope)?statement.then:statement.else,new Map(scope));}fail('no return');};
 return run(item.body,env);
}

// GENERATED: bounded independent owned-core batch evaluation.
function evaluateOwnedCorePrepared(program,name,args,state){
 const item=program.find(item=>item.name===name||item.javascript===name);if(!item||!Array.isArray(args)||args.length!==item.params.length)fail('actual arguments differ');
 const env=new Map(item.params.map((param,index)=>[param.name,args[index]]));
 const get=(value,scope)=>{
  switch(value.kind){
   case 'variable':return scope.get(value.name);
   case 'string':case 'bool':return value.value;
   case 'integer':return BigInt(value.value);
   case 'not':return !get(value.value,scope);
   case 'choose':return get(value.cond,scope)?get(value.then,scope):get(value.else,scope);
   case 'binary':{const left=get(value.left,scope);if(value.op==='&&')return left&&get(value.right,scope);if(value.op==='||')return left||get(value.right,scope);const right=get(value.right,scope);switch(value.op){case '===':return left===right;case '!==':return left!==right;case '<':return left<right;case '<=':return left<=right;case '>':return left>right;case '>=':return left>=right;default:fail('unissued checked binary operator');}}
   case 'json-array':return state.modules.macro.json_macro_array(value.items.map(child=>get(child,scope)));
   case 'json-object':return state.modules.macro.json_macro_object(value.entries.map(entry=>[entry.key,get(entry.value,scope)]));
   case 'ascii-call':{if(!state.modules.ascii||!ownedAsciiOperation(value.name))fail('unissued ASCII runtime');return Reflect.apply(state.modules.ascii[value.name],undefined,value.args.map(value=>get(value,scope)));}
   case 'base64-call':{const op=ownedBase64Operation(value.name);if(!op||!state.modules.base64)fail('unissued base64 runtime');return Reflect.apply(state.modules.base64[value.name],undefined,value.args.map(value=>get(value,scope)));}
   case 'option-none':return {$:'None'};
   case 'option-some':return {$:'Some',field0:get(value.value,scope)};
   case 'option-test':return get(value.value,scope).$===(value.some?'Some':'None');
   case 'option-field':return get(value.value,scope).field0;
   case 'primitive-bitwise-call':{if(!state.modules.primitive||!ownedBooleanBitwiseOperation(value.name)||!ownedBooleanBitwiseOperator(value.operation))fail('unissued boolean primitive runtime');const domain=primitiveBitwiseType(value.type);return Reflect.apply(state.modules.primitive.primitiveBitwise,undefined,[get(value.args[0],scope),get(value.args[1],scope),value.operation,domain?.bits??null,domain?.signed??null]);}
   case 'json-option-call':{if(!state.modules.optional||!ownedJsonOptionalReaderOperation(value.name))fail('unissued optional Json runtime');return Reflect.apply(state.modules.optional[value.name],undefined,[get(value.args[0],scope)]); }
   case 'json-reader-call':return Reflect.apply(state.modules.json[value.name],undefined,value.args.map(value=>get(value,scope)));
   case 'owned-call':{const module=value.name.startsWith('json_macro_')?state.modules.macro:state.modules.update;return Reflect.apply(module[value.name],undefined,value.args.map(value=>get(value,scope)));}
   default:fail('unknown evaluated expression');
  }
 };
 const run=(body,scope)=>{for(const statement of body){if(statement.kind==='let')scope.set(statement.name,get(statement.value,scope));else if(statement.kind==='return')return get(statement.value,scope);else return run(get(statement.cond,scope)?statement.then:statement.else,new Map(scope));}fail('no return');};
 return run(item.body,env);
}

export function evaluateOwnedCoreBatch(input,calls,token){
 if(!originalNamespaceTraversalIntrinsicsUnchanged()||!originalStaticSourceIntrinsicsUnchanged())fail('batch requires original host operations');
 const program=checkOwnedCoreProgram(input),state=runtimes.get(token);
 if(!state||!isDeepStrictEqual(state.program,program))fail('unissued runtime/program');
 if(!program.length)fail('batch requires an issued nonempty program');
 const array=(value,bound)=>{
  if(types.isProxy(value)||!Array.isArray(value)||Object.getPrototypeOf(value)!==Array.prototype)fail('batch requires ordinary dense arrays');
  const fields=Object.getOwnPropertyDescriptors(value),length=fields.length;
  if(!length||!Object.hasOwn(length,'value')||!Number.isSafeInteger(length.value)||length.value<0||length.value>bound||Reflect.ownKeys(fields).length!==length.value+1)fail('batch array bound or fields differ');
  const result=[];for(let at=0;at<length.value;at++){const field=fields[at];if(!field||!Object.hasOwn(field,'value')||!field.enumerable)fail('batch array data differs');result.push(field.value);}return result;
 };
 const requests=array(calls,4096).map(value=>{const pair=array(value,2);if(pair.length!==2||typeof pair[0]!=='string'||pair[0].length>128)fail('batch call pair differs');return [pair[0],array(pair[1],64)];});
 const context=issued.get(program[0]).context,results=[];
 for(const [name,args]of requests){
  requireOwnedCoreSourceCurrent(context);let failed=false;
  try{results.push(evaluateOwnedCorePrepared(program,name,args,state));}
  catch(error){failed=true;throw error;}
  finally{try{requireOwnedCoreSourceCurrent(context);}catch(error){if(!failed)throw error;}}
 }
 return results;
}

import {ownedBooleanBitwiseOperation,ownedBooleanBitwiseOperator,ownedBooleanBitwiseRustCall} from './owned-boolean-bitwise-source.mjs';

import {primitiveBitwiseType,primitiveBitwiseCompatible,primitiveBitwiseRustTypes,primitiveBitwiseTypeScriptTypes} from '../primitive-bitwise-types.mjs';
