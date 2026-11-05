// Closed temporary wrapper declaration DATA only. These declarations never
// certify original source bindings, types, captures, ownership or executable code.
import {primitiveBitwiseType} from './primitive-bitwise-types.mjs';
const ident=name=>typeof name==='string'&&name.length<=4096&&/^[\p{ID_Start}_][\p{ID_Continue}_]*$/u.test(name);
export function callbackSourceParameterDeclarations(scope){
 if(!(scope instanceof Map)||scope.size>64)return null;const parameters=[];let retained=0;
 const scalarTypes=new Map([['str','&str'],['text-owned','String'],['text','String'],['bool','bool']]),scalar=domain=>primitiveBitwiseType(domain)?domain:scalarTypes.get(domain);
 for(const [name,role]of scope){
  if(!ident(name))return null;const payload=scalar(role?.domain);let type=null;
  if(role?.kind==='payload')type=payload;
  else if(role?.kind==='option'&&role.domain!=='text'&&payload)type='Option<'+payload+'>';
  else if(role?.kind==='result'&&payload)type='Result<'+payload+',String>';
  else if(role?.kind==='json'&&role.domain==='json')type='&crate::translation_core::Json';
  if(type){const parameter=name+':'+type;if((retained+=parameter.length+1)>65536)return null;parameters.push(parameter);}
 }return parameters;
}
