// Complete original Copy output syntax only; no caller/owner/scope authority.
// Shared with the original owned proof so its positive grammar never forks.
import {originalAstFunction,originalAstDefinition,astStructLiteral,astSyntaxText,astFragmentText} from './builtin-derive-ast-meta.mjs';
const directory='compiler/rustc_builtin_macros/src/deriving/';
export function originalBuiltinCopyOutputSyntax(state){
  const {profile,original,entry}=state,descriptor=astStructLiteral(profile,entry,'TraitDef');
  const field=name=>descriptor.fields.find(field=>field.name===name);
  for(const name of ['methods','associated_types','additional_bounds'])if(astSyntaxText(field(name)?.expression??[])!=='Vec :: new ()')throw new TypeError('Builtin Copy list is not the original empty Vec construction: '+name);
  const emptyVec=originalAstFunction(profile,'library/alloc/src/vec/mod.rs','new'),vecRecipe=astStructLiteral(profile,emptyVec,'Vec');
  if(astSyntaxText(vecRecipe.fields.find(field=>field.name==='len')?.expression??[])!=='0')throw new TypeError('Pinned standard Vec empty constructor changed');
  if(astSyntaxText(field('needs_copy_as_bound_if_packed')?.expression??[])!=='false')throw new TypeError('Builtin Copy packed-bound selection changed');
  if(astSyntaxText(field('path')?.expression??[])!=='path_std ! (marker :: Copy)')throw new TypeError('Builtin Copy trait path source recipe changed');
  const genericPath=directory+'generic/mod.rs';
  const expand=originalAstFunction(profile,genericPath,'expand_ext'),structure=originalAstFunction(profile,genericPath,'expand_struct_def'),enumeration=originalAstFunction(profile,genericPath,'expand_enum_def'),sink=originalAstFunction(profile,genericPath,'create_derived_impl');
  const parameters=originalAstFunction(profile,genericPath,'find_type_parameters');
  if(!astFragmentText(parameters).includes('self.ty_param_names.contains(&segment.ident.name)'))throw new TypeError('Original field generic-parameter selection changed');
  const typePath=originalAstFunction(profile,directory+'generic/ty.rs','to_path','let mut idents = self.path.iter()'),pathBuilder=originalAstFunction(profile,'compiler/rustc_expand/src/build.rs','path_all'),typeBuilder=originalAstFunction(profile,'compiler/rustc_expand/src/build.rs','ty_path'),traitBuilder=originalAstFunction(profile,'compiler/rustc_expand/src/build.rs','trait_ref');
  if(!astFragmentText(typeBuilder).includes('ast::TyKind::Path(None, path)'))throw new TypeError('Original positive Path type constructor changed');
  const implementation=astStructLiteral(profile,sink,'Impl'),items=implementation.fields.find(field=>field.name==='items');
  if(astSyntaxText(items?.expression??[])!=='methods . into_iter () . chain (associated_types) . collect ()')throw new TypeError('Original Impl associated-list flow changed');
  for(const recipe of [structure,enumeration])if(!/self\s*\.\s*methods\s*\.\s*iter\s*\(\)/u.test(astFragmentText(recipe)))throw new TypeError('Original method iterator flow changed');
  const sinkSource=astFragmentText(sink);
  if(!sinkSource.includes('ast::ItemKind::Impl(Box::new(ast::Impl {')||!/generics\s*\.\s*params/u.test(sinkSource)||!sinkSource.includes('self.associated_types.iter()'))throw new TypeError('Original typed Impl sink/generic flow changed');
  const itemBuilder=originalAstFunction(profile,'compiler/rustc_expand/src/build.rs','item'),itemRecipe=astStructLiteral(profile,itemBuilder,'Item');
  if(astSyntaxText(itemRecipe.fields.find(field=>field.name==='kind')?.expression??[])!=='kind'||astSyntaxText(itemRecipe.fields.find(field=>field.name==='tokens')?.expression??[])!=='None')throw new TypeError('Original typed Item wrapper changed');
  const schema=originalAstDefinition(profile,'compiler/rustc_ast/src/ast.rs','enum','ItemKind'),implSchema=originalAstDefinition(profile,'compiler/rustc_ast/src/ast.rs','struct','Impl');
  if(!astFragmentText(schema).includes('Impl(Box<Impl>)')||!astFragmentText(implSchema).includes('ThinVec<P<AssocItem>>'))throw new TypeError('Pinned positive Impl/associated-item schema changed');
  if(!astFragmentText(expand).includes('push(Annotatable::Item(P(ast::Item { attrs, ..(*newitem).clone() })))'))throw new TypeError('Original final Item push changed');
  return {descriptor,field,emptyVec,expand,structure,enumeration,sink,itemBuilder,parameters,typePath,pathBuilder,typeBuilder,traitBuilder,implementation,schema,implSchema};
}
