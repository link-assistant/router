// Default named-field Serialize branch, lifted from original quote templates.
// This is namespace grammar evidence, not a runtime Serialize implementation.
export function liftSerdeNamedStructRoute({inventory,compiler,input,sourceOffset,definition,select,inst,leaf,empty,typeName,privateIdent,bindingProofs,branchProofs}){
  const dispatch=definition('src/ser.rs','serialize_struct'),structure=definition('src/ser.rs','serialize_struct_as_struct');
  const visitor=definition('src/ser.rs','serialize_struct_visitor'),member=definition('src/ser.rs','get_member');
  const tag=definition('src/ser.rs','serialize_struct_tag_field'),mutability=definition('src/ser.rs','mut_if');
  if(!dispatch.text.includes('if has_non_skipped_flatten')||!visitor.text.includes('field.attrs.serialize_with()')||!member.text.includes('(false, None)'))throw new TypeError('Pinned named-field dispatch has changed');
  branchProofs.push({predicate:'!flatten && !skip_serializing && !skip_serializing_if && !serialize_with && !remote && !packed && tag=External',value:true,source:dispatch.source,span:dispatch.span,basis:'actual default/rename-only original named fields; no repr or custom helpers'});
  const first=member.text.indexOf('(false, None)'),end=member.text.indexOf('(true, None)',first);
  if(first<0||end<0)throw new TypeError('Default nonremote member branch is not source-bounded');
  const nonremote={...member,span:{start:member.span.start+first,end:member.span.start+end}};
  const memberTemplate=select(inventory,nonremote,text=>text.trim()==='& #self_var . #member');
  const fieldTemplate=select(inventory,visitor,text=>text.trim()==='#func (& mut __serde_state , #key_expr , #field_expr) ? ;');
  const fieldFunction=definition('src/ser.rs','serialize_field');
  if(!fieldFunction.text.includes('StructTrait::SerializeStruct =>'))throw new TypeError('Original SerializeStruct field trait branch changed');
  const func=inst(select(inventory,fieldFunction,text=>text.trim()==='_serde :: ser :: SerializeStruct :: serialize_field'),{},'actual StructTrait::SerializeStruct.serialize_field method branch');
  const fields=input.fields.map(field=>{
    const fieldMember=leaf(field.name,'ident','original syn::Member::Named');
    const value=inst(memberTemplate,{self_var:leaf('self','ident','nonremote Parameters.self_var'),member:fieldMember},'nonpacked shared field expression');
    return inst(fieldTemplate,{func,key_expr:leaf(JSON.stringify(field.name),'string','field Name::to_tokens literal category'),field_expr:value,private:privateIdent},'default source-ordered serialize field statement');
  });
  const noTag=inst(select(inventory,tag,text=>text.trim()===''),{},'original no-internal-tag branch');
  const initial=select(inventory,structure,text=>text.trim()==='#tag_field_exists as usize');
  const one=select(inventory,structure,text=>text.trim()==='1');
  const plus=select(inventory,structure,text=>text.trim()==='#sum + #expr');
  let len=inst(initial,{tag_field_exists:leaf('false','ident','no generated tag field')},'original length-fold initial expression');
  for(const field of input.fields)len=inst(plus,{sum:len,expr:inst(one,{},'one actual non-skipped field')},'original source-ordered field length fold');
  const mutTemplate=select(inventory,mutability,text=>text.trim()==='mut');
  const letMut=input.fields.length?inst(mutTemplate,{},'nonempty original peekable field iterator'):empty('original empty iterator None mut_if branch');
  const output=select(inventory,structure,text=>text.includes('let #let_mut __serde_state')&&text.includes('SerializeStruct :: end'));
  const originalSpan=span=>({start:span.start+sourceOffset,end:span.end+sourceOffset});
  bindingProofs.push({binding:'Member::Named',category:'original field Ident; nonremote get_member uses &self.member',source:member.source,sourceSha256:member.sourceSha256,span:nonremote.span,fields:input.fields.map(field=>({name:field.name,span:originalSpan(field.span),typeSpan:originalSpan(field.typeSpan)}))});
  bindingProofs.push({binding:'serialize_fields',category:'source-ordered Vec<TokenStream>; direct default field quotes only',source:visitor.source,sourceSha256:visitor.sourceSha256,span:visitor.span});
  return inst(output,{let_mut:letMut,type_name:typeName,len,tag_field:noTag,serialize_fields:compiler.sequence(fields,{role:'actual fields.iter() order',fieldSpans:input.fields.map(field=>field.span)})},'default named struct serializer block');
}
