// Explicit container Type override route. These candidates grant no type,
// trait, method or enclosing-namespace authority without the private caller join.
import {createHash} from 'node:crypto';
import {deriveDependencySource} from './derive-dependencies.mjs';
import {deriveFootprintHelperAttributeAt,isDeriveFootprintHelperAttributeProof} from './derive-footprints.mjs';
import {registeredDeriveHelperSource} from './derive-helper-namespaces.mjs';
import {proveSchemarsWithTypeConfinement} from './derive-schemars-with.mjs';
import {schemarsDeriveDataInputs} from './schemars-data-inputs.mjs';
import {originalSourceModuleItems} from './source-module-views.mjs';
import {rustTokens} from './rust-structure.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex');
const fail=message=>{throw new TypeError('Original Schemars with output: '+message);};

function sourceRule(dependencies,packageName,path,expected,role,count=1){
 const original=deriveDependencySource(dependencies,packageName,path),actual=rustTokens(original.source).filter(row=>row.type!=='comment'),wanted=rustTokens(expected).filter(row=>row.type!=='comment'),matches=[];
 for(let at=0;at<=actual.length-wanted.length;at++)if(wanted.every((row,index)=>row.text===actual[at+index].text&&row.type===actual[at+index].type)){
  const span={start:actual[at].start,end:actual[at+wanted.length-1].end},source=original.source.slice(span.start,span.end);matches.push({role,package:packageName,source:path,sourceSha256:original.sha256,span,original:source,sha256:hash(source)});
 }
 if(matches.length!==count)fail('actual source branch changed or ambiguous: '+role);return matches;
}
function inputSourceRules(dependencies){
 const rule=(path,expected,role,count=1)=>sourceRule(dependencies,'schemars_derive',path,expected,role,count);
 return [
  ...rule('src/lib.rs','attr::process_serde_attrs(&mut input)?; let cont = Container::from_ast(&input)?;','actual entry preprocess then checked container'),
  ...rule('src/attr/schemars_to_serde.rs','SERDE_KEYWORDS.split_at(SERDE_KEYWORDS.len() - 2).0','with and serialize_with excluded from copied Schemars metadata'),
  ...rule('src/attr/schemars_to_serde.rs','"serialize_with", "with", ];','actual final two excluded keywords'),
  ...rule('src/attr/schemars_to_serde.rs','let (serde_attrs, other_attrs): (Vec<_>, Vec<_>) = attrs.drain(..).partition(|at| at.path().is_ident("serde")); *attrs = other_attrs;','preprocess preserves non-Serde original attributes'),
  ...rule('src/attr/schemars_to_serde.rs','} else if SCHEMARS_KEYWORDS_PARSED_BY_SERDE.contains(&keyword.as_ref()) { schemars_meta_names.insert(keyword); effective_serde_meta.push(meta); }','selected with metadata creates no effective Serde entry'),
  ...rule('src/attr/mod.rs','for attr in attrs.iter().filter(|a| a.path().is_ident(attr_type)) {','only the requested exact attribute path supplies custom metadata'),
  ...rule('src/attr/mod.rs','let schemars_cx = &mut AttrCtxt::new(cx, attrs, "schemars"); let serde_cx = &mut AttrCtxt::new(cx, attrs, "serde"); self.common.populate(attrs, schemars_cx, serde_cx); self.process_attr(data, schemars_cx); self.process_attr(data, serde_cx);','actual container custom metadata owners'),
  ...rule('src/attr/mod.rs','let schemars_cx = &mut AttrCtxt::new(cx, attrs, "schemars"); let serde_cx = &mut AttrCtxt::new(cx, attrs, "serde"); self.common.populate(attrs, schemars_cx, serde_cx); self.process_attr(schemars_cx); self.process_attr(serde_cx);','actual variant custom metadata owners'),
  ...rule('src/attr/mod.rs','self.doc = doc::get_doc(attrs); self.deprecated = attrs.iter().any(|a| a.path().is_ident("deprecated"));','only original doc/deprecated outer attributes affect common metadata'),
  ...sourceRule(dependencies,'serde_derive_internals','src/attr.rs','if attr.path() != SERDE { non_exhaustive |= matches!(&attr.meta, syn::Meta::Path(path) if path == NON_EXHAUSTIVE); continue; }','Serde container ignores other registered helper paths'),
  ...sourceRule(dependencies,'serde_derive_internals','src/attr.rs','for attr in &variant.attrs { if attr.path() != SERDE { continue; }','Serde variant ignores other registered helper paths'),
 ];
}

