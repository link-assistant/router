import {createHash} from 'node:crypto';
import {DERIVE_SOURCE_PROFILE,deriveDependencySource,isDeriveDependencyProof} from './derive-dependencies.mjs';
import {originalDeriveTypePath} from './derive-generic-parameters.mjs';
import {rustTokens} from './rust-structure.mjs';

// This route translates one generator branch, never JsonSchema execution or
// the complete generated implementation. A type string stays type syntax.
export const SCHEMARS_WITH_TYPE_GRAMMAR=Object.freeze({
  profile:'bounded-schemars-with-TypePath-v1',package:'schemars_derive',version:'1.2.2',
  members:Object.freeze([
    Object.freeze({path:'src/attr/mod.rs',sha256:'9ddb45f4cb69aa789f69ab4a1c9589010165030a249e00e9191facb6ae2f3164'}),
    Object.freeze({path:'src/attr/parse_meta.rs',sha256:'c43f374a1d43fad8da680ffe2052c0984337ad05fe857e5791f0358aedc4feff'}),
    Object.freeze({path:'src/schema_exprs.rs',sha256:'358c91c3a0aa35c556a9b562909df57c467cea97241853676dc8f3d653f36b13'}),
  ]),parser:'parse_name_value_lit_str<syn::Type>',output:'WithAttr::Type(ty) => (ty.clone(), None)',
  generatedHelperBehavior:false,
});
const original=DERIVE_SOURCE_PROFILE.packages.find(entry=>entry.name===SCHEMARS_WITH_TYPE_GRAMMAR.package&&entry.version===SCHEMARS_WITH_TYPE_GRAMMAR.version);
for(const member of SCHEMARS_WITH_TYPE_GRAMMAR.members)if(original?.members[member.path]!==member.sha256)throw new TypeError('Schemars with lacks an audited original parser/output member');
const hash=value=>createHash('sha256').update(value).digest('hex');
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
const proofs=new WeakMap(),sourceProofs=new WeakMap();
const significant=source=>rustTokens(source).filter(token=>token.type!=='comment');
const fail=()=>{throw new TypeError('Schemars with type requires a bounded macro-free nongeneric TypePath');};

export function boundedSchemarsWithType(value,position) {
  if(typeof value!=='string'||Buffer.byteLength(value)>4096||!['container','field','variant'].includes(position))fail();
  let type;
  try{const tokens=rustTokens(value);if(tokens.some(token=>token.type==='comment'))fail();type=originalDeriveTypePath(tokens);}catch{fail();}
  return {profile:SCHEMARS_WITH_TYPE_GRAMMAR.profile,grammar:SCHEMARS_WITH_TYPE_GRAMMAR,position,type,
    generatedHelperBehavior:false,obligations:['type owner resolution, full generated JsonSchema output and schema execution remain unimplemented']};
}

