import {DERIVE_SOURCE_PROFILE} from './derive-dependencies.mjs';
import {isPlainSourceIdentifier} from './module-paths.mjs';

// Source input confinement only. Syn emits lifetime/type names in the impl
// header and omits type defaults there. Instantiation and trait execution
// still require independent lowering of the original declaration.
const original=DERIVE_SOURCE_PROFILE.packages.find(entry=>entry.name==='syn');
export const DERIVE_GENERIC_INPUT_GRAMMAR=Object.freeze({
  schema:'bounded-original-derive-generic-input-grammar-v1',package:'syn',
  version:original.version,path:'src/generics.rs',
  sha256:original.members['src/generics.rs'],
  parameterLimit:32,defaultPathSegments:32,
  instantiation:false,generatedImplBehavior:false,
});
if(DERIVE_GENERIC_INPUT_GRAMMAR.sha256!=='a563693b6c9ec11d61b2ce7f869763a3c967879dd9306743f01203cd9555cda1')throw new TypeError('Derive generic input lacks its original audited Syn parser/printing member');
const fail=()=>{throw new TypeError('Derive generic parameters require bounded original names and optional macro-free type-path defaults');};
const name=token=>token?.type==='ident'&&/^[A-Za-z_][A-Za-z0-9_]*$/u.test(token.text)&&isPlainSourceIdentifier(token.text);
const retained=tokens=>tokens.map(token=>({text:token.text,type:token.type,span:{start:token.start,end:token.end}}));
function defaultPath(tokens,begin) {
  let at=begin,absolute=false;const segments=[];
  if(tokens[at]?.text==='::'){absolute=true;at++;}
  while(true) {
    const token=tokens[at++];
    if(!(name(token)||!absolute&&segments.length===0&&['crate','self','super'].includes(token?.text)))fail();
    segments.push(token.text);if(segments.length>32)fail();
    if(tokens[at]?.text!=='::')break;at++;
  }
  if(![',','>'].includes(tokens[at]?.text))fail();
  return {end:at,evidence:{kind:'original-nongeneric-type-path',leadingColon:absolute,segments,span:{start:tokens[begin].start,end:tokens[at-1].end},tokens:retained(tokens.slice(begin,at)),resolvedType:false}};
}
export function originalDeriveGenericParameters(tokens,begin) {
  if(tokens[begin]?.text!=='<')fail();
  const parameters=[],names=new Set();let at=begin+1;
  while(tokens[at]?.text!=='>') {
    const first=tokens[at++];let kind,identifier;
    if(first?.type==='char'&&/^'[A-Za-z_][A-Za-z0-9_]*$/u.test(first.text)&&isPlainSourceIdentifier(first.text.slice(1))){kind='lifetime';identifier=first.text.slice(1);}
    else if(name(first)){kind='type';identifier=first.text;}
    else fail();
    if(names.has(identifier)||parameters.length>=32)fail();names.add(identifier);
    let typeDefault=null;
    if(tokens[at]?.text==='='){
      if(kind!=='type')fail();at++;const parsed=defaultPath(tokens,at);at=parsed.end;typeDefault=parsed.evidence;
    }
    parameters.push({kind,name:identifier,span:{start:first.start,end:tokens[at-1].end},...(typeDefault?{typeDefault}:{}),tokens:retained(tokens.slice(tokens.indexOf(first),at))});
    if(tokens[at]?.text==='>')break;
    if(tokens[at++]?.text!==',')fail();
  }
  const last=tokens[at];if(!last||!parameters.length)fail();
  return {end:at+1,evidence:{schema:'original-derive-generic-parameters-v1',grammar:DERIVE_GENERIC_INPUT_GRAMMAR,parameters,span:{start:tokens[begin].start,end:last.end},tokens:retained(tokens.slice(begin,at+1)),genericTypeInstantiation:false,generatedImplBehavior:false}};
}
