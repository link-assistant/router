// Pure original syntax candidates. The Serde issuers separately join private
// caller/helper ownership; these candidates never grant output or runtime proof.
import {createHash} from 'node:crypto';
import {builtinDeriveDataInputs} from './builtin-derive-data-inputs.mjs';
import {deriveDependencySource,isDeriveDependencyProof} from './derive-dependencies.mjs';
import {originalMacroTrees,freezeMacroTree} from './macro-token-trees.mjs';
import {rustTokens} from './rust-structure.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex'),plans=new WeakMap();
const fail=message=>{throw new TypeError('Original Serde field helper: '+message);};
function rule(origin,written,role){
 const actual=rustTokens(origin.source).filter(token=>token.type!=='comment'),expected=rustTokens(written).filter(token=>token.type!=='comment'),matches=[];
 for(let at=0;at<=actual.length-expected.length;at++)if(expected.every((token,index)=>token.text===actual[at+index].text&&token.type===actual[at+index].type))matches.push({start:actual[at].start,end:actual[at+expected.length-1].end});
 if(matches.length!==1)fail('source rule changed or is ambiguous: '+role);const span=matches[0];return{source:origin.path,sourceSha256:origin.sha256,role,span,sha256:hash(origin.source.slice(span.start,span.end)),tokens:actual.filter(token=>token.start>=span.start&&token.end<=span.end)};
}
export function originalSerdeFieldHelperSourcePlan(dependencies){
 if(!isDeriveDependencyProof(dependencies))fail('source plan requires genuine locked dependencies');if(plans.has(dependencies))return plans.get(dependencies);
 const attr=deriveDependencySource(dependencies,'serde_derive','src/internals/attr.rs'),expr=deriveDependencySource(dependencies,'syn','src/expr.rs'),rules=[
  rule(attr,'skip_serializing_if: Option<syn::ExprPath>,','actual typed skip predicate storage'),
  rule(attr,'pub enum Default { None, Default, Path(syn::ExprPath), }','actual field default variants'),
  rule(attr,'pub fn skip_serializing_if(&self) -> Option<&syn::ExprPath> { self.skip_serializing_if.as_ref() }','actual field predicate accessor'),
  rule(attr,'fn parse_lit_into_expr_path(cx: &Ctxt, attr_name: Symbol, meta: &ParseNestedMeta,) -> syn::Result<Option<syn::ExprPath>> { let Some(string) = get_lit_str(cx, attr_name, meta)? else { return Ok(None); }; Ok(match string.parse() {','original literal to typed ExprPath parser'),
  rule(attr,'} else { default.set(&meta.path, Default::Default); } } else if meta.path == SKIP_SERIALIZING {','original bare field default parser branch'),
  rule(attr,'} else if meta.path == SKIP_SERIALIZING_IF { if let Some(path) = parse_lit_into_expr_path(cx, SKIP_SERIALIZING_IF, &meta)? { skip_serializing_if.set(&meta.path, path); } } else if meta.path == SERIALIZE_WITH {','original field skip predicate parser branch'),
 ];
 if(!expr.source.includes('ToTokens for ExprPath')||!expr.source.includes('impl Parse for ExprPath'))fail('original ExprPath parse/print source is absent');
 const evidence={schema:'original-serde-field-helper-source-plan-v1',dependenciesDigest:dependencies.digest,rules,exprPathSource:{source:expr.path,sourceSha256:expr.sha256,bytes:Buffer.byteLength(expr.source)},namespaceAuthority:false,generatedHelperBehavior:false};const plan=freezeMacroTree({...evidence,digest:hash(JSON.stringify(evidence))});plans.set(dependencies,plan);return plan;
}
export function serdeFieldHelperInputs(options){
 const input=builtinDeriveDataInputs(options),fields=input.fields.map(field=>({...field,default:false,skipSerializingIf:null,helperAttributes:[]}));
 for(const attribute of input.attributes.filter(attribute=>attribute.name==='serde')){
  const trees=originalMacroTrees(attribute.source),group=trees[1]?.children?.[1];if(trees.length!==2||trees[0].text!=='#'||trees[1].delimiter!=='['||trees[1].children[0]?.text!=='serde'||group?.delimiter!=='('||trees[1].children.length!==2)fail('actual helper attribute syntax is incomplete');
  const target=attribute.position==='field'?fields.find((field,index)=>attribute.span.end<=field.fieldDefinitionSpan.start&&(index===0||attribute.span.start>=fields[index-1].fieldDefinitionSpan.end)):null;
  let at=0;const cells=group.children;
  while(at<cells.length){const key=cells[at++]?.text;let value=null;if(cells[at]?.text==='='){at++;const literal=cells[at++];if(['default','skip_serializing_if'].includes(key)){if(literal?.type!=='string'||!/^"[^"\\\r\n]*"$/u.test(literal.text))fail('helper literal requires its independent Rust escape/raw-string route');value=JSON.parse(literal.text);}}else if(cells[at]?.kind==='group'){if(['default','skip_serializing_if'].includes(key))fail('nested helper variants remain independent');at++;}
   if(['default','skip_serializing_if'].includes(key)){
    if(!target)fail('new default/predicate capability is restricted to actual fields');if(key==='default'&&value!==null)fail('default path remains outside the selected bare-default route');if(key==='skip_serializing_if'&&typeof value!=='string')fail('predicate requires an actual literal ExprPath');
    if(target.helperAttributes.some(row=>row.key===key))fail('duplicate field helper is not a source-selected branch');target.helperAttributes.push({key,value,attribute});if(key==='default')target.default=true;else target.skipSerializingIf=value;
   }
   if(at<cells.length&&cells[at++]?.text!==',')fail('helper separator is not original syntax');
  }
 }
 const evidence={schema:'original-serde-field-helper-syntax-candidate-v1',wholeSourceSha256:input.wholeSourceSha256,itemSha256:input.itemSha256,inputSpan:input.span,inputSyntaxDigest:input.digest,fields,namespaceAuthority:false,ownerAuthority:false,copyAuthority:false,noDropAuthority:false,constAuthority:false,generatedHelperBehavior:false};return freezeMacroTree({...evidence,digest:hash(JSON.stringify(evidence))});
}