// Each selected rule is matched against actual sealed original tokens. Member
// checksums provide identity; they alone do not establish generator behavior.
function originalRule(dependencies,path,written,role,count=1,packageName='schemars_derive') {
  const origin=deriveDependencySource(dependencies,packageName,path),tokens=significant(origin.source),expected=significant(written),matches=[];
  for(let at=0;at<=tokens.length-expected.length;at++)if(expected.every((token,index)=>token.text===tokens[at+index].text&&token.type===tokens[at+index].type)) {
    const span={start:tokens[at].start,end:tokens[at+expected.length-1].end};
    matches.push({role,package:packageName,source:path,sourceSha256:origin.sha256,span,sha256:hash(origin.source.slice(span.start,span.end)),tokens:tokens.slice(at,at+expected.length).map(token=>({text:token.text,type:token.type,span:{start:token.start,end:token.end}}))});
  }
  if(matches.length!==count)throw new TypeError('Schemars with original source rule changed or became ambiguous: '+role);
  return matches;
}
function sourceRules(dependencies) {
  if(sourceProofs.has(dependencies))return sourceProofs.get(dependencies);
  const rules=[
    ...originalRule(dependencies,'src/attr/mod.rs','use syn::{Attribute, Expr, ExprLit, Ident, Lit, LitStr, Path, Type};','syn-type-binding'),
    ...originalRule(dependencies,'src/attr/mod.rs','use parse_meta::{ parse_extensions, parse_name_value_expr, parse_name_value_lit_str, require_name_value_lit_str, require_path_only, };','parser-owner-binding'),
    ...originalRule(dependencies,'src/attr/mod.rs','pub enum WithAttr { Type(Type), Function(Path), }','typed-enum-binding'),
    ...originalRule(dependencies,'src/attr/mod.rs','"with" if cx.attr_type == "schemars" => match self.with { Some(WithAttr::Type(_)) => cx.duplicate_error(&meta), Some(WithAttr::Function(_)) => cx.mutual_exclusive_error(&meta, "schema_with"), None => self.with = parse_name_value_lit_str(meta, cx).ok().map(WithAttr::Type), },','container-parser-branch'),
    ...originalRule(dependencies,'src/attr/mod.rs','"with" => match self.with { Some(WithAttr::Type(_)) => cx.duplicate_error(&meta), Some(WithAttr::Function(_)) => cx.mutual_exclusive_error(&meta, "schema_with"), None => self.with = parse_name_value_lit_str(meta, cx).ok().map(WithAttr::Type), },','field-variant-parser-branch',2),
    ...originalRule(dependencies,'src/attr/parse_meta.rs','if let CustomMeta::NameValue(MetaNameValue { value: Expr::Lit(ExprLit { lit: Lit::Str(lit_str), .. }), .. }) = meta { Ok(lit_str) }','literal-input-branch'),
    ...originalRule(dependencies,'src/attr/parse_meta.rs','pub fn parse_name_value_lit_str<T: Parse>(meta: CustomMeta, cx: &AttrCtxt) -> Result<T, ()> { let lit_str = require_name_value_lit_str(meta, cx)?; parse_lit_str(&lit_str, cx) }','literal-to-parse-binding'),
    ...originalRule(dependencies,'src/attr/parse_meta.rs','fn parse_lit_str<T: Parse>(lit_str: &LitStr, cx: &AttrCtxt) -> Result<T, ()> { lit_str.parse().map_err','syn-literal-parse-call'),
    ...originalRule(dependencies,'src/schema_exprs.rs','use crate::{ast::*, attr::WithAttr, idents::*};','output-with-owner-binding'),
    ...originalRule(dependencies,'src/schema_exprs.rs','fn type_for_schema(cont: &Container, with_attr: &WithAttr) -> (syn::Type, Option<TokenStream>) { match with_attr { WithAttr::Type(ty) => (ty.clone(), None),','selected-output-branch'),
    ...originalRule(dependencies,'src/ty.rs','impl Parse for TypePath { fn parse(input: ParseStream) -> Result<Self> { let expr_style = false; let (qself, path) = path::parsing::qpath(input, expr_style)?; Ok(TypePath { attrs: Vec::new(), qself, path, }) } }','syn-type-path-parser',1,'syn'),
  ];
  const result=freeze(rules);sourceProofs.set(dependencies,result);return result;
}
export function proveSchemarsWithTypeConfinement({dependencies,value,position}={}) {
  if(!isDeriveDependencyProof(dependencies))throw new TypeError('Schemars with output confinement requires sealed original dependencies');
  const input=boundedSchemarsWithType(value,position),rules=sourceRules(dependencies);
  const evidence={schema:'original-schemars-with-type-confinement-v1',dependenciesDigest:dependencies.digest,input,
    originalRules:rules,selectedParserRule:position==='container'?'container-parser-branch':'field-variant-parser-branch',
    outputType:structuredClone(input.type),helperDefinitions:[],selectedTypeBranchComplete:true,
    typeOwnerResolved:false,completeDeriveOutput:false,generatedImplBehavior:false,generatedHelperBehavior:false,
    obligations:input.obligations};
  const result=freeze({...evidence,digest:hash(JSON.stringify(evidence))});proofs.set(result,{dependencies,value,position});return result;
}
export const isSchemarsWithTypeConfinement=value=>!!value&&proofs.has(value);
export function assertSchemarsWithTypeConfinement(proof,{dependencies,value,position}={}) {
  const state=proofs.get(proof);
  if(!state||state.dependencies!==dependencies||state.value!==value||state.position!==position)throw new TypeError('Unsealed or mismatched original Schemars with type confinement');
  return proof;
}