export function schemarsWithDeriveDataInputs({context,certificate,module,dependencies}){
 const input=schemarsDeriveDataInputs({source:module.source,span:certificate.span});
 if(input.style!=='unit-enum')fail('only the complete original unit-enum profile is selected');
 const docs=input.attributes.filter(row=>row.position==='container'&&row.name==='doc');
 // The exact original common-default predicate selects six transparent methods
 // without docs, or the nontransparent four-method/doc-mutator branch with docs.
 const selected=certificate.attributes.filter(row=>row.name==='schemars');
 if(selected.length!==1||selected[0].position!=='container'||selected[0].helpers?.length!==1||selected[0].helpers[0].key!=='with')fail('one actual container Type helper required');
 const attribute=selected[0],helper=attribute.helpers[0],owner=certificate.owners.filter(row=>row.target.join('::')==='schemars::JsonSchema');
 if(owner.length!==1||certificate.condition.status!=='active'||certificate.dimensions.attributeMacroComplete!==true)fail('unique actual active derive/helper ownership required');
 const registration=registeredDeriveHelperSource({dependencies,target:owner[0].target,helperName:attribute.name});if(!registration)fail('actual declaring helper registration required');
 if(!input.attributes.some(row=>row.name===attribute.name&&row.position===attribute.position&&row.span.start===attribute.span.start&&row.span.end===attribute.span.end))fail('complete source helper span differs');
 const type=proveSchemarsWithTypeConfinement({dependencies,value:helper.value,position:'container'}),sourceRules=inputSourceRules(dependencies);
 return {...input,withOutput:{schema:'original-schemars-with-input-v1',attribute,owner:owner[0],registration,type,sourceRules,transparent:docs.length===0,ignoredHelperProofs:[],typeOwnerResolved:false,generatedImplBehavior:false}};
}

export function validateSchemarsWithAttributes({context,certificate,module,dependencies,input}){
 const item=originalSourceModuleItems(module).find(row=>row.start===certificate.span.start&&row.end===certificate.span.end);if(!item)fail('complete original data item required');
 for(const attribute of certificate.attributes){
  if(['derive','doc','allow','warn','deny','forbid','must_use','non_exhaustive'].includes(attribute.name))continue;
  if(attribute===input.withOutput.attribute)continue;
  // This is a genuine private nested helper proof, not a spelling whitelist.
  // The retained original parser branches above ignore all other helper paths.
  if(attribute.position==='container'||!attribute.helpers||['serde','schemars','deprecated','validate','garde'].includes(attribute.name))fail('unselected original attribute branch: '+attribute.name);
  const proof=deriveFootprintHelperAttributeAt(context,module,item,attribute.span);
  if(!isDeriveFootprintHelperAttributeProof(proof)||!proof.registrations.some(row=>certificate.owners.some(owner=>JSON.stringify(owner.target)===JSON.stringify(row.target))))fail('nested helper lacks its genuine original declaring owner');
  if(proof.attribute.name!==attribute.name||proof.attribute.span.start!==attribute.span.start||proof.attribute.span.end!==attribute.span.end)fail('nested helper source span changed');
  input.withOutput.ignoredHelperProofs.push(proof);
 }
}

