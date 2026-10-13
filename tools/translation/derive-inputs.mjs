import {itemConfiguration,isInertConditionalAttribute,isAbsentConditionalAttribute} from './cfg-profile.mjs';
import {boundedSerdeExprPath} from './derive-helper-paths.mjs';
import {boundedSchemarsNumericHelper} from './derive-numeric-helpers.mjs';
import {boundedSchemarsWithType} from './derive-schemars-with.mjs';
import {originalDeriveGenericParameters} from './derive-generic-parameters.mjs';
import {inspectBuiltinDefaultVariant} from './derive-builtin-default.mjs';
import {isPlainSourceIdentifier} from './module-paths.mjs';

export const STANDARD_LAYOUT_DERIVES=new Set(['Clone','Copy','Debug','Default','PartialEq','Eq','Hash','PartialOrd','Ord']);
const identifier=token=>token?.type==='ident'&&/^[\p{L}_][\p{L}\p{N}_]*$/u.test(token.text);
const cases=new Set(['lowercase','UPPERCASE','PascalCase','camelCase','snake_case','SCREAMING_SNAKE_CASE','kebab-case','SCREAMING-KEBAB-CASE']);
// Lifetime-only parameters cannot splice item/type/value syntax into the
// pinned anonymous-const derive wrapper. Preserve the exact original tokens;
// type/const parameters, bounds and parameter attributes require other routes.
// https://doc.rust-lang.org/reference/items/generics.html
function originalLifetimeParameters(tokens,begin) {
  const first=tokens[begin],names=[];let at=begin+1;
  while(tokens[at]?.text!=='>') {
    const token=tokens[at++],name=token?.text.slice(1);
    if(token?.type!=='char'||!/^'[A-Za-z_][A-Za-z0-9_]*$/u.test(token.text)||!isPlainSourceIdentifier(name)||names.includes(name))throw new TypeError('Derive lifetime parameters require distinct nonreserved original names');
    names.push(name);
    if(names.length>32)throw new TypeError('Derive lifetime parameters exceed the bounded 32-name profile');
    if(tokens[at]?.text==='>')break;
    if(tokens[at++]?.text!==',')throw new TypeError('Derive lifetime bounds or mixed generics require a separate input profile');
  }
  const last=tokens[at];
  if(!last||!names.length)throw new TypeError('Derive lifetime parameters require a nonempty original group');
  return {end:at+1,evidence:{schema:'original-derive-lifetime-parameters-v1',names,span:{start:first.start,end:last.end},tokens:tokens.slice(begin,at+1).map(token=>({text:token.text,type:token.type,span:{start:token.start,end:token.end}})),genericTypeInstantiation:false,generatedImplBehavior:false}};
}
function endOf(tokens,start) {
  const pairs={'(':')','[':']','{':'}'},stack=[];
  for(let at=start;at<tokens.length;at++) {
    if(tokens[at].type!=='punct')continue;
    if(pairs[tokens[at].text])stack.push(pairs[tokens[at].text]);
    else if([')',']','}'].includes(tokens[at].text)){if(stack.pop()!==tokens[at].text)throw new TypeError('Unbalanced original derive input');if(!stack.length)return at;}
  }
  throw new TypeError('Unterminated original derive input');
}
function paths(tokens) {
  const result=[];let path=[],expectName=true;
  for(const token of tokens) {
    if(expectName){if(!identifier(token))throw new TypeError('Unproved derive path');path.push(token.text);expectName=false;}
    else if(token.text==='::')expectName=true;
    else if(token.text===','){result.push(path);path=[];expectName=true;}
    else throw new TypeError('Unproved derive path separator');
  }
  if(path.length){if(expectName)throw new TypeError('Incomplete derive path');result.push(path);}
  if(!result.length)throw new TypeError('Empty derive capability list');return result;
}
function literal(token) {
  if(token?.type!=='string'||!token.text.startsWith('"'))throw new TypeError('Derive helper requires an actual bounded string literal');
  let value;try{value=JSON.parse(token.text);}catch{throw new TypeError('Unregistered Rust helper literal escape');}
  if(typeof value!=='string'||value.length>4096)throw new TypeError('Unbounded derive helper literal');return value;
}
function helper(body,position,kind) {
  if(body[1]?.text!=='('||body.at(-1)?.text!==')')throw new TypeError('Unregistered derive helper shape');
  const values=body.slice(2,-1),entries=[];let at=0;
  while(at<values.length) {
    const key=values[at++];if(!identifier(key))throw new TypeError('Unregistered derive helper key');
    let value=null,namespaceInput=null;
    if(body[0].text==='schemars'&&['range','length'].includes(key.text)) {
      const parsed=boundedSchemarsNumericHelper(values,at-1,position);at=parsed.end;namespaceInput=parsed.evidence;value=parsed.evidence.bounds;
    } else {
      if(values[at]?.text==='='){at++;value=literal(values[at++]);}
      if(body[0].text==='schemars'&&key.text==='with') {
        if(value===null)throw new TypeError('Schemars with requires an original type string literal');
        namespaceInput=boundedSchemarsWithType(value,position);
      } else if(body[0].text==='serde'&&['skip_serializing_if','with'].includes(key.text)) {
        if(value===null||position!=='field'&&!(position==='variant'&&key.text==='with'))throw new TypeError('Invalid bounded Serde path helper position');
        namespaceInput=boundedSerdeExprPath(value);
      } else if(body[0].text==='serde'&&key.text==='default'&&value!==null) {
        if(position==='variant'||position==='container'&&kind!=='struct')throw new TypeError('Invalid bounded Serde default path position');
        namespaceInput=boundedSerdeExprPath(value);
      } else if(body[0].text==='serde'&&['tag','content'].includes(key.text)) {
        if(value===null||position!=='container'||kind!=='enum')throw new TypeError('Invalid bounded Serde tag metadata position');
        namespaceInput={profile:'bounded-serde-tag-literal-v1',generatedHelperBehavior:false};
      } else if(['rename','rename_all','alias'].includes(key.text)) {
        if(value===null||key.text==='rename_all'&&!cases.has(value)||key.text==='alias'&&position==='container')throw new TypeError('Unregistered derive rename metadata');
      } else if(['default','skip','skip_serializing','skip_deserializing','deny_unknown_fields','untagged'].includes(key.text)) {
        if(value!==null||key.text==='default'&&position==='container'&&kind!=='struct'||key.text.startsWith('skip')&&position==='container'||['deny_unknown_fields','untagged'].includes(key.text)&&position!=='container'||key.text==='untagged'&&kind!=='enum')throw new TypeError('Invalid bounded derive flag position');
      } else throw new TypeError('Derive helper requires a separately checked input profile: '+key.text);
    }
    if(entries.some(entry=>entry.key===key.text)&&key.text!=='alias')throw new TypeError('Duplicate bounded derive helper');
    entries.push({key:key.text,value,...(namespaceInput?{namespaceInput}:{})});
    if(at<values.length&&values[at++].text!==',')throw new TypeError('Unregistered derive helper expression');
  }
  if(!entries.length)throw new TypeError('Empty bounded derive helper');return entries;
}

// Checks actual original tokens; this is not a Rust body or trait expansion.
export function inspectDeriveInput(item,profile) {
  if(!item||!['struct','enum'].includes(item.term)||!Array.isArray(item.tokens))throw new TypeError('Derive footprint requires an original data declaration');
  const condition=itemConfiguration(item.tokens,profile);
  if(condition.status!=='active')throw new TypeError('Derive footprint requires an active original compilation condition');
  const tokens=item.tokens.filter(token=>token.type!=='comment'),attributes=[],derives=[],absentConditionalAttributes=[],inertConditionalAttributes=[];let depth=0,header=true,keyword=-1,lifetimeParameters=null,genericParameters=null;
  for(let at=0;at<tokens.length;at++) {
    const token=tokens[at];
    if(token.type==='punct'&&token.text==='#') {
      if(tokens[at+1]?.text!=='[')throw new TypeError('Unregistered inner attribute in derive input');
      const end=endOf(tokens,at+1),body=tokens.slice(at+2,end),name=body[0]?.text;
      const position=header?'container':item.term==='enum'&&depth===1?'variant':'field';
      const attribute={name,position,span:{start:token.start,end:tokens[end].end},tokens:tokens.slice(at,end+1).map(token=>token.text)};
      if(name==='cfg_attr'){
        const original=itemConfiguration(tokens.slice(at,end+1),profile).attributes[0];
        if(!isInertConditionalAttribute(original))throw new TypeError('Active or unknown conditional derive attribute remains unproved');
        (isAbsentConditionalAttribute(original)?absentConditionalAttributes:inertConditionalAttributes).push({...attribute,original});at=end;continue;
      }
      if(name==='derive') {
        if(!header||body[1]?.text!=='('||body.at(-1)?.text!==')')throw new TypeError('Unregistered nested derive input');
        attribute.derives=paths(body.slice(2,-1));derives.push(...attribute.derives.map(path=>({path,attributeSpan:attribute.span})));
      } else if(['serde','schemars'].includes(name))attribute.helpers=helper(body,position,item.term);
      else if(name==='default') {
        if(position!=='variant'||body.length!==1)throw new TypeError('Builtin default requires a plain enum-variant helper');
      }
      else if(name==='cfg') {
        if(!header||!condition.attributes.some(entry=>entry.span.start===token.start&&entry.evaluation?.value===true))throw new TypeError('Conditional derive field or variant remains unproved');
      } else if(['doc','allow','warn','deny','forbid','must_use','repr','non_exhaustive'].includes(name)) {
        if(name==='doc') {if(body.length!==3||body[1]?.text!=='=')throw new TypeError('Unregistered generated documentation input');literal(body[2]);}
        if(body.some(entry=>entry.text==='!'||entry.text==='#'))throw new TypeError('Attribute expression expansion remains unproved');
      } else throw new TypeError('Unknown procedural or helper attribute remains unproved: '+name);
      attributes.push(attribute);at=end;continue;
    }
    if(header&&token.text===item.term){
      keyword=at;const name=tokens[at+1];let after=at+2;
      if(!identifier(name))throw new TypeError('Generic derive headers remain unproved');
      if(tokens[after]?.text==='<'){
        const original=originalDeriveGenericParameters(tokens,after);
        if(original.evidence.parameters.every(parameter=>parameter.kind==='lifetime'))lifetimeParameters=originalLifetimeParameters(tokens,after).evidence;
        else genericParameters=original.evidence;
        after=original.end;at=after-1;
      }
      if(tokens[after]?.text==='where')throw new TypeError('Generic derive where clauses remain unproved');
    }
    if(token.type==='punct'&&['{','('].includes(token.text)){if(keyword>=0)header=false;depth++;}
    if(token.type==='punct'&&['}',')'].includes(token.text))depth--;
    if(token.type==='punct'&&['!','#','='].includes(token.text)||token.type==='ident'&&token.text.endsWith('!')||['where','const','extern','macro_rules','macro_export'].includes(token.text))throw new TypeError('Macro, discriminant or generic-const derive input remains unproved');
  }
  if(keyword<0||!derives.length)throw new TypeError('Missing original derive invocation');
  for(const attribute of attributes.filter(attribute=>attribute.helpers)) {
    const siblings=attributes.filter(other=>other!==attribute&&other.position===attribute.position&&other.span.start<attribute.span.start&&other.helpers);
    // Attributes on separate fields are not conflated. The pinned expander
    // still owns any source-specific helper/type validation not checked here.
    if(siblings.some(other=>other.span.end===attribute.span.start&&other.helpers.some(a=>attribute.helpers.some(b=>a.key===b.key&&a.key!=='alias'))))throw new TypeError('Duplicate adjacent helper metadata');
  }
  const input={kind:item.term,name:item.name,condition,attributes,derives,absentConditionalAttributes,inertConditionalAttributes,...(lifetimeParameters?{lifetimeParameters}:{}),...(genericParameters?{genericParameters}:{}),generatedImplBehavior:false};
  const builtinDefault=inspectBuiltinDefaultVariant(item,input);
  return {...input,...(builtinDefault?{builtinDefault}:{})};
}
