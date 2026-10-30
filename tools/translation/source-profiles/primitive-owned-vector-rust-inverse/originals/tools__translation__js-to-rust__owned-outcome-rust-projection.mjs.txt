// Extensible normal-form substitutions produce proposals, never checked IR.
// The consumer must independently reproduce the COMPLETE original Rust syntax.
import {posix} from 'node:path';
import {OWNED_OUTCOME_CONTRACTS} from '../owned-outcome-contracts.mjs';
import {INTEGER_CONTRACTS} from '../integer-contracts.mjs';
import {ownedRustIntegerOptionalType,ownedIntegerOptionalWitness} from './owned-integer-optional-types.mjs';
import {TEXT_CONTRACTS} from '../text-contracts.mjs';
import {PRIMITIVE_OPTION_CONTRACTS} from '../primitive-option-contracts.mjs';
import {PRIMITIVE_OPTION_CALLBACK_CONTRACTS} from '../primitive-option-callback-contracts.mjs';
import {PRIMITIVE_RESULT_CONTRACTS} from '../primitive-result-contracts.mjs';
import {OWNED_RESULT_CONTRACTS} from '../owned-result-contracts.mjs';
import {HTTP_PROTOCOL_CONTRACTS} from '../http-protocol-contracts.mjs';
import {SSE_CONTRACTS} from '../sse-contracts.mjs';
import {JSON_STATE_CONTRACTS} from '../json-state-contracts.mjs';
import {JSON_FIELD_CONTRACTS} from '../json-field-contracts.mjs';
import {JSON_ITERATION_CONTRACTS} from '../json-iteration-contracts.mjs';
import {UnsupportedOwnedRustSource} from './owned-outcome-rust-syntax.mjs';
import {ownershipCompiler} from './vendor/module-syntax.mjs';

