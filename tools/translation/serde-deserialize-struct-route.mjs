// Source-selected default named-field Deserialize grammar. Both Cargo feature
// outcomes are retained; these fragments never implement Deserialize at runtime.
export function liftSerdeDeserializeStructRoutes({inventory,compiler,input,definition,select,inst,leaf,empty,ident,privateIdent,bindingProofs,branchProofs}){
  const structure=definition('src/de/struct_.rs','deserialize'),map=definition('src/de/struct_.rs','deserialize_map');
  const sequence=definition('src/de.rs','deserialize_seq'),missing=definition('src/de.rs','expr_is_missing'),missingSeq=definition('src/de.rs','expr_is_missing_seq');
  const fieldHelper=definition('src/de/struct_.rs','deserialize_field_identifier'),generated=definition('src/de/identifier.rs','deserialize_generated'),identifier=definition('src/de/identifier.rs','deserialize_identifier');
  const flatten=definition('src/de.rs','has_flatten'),fieldIndex=definition('src/de.rs','field_i');
  if(!flatten.text.includes('.any(|field| field.attrs.flatten() && !field.attrs.skip_deserializing())')||!map.text.includes('if has_flatten && cattrs.deny_unknown_fields()'))throw new TypeError('Pinned flatten/format_args branch predicate has changed');
  branchProofs.push({predicate:'!has_flatten',value:true,source:flatten.source,sourceSha256:flatten.sourceSha256,span:flatten.span,basis:'no accepted field helper can set flatten; actual helper any(flatten && !skip) is false',excludedOutputSource:{source:map.source,span:map.span,predicate:'has_flatten && deny_unknown_fields',bangMacro:'format_args'}});
  if(!fieldIndex.text.includes('Ident::new(&format!("__field{}", i)'))throw new TypeError('Pinned source-ordered field Ident generator changed');
  const bounded=(definition,begin,end)=>{const start=definition.text.indexOf(begin),stop=definition.text.indexOf(end,start+begin.length);if(start<0||stop<0)throw new TypeError('Original selected branch is not source-bounded');return {...definition,span:{start:definition.span.start+start,end:definition.span.start+stop}};};
  const emit=(definition,predicate,bindings,role)=>inst(select(inventory,definition,predicate),bindings,role);
  const seq=(values,role)=>compiler.sequence(values,{role});
  const shared={private:privateIdent};
  const delife=leaf("'de",'lifetime','original BorrowedLifetimes::Borrowed(empty).de_lifetime');
  const deGenerics=compiler.genericLifetimes([delife],{role:'actual DeImplGenerics/DeTypeGenerics prepends one unbounded de lifetime'});
  const none=empty('actual helper-controlled Option::None or empty original generics');
  const expecting=leaf(JSON.stringify('struct '+input.name.name),'string','original StructForm::Struct expecting literal');
  const typeName=leaf(JSON.stringify(input.name.name),'string','original default Container deserialize Name literal');
  const fields=input.fields.map((field,index)=>({field,name:leaf('__field'+index,'ident','pinned field_i source-ordered Ident'),member:leaf(field.name,'ident','original syn::Member::Named'),literal:leaf(JSON.stringify(field.name),'string','default field Name literal'),type:field.typeFragment}));
  const thisValue=emit(generated,text=>text.trim()==='__Field',{},'original generated field enum owner');
  const deny=input.denyUnknownFields;
  const fallthrough=deny?emit(identifier,text=>text.includes('unknown_field'),shared,'actual deny_unknown_fields fallthrough'):emit(fieldHelper,text=>text.includes('Ok ( __Field :: __ignore )'),shared,'default !flatten && !deny unknown field fallthrough');
  const ignore=deny?none:emit(fieldHelper,text=>text.trim()==='__ignore ,',{},'default ignored field variant');
  const mapping=(row,bytes)=>{
    const scope=bounded(identifier,bytes?'let bytes_mapping':'let str_mapping',bytes?'let expecting':'let bytes_mapping');
    const alias=bytes?compiler.byteString(row.field.name,{role:'original Literal::byte_string(Name.as_bytes())'}):row.literal;
    return emit(scope,text=>text.includes('#aliases =>'),{aliases:seq([alias],'one actual default field alias'),private2:privateIdent,this_value:thisValue,ident:row.name},bytes?'default byte-name field mapping':'default string-name field mapping');
  };
  const u64Mapping=fields.map((row,index)=>emit(identifier,text=>text.startsWith('#i =>'),{i:leaf(String(index),'number','enumerated source field index as u64'),...shared,this_value:thisValue,ident:row.name},'default numeric field-name mapping'));
  const numericFallback=deny?emit(identifier,text=>text.includes('invalid_value'),{...shared,fallthrough_msg:leaf(JSON.stringify('field index 0 <= i < '+fields.length),'string','actual numeric field index expecting literal')},'actual denied numeric unknown index'):fallthrough;
  const bytesToStr=deny?emit(identifier,text=>text.startsWith('let __value = &'),shared,'original missing fallthrough byte-name conversion'):none;
  const visitOther=emit(identifier,text=>text.startsWith('fn visit_u64'),{...shared,u64_mapping:seq(u64Mapping,'original numeric field mappings'),u64_fallthrough_arm:numericFallback},'nonflatten numeric visitor with source-selected fallback');
  const visitorImpl=emit(identifier,text=>text.startsWith('fn expecting'),{...shared,expecting:leaf(JSON.stringify('field identifier'),'string','original !is_variant default expecting'),visit_other:visitOther,str_mapping:seq(fields.map(row=>mapping(row,false)),'original field string mappings'),bytes_mapping:seq(fields.map(row=>mapping(row,true)),'original field byte mappings'),bytes_to_str:bytesToStr,value_as_str_content:none,value_as_bytes_content:none,fallthrough_arm:fallthrough,visit_borrowed:none},'default field identifier visitor methods');
  const fieldVisitor=emit(generated,text=>text.includes('enum __Field'),{...shared,lifetime:none,field_idents:seq(fields.map(row=>row.name),'original fields identifiers'),ignore_variant:ignore,visitor_impl:visitorImpl},'default nonflatten field identifier enum and visitors');
  const missingExpression=row=>{
    const func=emit(missing,text=>text.includes('de :: missing_field'),shared,'default missing field function path');
    return emit(missing,text=>text.trim()==='#func ( #name ) ?', {func,name:row.literal},'default expr_is_missing with no custom/default helper');
  };
  const missingSequence=(index,expectation)=>emit(missingSeq,text=>text.includes('invalid_length'),{...shared,index:leaf(String(index),'number','actual index_in_seq'),expecting:expectation},'original missing sequence element error');
  const seqExpectation=leaf(JSON.stringify('struct '+input.name.name+' with '+fields.length+' element'+(fields.length===1?'':'s')),'string','actual deserialize_seq expected element count literal');
  const normalMap=()=>{
    const letValues=fields.map(row=>emit(map,text=>text.startsWith('let mut #name :'),{...shared,name:row.name,field_ty:row.type},'default field typed Option storage'));
    const valueArms=fields.map(row=>{
      const func=emit(map,text=>text.trim()==='_serde :: de :: MapAccess :: next_value :: < #field_ty >',{field_ty:row.type},'original next_value generic actual field Type');
      const visit=emit(map,text=>text.trim()==='#func ( & mut __map ) ?', {func},'default checked source next_value expression');
      return emit(map,text=>text.startsWith('__Field :: #name =>'),{...shared,name:row.name,deser_name:row.literal,visit},'default duplicate-field guarded value arm');
    });
    const ignored=deny?none:emit(map,text=>text.startsWith('_ =>')&&text.includes('IgnoredAny'),{},'default unknown-field consume arm');
    const matchKeys=deny&&!fields.length?emit(map,text=>text.includes('Option :: map'),shared,'actual empty denied field-key impossible match'):emit(map,text=>text.startsWith('while let'),{...shared,value_arms:seq(valueArms,'actual ordered map value arms'),ignored_arm:ignored},'default MapAccess key loop');
    const extractValues=fields.map(row=>emit(map,text=>text.startsWith('let #name = match'),{...shared,name:row.name,missing_expr:compiler.matchExpression(missingExpression(row),{role:'pinned Fragment::Match(Expr) comma'})},'default required field extraction'));
    const members=fields.map(row=>emit(map,text=>text.trim()==='#member : #name',{member:row.member,name:row.name},'actual default named field result member'));
    const result=emit(map,text=>text.startsWith('#struct_path {'),{struct_path:ident,result:seq(members,'actual field result order')},'default named struct result');
    return emit(map,text=>text.includes('#let_collect')&&text.includes('#collected_deny_unknown_fields'),{...shared,let_values:seq(letValues,'default field storage'),let_collect:none,match_keys:matchKeys,let_default:none,extract_values:seq(extractValues,'default required field extraction'),extract_collected:seq([],'no actual flattened fields'),collected_deny_unknown_fields:none,result},'default nonflatten map visitor body');
  };
  const normalSeq=()=>{
    const values=fields.map((row,index)=>{
      const func=emit(sequence,text=>text.trim()==='_serde :: de :: SeqAccess :: next_element :: < #field_ty >',{field_ty:row.type},'original next_element actual field Type');
      const visit=emit(sequence,text=>text.trim()==='#func ( & mut __seq ) ?',{func},'default next sequence element');
      return emit(sequence,text=>text.startsWith('let #var = match'),{...shared,var:row.name,visit,value_if_none:missingSequence(index,seqExpectation)},'default sequence binding with original missing error');
    });
    const result=emit(sequence,text=>text.startsWith('#type_path {'),{type_path:ident,names:seq(fields.map(row=>row.member),'actual original Member order'),vars:seq(fields.map(row=>row.name),'actual field variable order')},'default source named struct sequence result');
    return emit(sequence,text=>text.includes('#let_default')&&text.includes('#let_values'),{...shared,let_default:none,let_values:seq(values,'actual ordered sequence fields'),result},'default named struct sequence visitor body');
  };
  const mutSeq=emit(structure,text=>text.trim()===(fields.length?'mut __seq':'_'),{},'source-selected empty/nonempty sequence parameter');
  const visitSeq=emit(structure,text=>text.includes('fn visit_seq'),{...shared,mut_seq:mutSeq,delife,visit_seq:normalSeq()},'default sequence visitor method');
  const fieldsStmt=emit(structure,text=>text.includes('const FIELDS'),{field_names:seq(fields.map(row=>row.literal),'actual default aliases in source order')},'original default field names static table');
  const visitorExpr=emit(structure,text=>text.trim().startsWith('__Visitor {'),{...shared,this_type:ident,ty_generics:none},'original visitor expression');
  const dispatch=emit(structure,text=>text.includes('deserialize_struct'),{type_name:typeName,visitor_expr:visitorExpr},'original StructForm::Struct nonflatten dispatch');
  const normal=emit(structure,text=>text.includes('struct __Visitor #de_impl_generics'),{...shared,field_visitor:fieldVisitor,de_impl_generics:deGenerics,de_ty_generics:deGenerics,ty_generics:none,where_clause:none,this_type:ident,delife,expecting,visit_seq:visitSeq,visit_map:normalMap(),visitor_seed:none,fields_stmt:fieldsStmt,dispatch},'default named struct Deserialize visitor body');
  bindingProofs.push({binding:'field Type / Ident / Lifetime / literal aliases',category:'original syn::Type token grammar plus pinned generated Ident and Lifetime ToTokens',source:structure.source,sourceSha256:structure.sourceSha256,fields:input.fields.map(field=>({name:field.name,typeSpan:field.originalTypeSpan,typeSourceSha256:field.typeFragment.provenance.sourceSha256})),lifetime:"'de",implicitBorrowedLifetimes:[]});
  branchProofs.push({predicate:'deny_unknown_fields',value:deny,basis:'actual accepted container helper flag',source:fieldHelper.source,span:fieldHelper.span});
  return {normal,fieldVisitor,fields,shared,delife,deGenerics,none,expecting,typeName,mutSeq,missingExpression,missingSequence,seqExpectation,emit,seq,deny};
}