export function liftSchemarsWithRoute({compiler,input,definition,template,inst,generator,render,addCommon,sourceBindings,branchProofs,dependencies}){
 const transparent=definition('src/lib.rs','get_transparent_type'),common=definition('src/attr/mod.rs','is_default',text=>text.includes('title: None')&&text.includes('doc: None'));
 const rules=[
  ...sourceRule(dependencies,'schemars_derive','src/lib.rs','if let Some(attr::WithAttr::Type(ty)) = &cont.attrs.with { if cont.attrs.common.is_default() { return Some(ty); } }','actual transparent Type override requires default common metadata'),
  ...sourceRule(dependencies,'schemars_derive','src/attr/mod.rs','Self { title: None, description: None, doc: None, deprecated: false, examples, extensions, transforms, } if examples.is_empty() && extensions.is_empty() && transforms.is_empty()','actual complete common default predicate'),
  ...sourceRule(dependencies,'schemars_derive','src/attr/doc.rs','if macro_args.is_empty() { None } else { Some(parse_quote!(::core::concat!(#macro_args))) }','actual nonempty original document yields nondefault common expression'),
  ...sourceRule(dependencies,'schemars_derive','src/schema_exprs.rs','let mut schema_expr = if let Some(with) = &cont.attrs.with { expr_for_container_with(cont, with) }','actual Type override precedes original container data dispatch'),
  ...sourceRule(dependencies,'schemars_derive','src/ast/mod.rs','if self.serde_attrs.transparent() { if let Data::Struct(_, fields) = &self.data { return fields.iter().find(|f| f.serde_attrs.transparent()); } } None','actual unit enum has no transparent struct field'),
  ...sourceRule(dependencies,'schemars_derive','src/schema_exprs.rs','fn expr_for_container_with(cont: &Container, with_attr: &WithAttr) -> SchemaExpr { let (ty, type_def) = type_for_schema(cont, with_attr); let mut schema_expr = SchemaExpr::from(quote! { <#ty as schemars::JsonSchema>::json_schema(#GENERATOR) }); schema_expr.definitions.extend(type_def); schema_expr }','complete original with-expression function and exact optional helper extension'),
  ...sourceRule(dependencies,'schemars_derive','src/schema_exprs.rs','WithAttr::Type(ty) => (ty.clone(), None),','selected original Type clone emits no helper definition'),
 ];
 const withRoute=definition('src/schema_exprs.rs','expr_for_container_with'),typeRoute=definition('src/schema_exprs.rs','type_for_schema');
 const ty=compiler.sourceType(input.withOutput.type.input.type.tokens.map(row=>row.text).join(' '),{role:'actual original LitStr parsed TypePath clone',source:input.source,span:input.withOutput.attribute.span,confinement:input.withOutput.type.digest,typeOwnerResolved:false});
 const creator=inst(template(withRoute,text=>text.includes('< #ty as schemars :: JsonSchema > :: json_schema')),{ty,GENERATOR:generator},'actual original with-Type schema-expression quote');
 sourceBindings.push(...input.withOutput.sourceRules,...rules,{role:'actual Type helper and source-proved ignored registered siblings',withOutput:input.withOutput});
 branchProofs.push({source:transparent.source,span:transparent.span,predicate:input.withOutput.transparent?'original common metadata is default; actual Type override selects complete transparent impl':'original doc expression is Some, so common.is_default() is false; no transparent flag is admitted',value:true},{source:common.source,span:common.span,predicate:'all common metadata fields retained; original doc presence selects actual common-default predicate',value:input.withOutput.transparent},{source:typeRoute.source,span:typeRoute.span,predicate:'actual WithAttr::Type clones the original parsed type and returns None helper definition',value:true});
 return {body:input.withOutput.transparent?compiler.empty({role:'nontransparent schema-expression branch is not selected'}):render(addCommon({creator,definitions:[],mutators:[]},input.attributes.filter(row=>row.position==='container'))),generator,ty,withOutput:input.withOutput};
}
