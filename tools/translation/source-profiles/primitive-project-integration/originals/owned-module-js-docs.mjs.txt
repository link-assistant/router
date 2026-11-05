// ABI text proposals from already checked item domains. Actual receiving
// imports, bodies, loans and complete Rust output must still check afresh.
import {posix} from 'node:path';
const fail=message=>{throw new TypeError('Owned module JS signature: '+message);};
export function ownedModuleJavaScriptDocs(item,{ts,node,path,runtimeRoot,runtimePaths,runtimeMap,edge}={}){
 const relative=target=>{const text=posix.relative(posix.dirname(path),target);return text.startsWith('.')?text:'./'+text;};
 function target(family){const original=runtimeRoot+'/'+family+'-runtime.mjs',selected=runtimeMap?.get(original)??original;if(!runtimePaths.has(original)||!runtimePaths.has(selected))fail('complete actual captured signature runtime source required');return selected;}
 function operation(name,family,index=null){const local=edge({kind:'runtime',path:target(family),name,typeOnly:false});return index===null?'ReturnType<typeof '+local+'>':'Parameters<typeof '+local+'>['+index+']';}
 function type(domain){
  const json=()=> 'import('+JSON.stringify(relative(target('json-macro')))+').JsonValue';
  if(['json','json-ref'].includes(domain))return json();if(['json-list-ref','json-list-owned'].includes(domain))return 'readonly '+json()+'[]';if(['str','text-owned'].includes(domain))return 'string';if(domain==='bool')return 'boolean';if(domain==='bytes-ref')return 'readonly bigint[]';
  const parameters={'i64':['json_macro_i64','json-macro',0],u64:['json_macro_u64','json-macro',0],usize:['router_core_json_index_usize','json-update',1],'map-ref':['router_core_json_map_index','json-update',0],'base64-error-ref':['base64ErrorText','base64',0],'json-option-input':['router_core_json_option_as_str','json-option',0],'json-text-result':['router_carrier_json_result_copy','owned-outcome',0],'json-owned-option':['router_carrier_json_option_or','owned-outcome',0]};if(parameters[domain])return operation(...parameters[domain]);
  const returns={'base64-result':['router_core_base64_standard_decode_text','base64'],'json-option-ref':['serde_json_value_get_string','json'],'str-option-ref':['serde_json_value_as_str','json'],'bool-option':['serde_json_value_as_bool','json'],'u64-option':['serde_json_value_as_u64','json'],'i64-option':['serde_json_value_as_i64','json']};if(returns[domain])return operation(...returns[domain]);fail('actual item needs a registered written ABI rule: '+domain);
 }
 if(node.parameters.length!==item.params.length)fail('actual native/checked parameter census differs');const docs=[];for(let at=0;at<node.parameters.length;at++){const parameter=node.parameters[at],checked=item.params[at];if(!ts.isIdentifier(parameter.name)||parameter.name.text!==checked.name)fail('actual checked parameter identity differs');if(!ts.getJSDocType(parameter))docs.push(' * @param {'+type(checked.type)+'} '+checked.name);}
 if(!ts.getJSDocReturnType(node))docs.push(' * @returns {'+type(item.returns)+'}');return docs.length?'/**\n'+docs.join('\n')+'\n */\n':'';
}