export function liftSerdeDeserializeInPlaceRoute({state,inventory,compiler,definition,select,inst,leaf,ident,branchProofs}){
  const {fields,shared,delife,none,expecting,typeName,fieldVisitor,mutSeq,missingExpression,missingSequence,seqExpectation,emit,seq,deny}=state;
  const enabled=definition('src/de.rs','deserialize_in_place_body',text=>text.includes('assert!(!params.has_getter)'));
  const disabled=definition('src/de.rs','deserialize_in_place_body',text=>text.includes('_params: &Parameters'));
  if(!disabled.text.includes('None')||!enabled.text.includes('.all(|f| f.attrs.deserialize_with().is_some())'))throw new TypeError('Pinned optional feature branch predicates changed');
  branchProofs.push({predicate:'Cargo feature deserialize_in_place',value:'both outcomes retained',source:enabled.source,enabledSpan:enabled.span,disabledSpan:disabled.span,basis:'dependency proof pins packages but does not establish complete Cargo feature union'});
  if(!fields.length){branchProofs.push({predicate:'all fields deserialize_with',value:true,basis:'actual empty iterator all is true; enabled helper returns None'});return none;}
  const structure=definition('src/de/struct_.rs','deserialize_in_place'),map=definition('src/de/struct_.rs','deserialize_map_in_place'),sequence=definition('src/de.rs','deserialize_seq_in_place');
  const place=leaf("'place",'lifetime','actual place_lifetime generated LifetimeParam');
  const generics=compiler.genericLifetimes([delife,place],{role:'actual InPlaceImplGenerics/InPlaceTypeGenerics nongeneric lifetime prepending'});
  const flags=fields.map(row=>emit(map,text=>text.startsWith('let mut #name : bool'),{name:row.name},'original inplace field flag'));
  const arms=fields.map(row=>{
    const visit=emit(map,text=>text.includes('next_value_seed')&&!text.includes('while'),{...shared,member:row.member},'default actual inplace field seed');
    return emit(map,text=>text.startsWith('__Field :: #name =>'),{...shared,name:row.name,deser_name:row.literal,visit},'original inplace duplicate guard and flag arm');
  });
  const ignored=deny?none:emit(map,text=>text.startsWith('_ =>')&&text.includes('IgnoredAny'),{},'default inplace unknown-field consume');
  const keys=emit(map,text=>text.startsWith('while let'),{...shared,value_arms_from:seq(arms,'original inplace field arms'),ignored_arm:ignored},'default inplace map key loop');
  const checks=fields.map(row=>emit(map,text=>text.includes('self . place . #member = #missing_expr'),{name:row.name,member:row.member,missing_expr:missingExpression(row)},'default inplace missing-field assignment'));
  const mapBody=emit(map,text=>text.includes('#let_flags')&&text.includes('#check_flags'),{...shared,let_flags:seq(flags,'original inplace flags'),match_keys:keys,let_default:none,check_flags:seq(checks,'original inplace missing-field checks')},'default inplace map visitor body');
  const writes=fields.map((row,index)=>emit(sequence,text=>text.includes('next_element_seed')&&!text.includes('#wrapper'),{...shared,member:row.member,value_if_none:missingSequence(index,seqExpectation)},'default inplace sequence field seed and missing error'));
  const seqBody=emit(sequence,text=>text.includes('#write_values'),{...shared,let_default:none,write_values:seq(writes,'original inplace sequence fields')},'default inplace sequence visitor body');
  const body=emit(structure,text=>text.includes('struct __Visitor #in_place_impl_generics'),{...shared,field_visitor:fieldVisitor,in_place_impl_generics:generics,in_place_ty_generics:generics,where_clause:none,place_life:place,this_type:ident,ty_generics:none,delife,expecting,mut_seq:mutSeq,visit_seq:seqBody,visit_map:mapBody,field_names:seq(fields.map(row=>row.literal),'actual default inplace aliases'),type_name:typeName},'default enabled inplace Deserialize body');
  return inst(select(inventory,enabled,text=>text.includes('fn deserialize_in_place')),{...shared,delife,stmts:body},'actual enabled Deserialize::deserialize_in_place method');
}
