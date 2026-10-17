// Source-selected generator fragments. The final private caller issuer joins
// every source macro; these helpers grant no namespace or trait authority.
import {originalMacroTrees} from './macro-token-trees.mjs';
export function liftSchemarsSchemaRoute({inventory,compiler,input,definition,select,inst,leaf,empty,sourceBindings,branchProofs}){
 const schema=leaf('schema','ident','original ConstIdent SCHEMA'),generator=leaf('generator','ident','original ConstIdent GENERATOR');
 const sourceText=nodes=>nodes.map(node=>node.tag==='slot'?'#'+node.name:node.tag==='repeat'?'#('+sourceText(node.nodes)+')'+(node.separator?.text??'')+node.quantifier:node.tag==='group'?node.delimiter+sourceText(node.nodes)+({'(':')','[':']','{':'}'}[node.delimiter]):node.text).join(' ');
 const template=(definition_,predicate)=>select(inventory,definition_,predicate);
 const seq=(parts,role)=>compiler.sequence(parts,{role});
 const render=expression=>{
  const output=definition('src/schema_exprs.rs','to_tokens',text=>text.includes('let Self {')&&text.includes('post_mutators'));
  const bindings={definitions:seq(expression.definitions??[],'original SchemaExpr.definitions source order'),creator:expression.creator,mutators:seq(expression.mutators??[],'original chained mutators then post_mutators'),SCHEMA:schema};
  const hasMutators=(expression.mutators??[]).length>0;branchProofs.push({source:output.source,span:output.span,predicate:'mutators.is_empty() && post_mutators.is_empty()',value:!hasMutators});
  return inst(template(output,text=>hasMutators?text.includes('let mut #SCHEMA'):!text.includes('let mut #SCHEMA')),bindings,'actual SchemaExpr::ToTokens selected block');
 };
 function document(attributes){
  const docs=attributes.filter(row=>row.name==='doc');if(!docs.length)return null;const definition_=definition('src/attr/doc.rs','get_doc');
  if(!definition_.text.includes("strip_prefix(' ')")||!definition_.text.includes('Expr::Lit(ExprLit')||!definition_.text.includes('lit: Lit::Str(lit_str)'))throw new TypeError('Original bounded document expression branches changed');
  const parts=[];
  for(const attribute of docs){const nodes=originalMacroTrees(attribute.source),body=nodes[1]?.children;if(nodes.length!==2||nodes[0].text!=='#'||nodes[1]?.delimiter!=='['||body?.length!==3||body[0].text!=='doc'||body[1].text!=='='||body[2].type!=='string'||!/^"(?:[^"\\\r\n]|\\["\\nrt])*"$/u.test(body[2].text))throw new TypeError('Original document requires a bounded actual string literal');let value=JSON.parse(body[2].text);if(value.startsWith(' '))value=value.slice(1);if(parts.length)parts.push(inst(template(definition_,text=>text.trim()===', "\\n" ,'),{},'original doc line separator quote'));parts.push(leaf(JSON.stringify(value),'string','original get_doc LitStr value/strip_prefix constructor'));}
  const output=inst(template(definition_,text=>text.includes(':: core :: concat !')),{macro_args:compiler.join(parts,{role:'original doc TokenStream::extend source order'})},'actual get_doc parse_quote expression');sourceBindings.push({role:'doc Expr::Lit(Lit::Str) values and original single-space stripping',source:definition_.source,span:definition_.span,attributes:docs.map(row=>row.span)});return output;
 }
 function addCommon(expression,attributes){
  const doc=document(attributes);if(!doc)return expression;const common=definition('src/attr/mod.rs','add_mutators',text=>text.includes('insert_metadata_property_if_nonempty'));
  const title=inst(template(common,text=>text.includes('const TITLE :')),{doc},'original doc title local constant block'),description=inst(template(common,text=>text.includes('const DESCRIPTION :')),{doc},'original doc description local constant block');
  const mutators=[inst(template(common,text=>text.includes('"title"')&&text.includes('#title')),{SCHEMA:schema,title},'original document title mutator'),inst(template(common,text=>text.includes('"description"')&&text.includes('#description')),{SCHEMA:schema,description},'original document description mutator')];
  sourceBindings.push({role:'original CommonAttrs doc fallback and metadata property constructors',source:common.source,span:common.span});return{...expression,mutators:[...(expression.mutators??[]),...mutators]};
 }
 const container=definition('src/schema_exprs.rs','expr_for_container');if(!container.text.includes('Data::Enum(variants) => expr_for_enum')||!container.text.includes('cont.add_mutators(&mut schema_expr)'))throw new TypeError('Original Schemars container dispatch changed');
 const nameTokens=definition('src/ast/mod.rs','to_tokens',text=>text.includes('let ser_name = self.0.serialize_name()'));if(!nameTokens.text.includes('if ser_name == de_name'))throw new TypeError('Original same-name literal printer branch changed');
 sourceBindings.push({role:'actual original same-name Name::ToTokens literal branch',source:nameTokens.source,span:nameTokens.span});
 if(input.style==='named-struct'){
  const structure=definition('src/schema_exprs.rs','expr_for_struct'),fieldRecipe=definition('src/schema_exprs.rs','expr_for_field'),defaultRecipe=definition('src/schema_exprs.rs','field_default_expr');
  const fieldType=definition('src/schema_exprs.rs','type_for_field_schema'),contract=definition('src/ast/mod.rs','with_contract_check',text=>text.includes('skip_deserializing: bool')),fieldMutators=definition('src/ast/mod.rs','add_mutators',text=>text.includes('self.attrs.validation.add_mutators'));
  if(!fieldType.text.includes('None => (field.ty.clone(), None)')||!contract.text.includes('(false, false) => action')||!fieldMutators.text.includes('self.attrs.common.add_mutators(expr)'))throw new TypeError('Original field type/contract/mutator helper branches changed');
  branchProofs.push({source:fieldType.source,span:fieldType.span,predicate:'field.attrs.with is None; clone original syn type and emit no helper definition',value:true},{source:contract.source,span:contract.span,predicate:'actual field skip_deserializing=false and skip_serializing=false selects unchanged action',value:true},{source:fieldMutators.source,span:fieldMutators.span,predicate:'common docs retained; validation absent; both independent skip flags false',value:true});
  if(!structure.text.includes('SerdeDefault::None => None')||!fieldRecipe.text.includes('field.add_mutators(&mut schema_expr)')||!defaultRecipe.text.includes('if field.serde_attrs.skip_serializing()'))throw new TypeError('Original named struct/default dispatch changed');
  const properties=input.fields.map(field=>{
   const ty=compiler.sourceType(field.typeSource,{role:'actual original syn Field.ty',source:input.source,span:field.typeSpan}),name=leaf(JSON.stringify(field.name),'string','original same-name field Name::ToTokens'),definitions=seq([],'actual no custom field type definition');
   let expression={creator:inst(template(fieldRecipe,text=>text.includes('#GENERATOR . subschema_for')),{GENERATOR:generator,ty},'actual normal required=false field subschema'),definitions:[],mutators:[]};
   expression=addCommon(expression,field.attributes??[]);
   if(field.default){
    let default_=inst(template(defaultRecipe,text=>text.trim()==='< #ty > :: default ()'),{ty},'actual bare field default value quote');
    if(field.skipSerializingIf){default_=inst(template(defaultRecipe,text=>text.includes('let default =')&&text.includes('#skip_if')),{default_expr:default_,skip_if:field.skipSerializingIf},'original conditional default/predicate block');}
    else default_=inst(template(defaultRecipe,text=>text.trim()==='Some (#default_expr)'),{default_expr:default_},'original unconditional Some default expression');
    expression.mutators.push(inst(template(structure,text=>text.includes('_schemars_maybe_to_value')),{default:default_,SCHEMA:schema},'original optional default serialization mutator'));
   }
   const isOptional=field.default&&field.skipSerializingIf?inst(template(structure,text=>text.trim()==='true'),{},'original default plus skip predicate optional branch'):!field.default&&!field.skipSerializingIf?inst(template(structure,text=>text.startsWith('#GENERATOR . contract')),{GENERATOR:generator,ty},'original no-default/no-predicate is_option branch'):inst(template(structure,text=>text.startsWith('if #GENERATOR . contract')),{GENERATOR:generator,has_default:leaf(String(field.default),'ident','actual bare field default presence'),required_attr:leaf('false','ident','actual absent validation-required attribute'),ty,has_skip_serialize_if:leaf(String(!!field.skipSerializingIf),'ident','actual predicate presence')},'original independent default/predicate optional branch');
   return inst(template(structure,text=>text.includes('insert_object_property')),{definitions,SCHEMA:schema,name,is_optional:isOptional,schema_expr:render(expression)},'original source-ordered field property insertion block');
  });
  const creator=inst(template(structure,text=>text.includes('schemars :: json_schema !')),{set_additional_properties:empty('actual no deny_unknown_fields')},'original named object schema creator');
  const expression=addCommon({creator,definitions:[],mutators:properties},input.attributes.filter(row=>row.position==='container'));branchProofs.push({source:structure.source,span:structure.span,predicate:'no container default, flatten, skip, custom type/schema/serializer, validation, deny_unknown_fields',value:true});return{body:render(expression),sourceText,render,addCommon,generator,schema};
 }
 if(input.style!=='unit-enum')throw new TypeError('Schemars data style requires its independent original route');
 const enumerate=definition('src/schema_exprs.rs','expr_for_enum'),external=definition('src/schema_exprs.rs','expr_for_external_tagged_enum');
 if(!enumerate.text.includes('TagType::External')||!external.text.includes('if complex_variants.is_empty()')||!external.text.includes('return unit_schema')||!nameTokens.text.includes('if ser_name == de_name'))throw new TypeError('Original external unit enum/name branches changed');
 const values=input.variants.map(variant=>{const name=leaf(JSON.stringify(variant.schemaName),'string','actual original same serialize/deserialize Name::ToTokens literal');return inst(template(external,text=>text.includes('enum_values . push')),{name},'original source-ordered unit name append');});
 const creator=inst(template(external,text=>text.includes('let mut map =')&&text.includes('Value :: Array')),{add_unit_names:seq(values,'original unit_variants.iter() order')},'original all-unit externally tagged schema creator');
 branchProofs.push({source:external.source,span:external.span,predicate:'all original variants unit/default attributes; !untagged && !ref_variants; complex_variants.is_empty()',value:true});
 sourceBindings.push({role:'source Name::ToTokens same-name branch; original non-skipped unit variants',source:nameTokens.source,span:nameTokens.span,variants:input.variants.map(row=>({name:row.name,span:row.span,schemaName:row.schemaName}))});
 return{body:render(addCommon({creator,definitions:[],mutators:[]},input.attributes.filter(row=>row.position==='container'))),sourceText,render,addCommon,generator,schema};
}