const fail=message=>{throw new UnsupportedOwnedRustSource(message);};
const snake=name=>name.replace(/[A-Z]/gu,character=>'_'+character.toLowerCase());
const ordinary=name=>typeof name==='string'&&/^[a-z][A-Za-z0-9_]*$/u.test(name)&&!name.startsWith('__ro');
const families=[
 ...SSE_CONTRACTS.map(row=>({path:row.rustPath,name:row.javascriptName,runtime:'sse',roles:row.parameters})),
 ...HTTP_PROTOCOL_CONTRACTS.map(row=>({path:row.rustPath,name:row.javascriptName,runtime:'http-protocol',roles:row.parameters})),
 ...OWNED_RESULT_CONTRACTS.map(row=>({path:row.rustPath,name:row.javascriptName,runtime:'owned-result',roles:row.parameters})),
 ...PRIMITIVE_RESULT_CONTRACTS.map(row=>({path:row.rustPath,name:row.javascriptName,runtime:'primitive-result',roles:row.parameters})),
 ...PRIMITIVE_OPTION_CALLBACK_CONTRACTS.map(row=>({path:row.rustPath,name:row.javascriptName,runtime:'primitive-option-callback',roles:row.parameters})),
 ...PRIMITIVE_OPTION_CONTRACTS.map(row=>({path:row.rustPath,name:row.javascriptName,runtime:'primitive-option',roles:row.parameters})),
 ...TEXT_CONTRACTS.map(row=>({path:row.rustPath,name:row.javascriptName,runtime:'text',roles:row.parameters})),
 ...INTEGER_CONTRACTS.map(row=>({path:row.rustPath,name:row.javascriptName,runtime:'integer',roles:row.parameters})),
 ...OWNED_OUTCOME_CONTRACTS.map(row=>({path:row.rustPath,name:row.javascriptName,runtime:'owned-outcome',roles:row.parameters})),
 ...JSON_FIELD_CONTRACTS.map(row=>({path:row.rustPath,name:row.javascriptName,runtime:'json-fields',roles:row.parameters})),
 ...JSON_STATE_CONTRACTS.map(row=>({path:'crate::translation_state_core::'+row.rustName,name:row.javascriptName,runtime:'json-state',roles:row.parameters})),
 ...JSON_ITERATION_CONTRACTS.map(row=>({path:'crate::translation_collections_core::'+row.rustName,name:row.javascriptName,runtime:'json-iteration',roles:row.parameters})),
 {path:'crate::translation_core::json_map',name:'router_core_json_map',runtime:'json-collections',roles:['shared-json-list','callback']},
 {path:'crate::translation_core::json_filter_map',name:'router_core_json_filter_map',runtime:'json-collections',roles:['shared-json-list','callback']},
];
const readers={is_null:'serde_json_value_is_null',as_str:'serde_json_value_as_str',as_bool:'serde_json_value_as_bool',as_u64:'serde_json_value_as_u64',as_i64:'serde_json_value_as_i64',pointer:'serde_json_value_pointer',get:'serde_json_value_get_string'};
const updates={json_index_str:'router_core_json_index_str',json_map_index:'router_core_json_map_index'};
function unwrap(node){let steps=0;while(node?.kind==='temporary'){if(++steps>160)fail('original owned temporary-chain bound exceeded');node=node.value;}return node;}
function adapter(node,role){
 for(let steps=0;steps<=160;steps++){
  node=unwrap(node);
  if(node?.kind==='borrow'){node=node.value;continue;}
  if(node?.kind==='method'&&['clone','to_owned'].includes(node.name)&&node.args.length===0){node=node.value;continue;}
  if(node?.kind==='call'&&node.args.length===1&&(role==='owned-json'&&node.path==='__ro_copy'||role==='owned-json-list'&&node.path==='crate::translation_state_core::json_values_copy')){node=node.args[0];continue;}
  return node;
 }fail('original owned operand-adapter depth exceeded');
}
/** Actual paired native syntax supplies identifier spelling proposals only. */
export function ownedRustNameProposals(source,path){
 if(source===null||source===undefined)return [];
 if(typeof source!=='string'||source.length>2097152)fail('bounded complete paired JavaScript required');
 const ts=ownershipCompiler(),file=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);if(file.parseDiagnostics.length)fail('paired name proposal syntax differs');
 const result=[];let cells=0;
 for(const declaration of file.statements){
  if(!ts.isFunctionDeclaration(declaration)||!declaration.name||!ordinary(declaration.name.text))continue;
  const names=new Map(),ambiguous=new Set();
  const record=node=>{if(!ts.isIdentifier(node)||!ordinary(node.text))return;const rust=snake(node.text),prior=names.get(rust);if(prior&&prior!==node.text)ambiguous.add(rust);else names.set(rust,node.text);};
  const visit=(node,depth=0)=>{if(++cells>100000||depth>160)fail('original owned paired-name node/depth bound exceeded');if(ts.isParameter(node)||ts.isVariableDeclaration(node))record(node.name);ts.forEachChild(node,child=>visit(child,depth+1));};visit(declaration);
  result.push({rust:snake(declaration.name.text),javascript:declaration.name.text,names:[...names].filter(([name])=>!ambiguous.has(name)),span:[declaration.getStart(file),declaration.end],sourceAuthority:false,semanticAuthority:false});
 }
 return result;
}
/** Catalog rows and AST observations cannot grant native binding authority. */
export function projectOwnedRustFunctions(functions,{javascriptPath,runtimeRoot,nameProposals=[],primitiveOperators=false,resultTypeLibrary='primitive-result'}={}){
 if(!['primitive-result','owned-result'].includes(resultTypeLibrary))fail('unknown Result type proposal library');const resultTypePrefix=resultTypeLibrary==='owned-result'?'router_owned_result_':'router_result_';
 const sequenceTypes=primitiveOperators&&ownedRustPrimitiveSequencePresence(functions);
 const imports=new Map(),localNames=new Map(functions.map(fn=>[fn.name,nameProposals.find(proposal=>proposal.rust===fn.name)?.javascript??fn.name]));let cells=0;
 const tick=depth=>{if(++cells>100000||depth>160)fail('original owned projection node/depth budget exceeded');};
 const relative=name=>{const value=posix.relative(posix.dirname(javascriptPath),runtimeRoot+'/'+name+'-runtime.mjs');return value.startsWith('.')?value:'./'+value;};
 function imported(name,family){const key=family+':'+name;if(!imports.has(key))imports.set(key,{name,family,local:'original_'+name});return imports.get(key).local;}
 function type(text){const sequenceWitness=sequenceTypes?ownedRustPrimitiveSequenceOptionalWitness(text):null;if(sequenceWitness)return 'ReturnType<typeof '+imported(sequenceWitness,'primitive-sequence')+'>';if(text===OWNED_BASE64_RESULT_RUST_TYPE)return 'import('+JSON.stringify(relative('base64'))+').Base64Result';
  const scalar=primitiveOperators&&text.startsWith('::core::primitive::')?ownedRustPrimitiveType(text):null;if(scalar)return 'import('+JSON.stringify(relative('primitive-operator'))+').'+scalar.alias;
  text=text.replaceAll("&'a",'&');
  const integerOption=primitiveOperators?ownedRustIntegerOptionalType(text):null;if(integerOption)return 'ReturnType<typeof '+imported(ownedIntegerOptionalWitness(integerOption),'integer')+'>';
  const scalarSlice=/^&\[(?:(::core::primitive::)([ui](?:8|16|32|64|128))|(u64|i64|bool))\]$/u.exec(text);if(scalarSlice){if(scalarSlice[1]&&!primitiveOperators)fail('wide primitive slice needs the actual qualified primitive runtime');return 'readonly ('+type(scalarSlice[1]?scalarSlice[1]+scalarSlice[2]:scalarSlice[3])+')[]';}
  if(text==='&crate::translation_core::Json')return 'import('+JSON.stringify(relative('json-macro'))+').JsonValue';
  if(text==='&[crate::translation_core::Json]')return 'Parameters<typeof '+imported('router_state_json_values_copy','json-state')+'>[0]';
  if(text==='&::serde_json::Map<::std::string::String,crate::translation_core::Json>')return 'Parameters<typeof '+imported('router_core_json_map_index','json-update')+'>[0]';
  if(text==='::std::string::String')return 'Parameters<typeof '+imported('router_owned_result_text_ok','owned-result')+'>[0]';
  if(text==='i64')return 'Parameters<typeof '+imported('json_macro_i64','json-macro')+'>[0]';
  if(text==='::std::result::Result<crate::translation_core::Json,::std::string::String>')return 'ReturnType<typeof '+imported('router_carrier_json_ok','owned-outcome')+'>';
  if(text==='::std::option::Option<crate::translation_core::Json>')return 'ReturnType<typeof '+imported('router_carrier_json_some','owned-outcome')+'>';
  const primitiveOptionInputs={'::std::option::Option<bool>':'bool','::std::option::Option<u64>':'u64','::std::option::Option<i64>':'i64','::std::option::Option<&str>':'str'};if(Object.hasOwn(primitiveOptionInputs,text))return 'ReturnType<typeof '+imported('router_option_'+primitiveOptionInputs[text]+'_none','primitive-option')+'>';
  if(text==='::std::result::Result<::std::string::String,::std::string::String>')return 'ReturnType<typeof '+imported('router_owned_result_text_ok','owned-result')+'>';const resultInputs={'::std::result::Result<bool,::std::string::String>':'bool','::std::result::Result<u64,::std::string::String>':'u64','::std::result::Result<i64,::std::string::String>':'i64','::std::result::Result<&str,::std::string::String>':'str'};if(Object.hasOwn(resultInputs,text))return 'ReturnType<typeof '+imported(resultTypePrefix+resultInputs[text]+'_ok',resultTypeLibrary)+'>';if(text==='::std::option::Option<::std::string::String>')return 'ReturnType<typeof '+imported(resultTypePrefix+'bool_err_option',resultTypeLibrary)+'>';
  if(text==='&str')return 'string';if(text==='bool')return 'boolean';
  if(text==='u64')return 'Parameters<typeof '+imported('router_state_json_with_index','json-state')+'>[1]';
  if(text==='usize')return 'Parameters<typeof '+imported('router_core_json_index_usize','json-update')+'>[1]';
  fail('public Rust input needs a matching canonical owned ABI rule: '+text);
 }
 function returnType(text){if(sequenceTypes&&ownedRustPrimitiveSequenceOptionalWitness(text))return type(text);if(text===OWNED_BASE64_RESULT_RUST_TYPE)return 'import('+JSON.stringify(relative('base64'))+').Base64Result';
  const scalar=primitiveOperators&&text.startsWith('::core::primitive::')?ownedRustPrimitiveType(text):null;if(scalar)return 'import('+JSON.stringify(relative('primitive-operator'))+').'+scalar.alias;
  const integerOption=primitiveOperators?ownedRustIntegerOptionalType(text):null;if(integerOption)return type(text);
  const values={
   'crate::translation_core::Json':['router_core_json_find','json-iteration'],
   '&crate::translation_core::Json':['serde_json_value_get_string','json'],
   '&str':['serde_json_value_as_str','json'],bool:['serde_json_value_as_bool','json'],u64:['serde_json_value_as_u64','json'],i64:['serde_json_value_as_i64','json'],
  };
  const normalized=text.replaceAll("&'a",'&').replaceAll("&'static",'&');if(normalized.startsWith('::std::result::Result<')&&!normalized.includes('crate::translation_core::Json'))return type(normalized);if(normalized==='::std::option::Option<::std::string::String>')return type(normalized);if(normalized==='::std::result::Result<crate::translation_core::Json,::std::string::String>')return 'ReturnType<typeof '+imported('router_carrier_json_ok','owned-outcome')+'>';if(normalized==='i64')return 'Parameters<typeof '+imported('json_macro_i64','json-macro')+'>[0]';const match=/^::std::option::Option<(.+)>$/u.exec(normalized);if(!match)return null;
  const row=values[match[1]];if(!row)fail('optional Rust return needs its original registered domain');return 'ReturnType<typeof '+imported(...row)+'>';
 }
 function expression(node,names,depth=0,lowering=false){
  tick(depth);if(!node)fail('complete owned Rust expression required');
  const next=(value,lower=false)=>expression(value,names,depth+1,lower);
  const args=(values,roles=[])=>values.map((value,index)=>next(adapter(value,roles[index]))).join(', ');
  const call=(name,family,values,roles)=>imported(name,family)+'('+args(values,roles)+')';
  const primitive=projectOwnedRustPrimitiveObservation(node,{enabled:primitiveOperators,imported,expression:next});if(primitive!==null)return primitive;
  switch(node.kind){
   case 'temporary':return next(node.value,lowering);
   case 'borrow':return next(node.value,lowering);
   case 'name':{
    if(node.name==='None')return "({$:'None'})";
    if(node.name==='::serde_json::Value::Null')return call('json_macro_null','json-macro',[]);
    if(!ordinary(node.name))fail('unbound Rust path in owned inverse: '+node.name);return names.get(node.name)??node.name;
   }
   case 'string':return JSON.stringify(node.value);
   case 'boolean':return String(node.value);
   case 'integer':return node.value+'n';
   case 'not':return '(!'+next(node.value)+')';
   case 'binary':return '('+next(node.left)+' '+({'==':'===','!=':'!=='}[node.op]??node.op)+' '+next(node.right)+')';
   case 'field':fail('Rust fields require an explicit original owned carrier rule');break;
   case 'method':{
    if(['clone','to_owned'].includes(node.name)&&node.args.length===0)return next(node.value,lowering);
    if(['is_ok','is_err'].includes(node.name)&&node.args.length===0)return '('+next(node.value)+'.$ === '+JSON.stringify(node.name==='is_ok'?'Ok':'Err')+')';
    if(['is_some','is_none'].includes(node.name)&&node.args.length===0)return '('+next(node.value)+'.$ === '+JSON.stringify(node.name==='is_some'?'Some':'None')+')';
    if(node.name==='expect'&&node.args.length===1&&unwrap(node.args[0])?.kind==='string'&&unwrap(node.args[0]).value==='owned reverse i64 bound'){
     const value=unwrap(node.value);if(value?.kind==='call'&&value.path==='i64::try_from'&&value.args.length===1)return next(value.args[0]);
    }
    fail('Rust method needs an original owned equation: '+node.name);break;
   }
   case 'block':if(node.statements.length||!node.tail)fail('noncanonical Rust lowering block');return next(node.tail,true);
   case 'choose':return '('+next(node.condition)+' ? '+next(node.yes)+' : '+next(node.no)+')';
   case 'lambda':return '('+node.parameters.map(name=>names.get(name)??name).join(', ')+') => '+block(node.body,names,depth+1);
   case 'json-array':return imported('json_macro_array','json-macro')+'(['+node.elements.map(value=>next(value)).join(', ')+'])';
   case 'json-object':return imported('json_macro_object','json-macro')+'(['+node.entries.map(row=>'['+JSON.stringify(row.key)+', '+next(row.value)+']').join(', ')+'])';
   case 'match':{
    const [yes,no]=node.arms;
    if(node.arms.length===2&&['Ok(value)','Err(value)'].includes(yes.pattern)&&unwrap(yes.value)?.kind==='name'&&unwrap(yes.value).name==='value'&&no.pattern===(yes.pattern==='Ok(value)'?'Err(_)':'Ok(_)'))return next(node.value)+'.field0';
    if(node.arms.length===2&&yes.pattern==='Some(value)'&&unwrap(yes.value)?.kind==='name'&&unwrap(yes.value).name==='value'&&no.pattern==='None')return next(node.value)+'.field0';
    const converted=unwrap(node.value),indexed=unwrap(yes?.value);
    if(node.arms.length===2&&converted?.kind==='call'&&converted.path==='usize::try_from'&&converted.args.length===1&&yes.pattern==='Ok(index)'&&no.pattern==='Err(_)'&&indexed?.kind==='call'&&indexed.args.length===2&&unwrap(indexed.args[1])?.kind==='name'&&unwrap(indexed.args[1]).name==='index'){
     if(indexed.path==='::serde_json::Value::get')return call('serde_json_value_get_usize','json',[indexed.args[0],converted.args[0]]);
     if(indexed.path==='crate::translation_core::json_index_usize')return call('router_core_json_index_usize','json-update',[indexed.args[0],converted.args[0]]);
    }
    fail('Rust match requires a canonical guarded carrier rule');break;
   }
   case 'call':{
    const sequence=primitiveOperators?ownedRustPrimitiveSequenceCall(node):null;if(sequence)return call(sequence.javascriptName,'primitive-sequence',node.args,sequence.parameters);
    if(localNames.has(node.path))return localNames.get(node.path)+'('+args(node.args)+')';
    const row=families.find(row=>row.path===node.path);
    if(row){if(node.args.length!==row.roles.length)fail('catalog operand count differs');return call(row.name,row.runtime,node.args,row.roles);}
    if(['Ok','Err'].includes(node.path)&&node.args.length===1)return "({$:"+JSON.stringify(node.path)+',field0:'+next(adapter(node.args[0],node.path==='Ok'?'owned-json':null))+'})';
    if(node.path==='Some'&&node.args.length===1)return "({$:'Some',field0:"+next(adapter(node.args[0],'owned-json'))+'})';
    if(node.path==='__ro_copy'&&node.args.length===1){
     if(lowering)return call('router_core_json_copy','json-update',node.args);
     return next(adapter(node.args[0],'shared-json'));
    }
    if(node.path==='__ro_with_field'&&node.args.length===3)return call('router_core_json_with_field','json-update',node.args);
    const prefix='crate::translation_core::';if(node.path.startsWith(prefix)&&updates[node.path.slice(prefix.length)])return call(updates[node.path.slice(prefix.length)],'json-update',node.args);
    const serde='::serde_json::Value::',method=node.path.startsWith(serde)?node.path.slice(serde.length):null;
    if(method&&readers[method])return call(readers[method],'json',node.args);
    if(method==='Bool'&&node.args.length===1)return call('json_macro_bool','json-macro',node.args);
    if(method==='String'&&node.args.length===1)return call('json_macro_string','json-macro',node.args);
    if(method==='from'&&node.args.length===1){const value=unwrap(node.args[0]),signed=value?.kind==='method'&&value.name==='expect';return call(signed?'json_macro_i64':'json_macro_u64','json-macro',node.args);}
    fail('Rust call requires an original owned substitution: '+node.path);break;
   }
   default:fail('unknown complete owned Rust observation');
  }
 }
 function block(body,names,depth=0){
  tick(depth);if(body.tail)fail('function/callback tail differs from canonical checked return');
  return '{\n'+body.statements.map(statement=>{
   tick(depth+1);
   if(statement.kind==='let')return (statement.mutable?'let ':'const ')+(names.get(statement.name)??statement.name)+' = '+expression(statement.value,names,depth+1)+';';
   if(statement.kind==='assign')return (names.get(statement.name)??statement.name)+' = '+expression(statement.value,names,depth+1)+';';
   if(statement.kind==='return')return 'return '+expression(statement.value,names,depth+1)+';';
   if(statement.kind==='break'||statement.kind==='continue')return statement.kind+';';
   if(statement.kind==='while')return 'while ('+expression(statement.condition,names,depth+1)+') '+block(statement.body,names,depth+1);
   if(statement.kind==='for-range'){const name=names.get(statement.name)??statement.name;return (statement.reverse?'for (let '+name+' = '+expression(statement.end,names,depth+1)+'; '+name+' >= '+expression(statement.start,names,depth+1)+'; '+name+' -= 1n) ':'for (let '+name+' = '+expression(statement.start,names,depth+1)+'; '+name+' < '+expression(statement.end,names,depth+1)+'; '+name+' += 1n) ')+block(statement.body,names,depth+1);}
   if(statement.kind==='for-scalar')return 'for (const '+(names.get(statement.name)??statement.name)+' of '+expression(unwrap(statement.value),names,depth+1)+') '+block(statement.body,names,depth+1);
   if(statement.kind==='for-json'){const value=unwrap(statement.value);if(value?.kind!=='call'||value.path!=='crate::translation_state_core::json_values_copy'||value.args.length!==1)fail('canonical copied JSON iterator source required');return 'for (const '+(names.get(statement.name)??statement.name)+' of '+expression(adapter(value.args[0],'shared-json-list'),names,depth+1)+') '+block(statement.body,names,depth+1);}
   if(statement.kind==='if')return 'if ('+expression(statement.condition,names,depth+1)+') '+block(statement.yes,names,depth+1)+' else '+block(statement.no,names,depth+1);
   fail('unknown original Rust statement');
  }).join('\n')+'\n}';
 }
 if(!Array.isArray(functions)||!functions.length||functions.length>4096)fail('bounded nonempty complete function set required');
 const bodies=functions.map(fn=>{
  const candidates=nameProposals.filter(row=>row.rust===fn.name),proposal=candidates.length===1?candidates[0]:null,names=new Map(proposal?.names??[]),name=proposal?.javascript??fn.name;
  if(!ordinary(name)||snake(name)!==fn.name)fail('function name proposal must reproduce its original Rust binding');
  for(const [rust,javascript]of names)if(!ordinary(javascript)||snake(javascript)!==rust)fail('paired spelling proposal differs');
  const docs=fn.parameters.map(parameter=>' * @param {'+type(parameter.type)+'} '+(names.get(parameter.name)??parameter.name)),returns=returnType(fn.returns);if(returns)docs.push(' * @returns {'+returns+'}');
  const inputPrelude=fn.parameters.flatMap(parameter=>{const match=/^&\[(::core::primitive::)([ui](?:8|16|32|64|128))\]$/u.exec(parameter.type.replaceAll("&'a",'&'));if(!match||['u64','i64'].includes(match[2]))return [];const local=names.get(parameter.name)??parameter.name;return [local+' = '+imported('primitiveSliceInput','primitive-operator')+'('+local+', '+JSON.stringify(match[2])+');'];}),projected=block(fn.body,names),completeBody=inputPrelude.length?'{\n'+inputPrelude.join('\n')+projected.slice(1):projected;
  return (docs.length?'/**\n'+docs.join('\n')+'\n */\n':'')+(fn.exported?'export ':'')+'function '+name+'('+fn.parameters.map(parameter=>names.get(parameter.name)??parameter.name).join(', ')+') '+completeBody;
 });
 const prelude=[...imports.values()].map(row=>'import { '+row.name+' as '+row.local+' } from '+JSON.stringify(relative(row.family))+';').join('\n');
 const javascript=prelude+'\n\n'+bodies.join('\n\n')+'\n';if(javascript.length>2097152)fail('whole JavaScript proposal exceeds original source bound');
 return {javascript,imports:[...imports.values()],nameProposals,sourceAuthority:false,semanticAuthority:false};
}

import {ownedRustPrimitiveType,projectOwnedRustPrimitiveObservation} from './owned-rust-primitive-projection.mjs';

import {OWNED_BASE64_RESULT_RUST_TYPE} from './owned-base64-inputs.mjs';

import {ownedRustPrimitiveSequenceCall,ownedRustPrimitiveSequencePresence,ownedRustPrimitiveSequenceOptionalWitness} from './owned-rust-primitive-sequence-projection.mjs';
