// Explicit three-valued compilation conditions. No host, OS or Cargo feature
// is inferred. Validated false predicates prove absence; exact builtin lint
// alternatives retain their predicate without changing source declarations.
import {tokenizeRust} from './extensions/lexical.mjs';
import {inspectConditionalAttribute,CONDITIONAL_ATTRIBUTE_PROFILE} from './conditional-attributes.mjs';
const absentAttributes=new WeakSet();
export const isAbsentConditionalAttribute=attribute=>!!attribute&&absentAttributes.has(attribute);
const inertAttributes=new WeakSet();
export const isInertConditionalAttribute=attribute=>!!attribute&&(absentAttributes.has(attribute)||inertAttributes.has(attribute));
const freeze=value=>{if(value&&typeof value==='object'){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;};
const identifier=/^[\p{L}_][\p{L}\p{N}_]*$/u;
function record(value){if(!value||typeof value!=='object'||Array.isArray(value)||Object.getOwnPropertySymbols(value).length)throw new TypeError('configuration entries must be plain records');const result=Object.create(null);for(const [name,property] of Object.entries(Object.getOwnPropertyDescriptors(value))){if(!('value' in property)||!identifier.test(name))throw new TypeError('configuration entries need identifier keys and data properties');result[name]=property.value;}return result;}
export function compilationProfile(input){
  if(input==null)return null;const source=record(input);if(Object.keys(source).some(key=>!['schemaVersion','flags','values','closedKeys'].includes(key)))throw new TypeError('unknown compilation profile field');
  if(source.schemaVersion!==undefined&&source.schemaVersion!==1)throw new TypeError('unsupported compilation profile schema');
  const flags=record(source.flags??{}),values=record(source.values??{}),closedKeys=source.closedKeys??[];
  for(const value of Object.values(flags))if(typeof value!=='boolean')throw new TypeError('configuration flags must be explicit booleans');
  for(const [key,entries] of Object.entries(values)){if(!Array.isArray(entries)||entries.some(value=>typeof value!=='string'))throw new TypeError('configuration values must be string arrays');values[key]=[...new Set(entries)].sort();}
  if(!Array.isArray(closedKeys)||closedKeys.some(key=>!identifier.test(key)))throw new TypeError('closed configuration keys must be identifier strings');
  return freeze({schemaVersion:1,flags,values,closedKeys:[...new Set(closedKeys)].sort()});
}
export const PRODUCTION_PROFILE=compilationProfile({flags:{test:false}});
const text=token=>token?.text??token?.raw??token?.value;
const range=tokens=>({start:tokens[0]?.start??0,end:tokens.at(-1)?.end??0});
export function evaluateConfiguration(tokens,profile){
  const known=compilationProfile(profile);let at=0;
  function predicate(depth){
    if(depth>128)throw new Error('configuration nesting exceeds bounded grammar');const token=tokens[at++],name=text(token);if(!identifier.test(name??''))throw new Error('configuration predicate needs an identifier');
    if(text(tokens[at])==='('){if(!['all','any','not'].includes(name))throw new Error('unknown configuration predicate operation');at++;const children=[];let trailingComma=false;while(text(tokens[at])!==')'){children.push(predicate(depth+1));if(text(tokens[at])!==',')break;at++;trailingComma=text(tokens[at])===')';}if(text(tokens[at++])!==')'||name==='not'&&(children.length!==1||trailingComma))throw new Error('configuration predicate arity or delimiter mismatch');
      if(name==='not')return children[0]===null?null:!children[0];if(name==='all')return children.includes(false)?false:children.includes(null)?null:true;return children.includes(true)?true:children.includes(null)?null:false;
    }
    if(text(tokens[at])==='='){at++;const literal=text(tokens[at++]),decoded=tokenizeRust(literal??'').filter(token=>token.kind!=='eof');if(decoded.length!==1||decoded[0].kind!=='string')throw new Error('configuration value needs a Rust string literal');const value=decoded[0].value;if(known?.values[name]?.includes(value))return true;return known?.closedKeys.includes(name)?false:null;}
    // Boolean cfg literals are outside this pinned Rust 1.89 profile.
    if(['true','false'].includes(name))throw new Error('boolean cfg literals require a separately checked Rust feature profile');
    return known&&Object.hasOwn(known.flags,name)?known.flags[name]:null;
  }
  try{const value=predicate(0);if(at!==tokens.length)throw new Error('unconsumed configuration tokens');return freeze({value,span:range(tokens),diagnostics:[]});}
  catch(error){return freeze({value:null,span:range(tokens),diagnostics:[{kind:'unsupported',message:error.message,span:range(tokens)}]});}
}
export function itemConfiguration(tokens,profile){
  const attributes=[];let at=0;
  while(text(tokens[at])==='#'){
    const begin=at++;if(text(tokens[at])==='!')at++;if(text(tokens[at++])!=='[')return freeze({status:'unknown',attributes,diagnostics:[{message:'unresolved configuration attribute',span:range(tokens)}]});
    const body=at;let depth=1;for(;at<tokens.length;at++){if(text(tokens[at])==='[')depth++;if(text(tokens[at])===']')depth--;if(!depth)break;}
    if(depth)return freeze({status:'unknown',attributes,diagnostics:[{message:'unterminated configuration attribute',span:range(tokens)}]});const end=at++,name=text(tokens[body]);let evaluation=null;
    if(name==='cfg')evaluation=text(tokens[body+1])==='('&&text(tokens[end-1])===')'?evaluateConfiguration(tokens.slice(body+2,end-1),profile):{value:null,diagnostics:[{message:'cfg requires a parenthesized predicate',span:range(tokens.slice(begin,at))}]};
    if(name==='cfg_attr'){
      try{
        const input=inspectConditionalAttribute(tokens.slice(body,end)),predicate=evaluateConfiguration(input.predicate,profile);
        const inert=predicate.diagnostics.length===0&&input.inertBuiltinLint;
        const expansion=predicate.value===false?'absent':inert?'inert-lint-alternatives':'unresolved';
        evaluation={value:expansion==='unresolved'?null:true,predicate,expansion,inputs:input.attributes,profile:CONDITIONAL_ATTRIBUTE_PROFILE,configurationSelected:predicate.value!==null,diagnostics:expansion==='unresolved'?[...predicate.diagnostics,{message:'active or unknown cfg_attr expansion requires checked attribute transformation',span:range(tokens.slice(begin,at))}]:[]};
      }catch(error){evaluation={value:null,diagnostics:[{message:error.message,span:range(tokens.slice(begin,at))}]};}
    }
    const attribute={name,span:range(tokens.slice(begin,at)),tokens:tokens.slice(begin,at).map(text),evaluation};
    if(name==='cfg_attr'&&evaluation.expansion==='absent')absentAttributes.add(attribute);
    if(name==='cfg_attr'&&evaluation.expansion==='inert-lint-alternatives')inertAttributes.add(attribute);
    attributes.push(attribute);
  }
  const conditions=attributes.filter(attribute=>attribute.evaluation),status=conditions.some(attribute=>attribute.evaluation.value===false)?'inactive':conditions.some(attribute=>attribute.evaluation.value===null)?'unknown':'active';
  return freeze({status,attributes,diagnostics:conditions.flatMap(attribute=>attribute.evaluation.diagnostics??[])});
}
