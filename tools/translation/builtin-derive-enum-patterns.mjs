// Complete original enum-pattern construction recipes shared by source-only
// derive output consumers. These are syntax facts, never caller/layout grants.
import {createHash} from 'node:crypto';
import {originalAstFunction,originalAstDefinition,astStructLiteral,astSyntaxText,astFragmentText,astEnumVariant} from './builtin-derive-ast-meta.mjs';
import {createBuiltinAstBuilderMetaCompiler} from './builtin-ast-builder-meta.mjs';
const generic='compiler/rustc_builtin_macros/src/deriving/generic/mod.rs',build='compiler/rustc_expand/src/build.rs',parser='compiler/rustc_parse/src/parser/item.rs',schema='compiler/rustc_ast/src/ast.rs';
const plans=new WeakMap(),issued=new WeakMap(),hash=value=>createHash('sha256').update(value).digest('hex');
const freeze=(value,seen=new WeakSet())=>{if(value&&typeof value==='object'&&!seen.has(value)){seen.add(value);Object.values(value).forEach(child=>freeze(child,seen));Object.freeze(value);}return value;};
function contains(fragment,...pieces){const source=astFragmentText(fragment);for(const piece of pieces)if(!source.includes(piece))throw new TypeError('Original enum pattern source differs: '+piece);}
function field(recipe,name,expected){const actual=recipe.fields.find(row=>row.name===name);if(!actual||astSyntaxText(actual.expression)!==expected)throw new TypeError('Original enum PatField recipe differs: '+name);}
export function originalBuiltinEnumPatternSource(profile){
 if(plans.has(profile))return plans.get(profile);
 const compiler=createBuiltinAstBuilderMetaCompiler(profile),recipes=[],contracts=[],constructors={},builderRecipes={};
 const recipe=(path,name)=>{const value=originalAstFunction(profile,path,name);recipes.push(value);return value;};
 const enumeration=recipe(generic,'expand_enum_method_body'),patterns=recipe(generic,'create_struct_patterns'),fields=recipe(generic,'create_struct_pattern_fields'),ident=recipe(generic,'mk_pattern_ident'),intoExpr=recipe(generic,'into_expr');
 contains(enumeration,'iter::once("__self".to_string())','format!("__arg{arg_count}")','let fields = trait_.create_struct_pattern_fields','let by_ref = ByRef::No','cx.pat_tuple(span, subpats)','let substructure = EnumMatching(variant, fields)','cx.arm(span, single_pat, arm_expr)');
 contains(patterns,'struct_def.fields().iter().enumerate()','self.mk_pattern_ident(prefix, i)','PatKind::Ident(BindingMode(by_ref, Mutability::Not), path, None)','VariantData::Struct','cx.pat_struct(self.span, struct_path, field_pats)','VariantData::Tuple','cx.pat_tuple_struct(self.span, struct_path, subpats)','VariantData::Unit(..) => cx.pat_path');
 contains(fields,'self.create_fields(struct_def','self.mk_pattern_ident(prefix, i)','cx.expr_path(cx.path_ident(sp, ident))');contains(ident,'Ident::from_str_and_span(&format!("{prefix}_{i}"), self.span)');
 contains(intoExpr,'if self.0.is_empty()','Some(expr) => expr','cx.expr_block(self.into_block(cx, span))');
 const tuple=recipe(parser,'parse_tuple_struct_body'),variant=recipe(parser,'parse_enum_variant');
 contains(tuple,'let attrs = p.parse_outer_attributes()?','let lo = p.token.span','p.parse_visibility(FollowedByType::Yes)','p.parse_ty()','if p.token == token::Eq','span: lo.to(ty.span)','ident: None','UsePreAttrPos::No');
 contains(variant,'let variant_attrs = self.parse_outer_attributes()?','let vlo = this.token.span','this.parse_tuple_struct_body()','VariantData::Tuple(body, DUMMY_NODE_ID)','VariantData::Struct { fields, recovered }','VariantData::Unit(DUMMY_NODE_ID)');
 const patField=astStructLiteral(profile,patterns,'PatField');field(patField,'is_shorthand','false');field(patField,'attrs','ast :: AttrVec :: new ()');field(patField,'is_placeholder','false');field(patField,'pat','pat');
 // The existing original builder compiler resolves the actual imported
 // PatKind owner and typed argument slots. Do not infer it from a spelling.
 for(const [name,wanted,arity]of [['pat_path','Path',2],['pat_tuple_struct','TupleStruct',3],['pat_struct','Struct',4],['pat_tuple','Tuple',1],['pat_wild','Wild',0]]){
  const selected=recipe(build,name),contract=compiler.compile(name),found=[];builderRecipes[name]=selected;contracts.push(contract);
  function visit(value){if(!value||typeof value!=='object')return;if(value.tag==='positive-ast-enum-constructor'&&value.owner==='PatKind')found.push(value);for(const child of Object.values(value))if(child&&typeof child==='object')visit(child);}
  visit(contract.result);if(found.length!==1||found[0].variantSchema.name!==wanted||found[0].variantSchema.arity!==arity)throw new TypeError('Original enum builder constructor remains unresolved: '+name);
  const value=found[0];constructors[name]={source:value.source,sourceSha256:value.sourceSha256,span:value.span,variant:value.variantSchema,args:value.args,recipeDigest:contract.recipe.digest,import:value.import};
 }
 contains(builderRecipes.pat_tuple_struct,'PatKind::TupleStruct(None, path, subpats)');contains(builderRecipes.pat_struct,'PatKind::Struct(None, path, field_pats, ast::PatFieldsRest::None)');
 const definition=originalAstDefinition(profile,schema,'enum','PatKind'),positiveSchemas=[['Path',2],['TupleStruct',3],['Struct',4],['Tuple',1],['Wild',0],['Ident',3]].map(([name,arity])=>{const value=astEnumVariant(profile,definition,name);if(value.arity!==arity)throw new TypeError('Original enum pattern schema differs: '+name);return value;});
 const evidence={schema:'original-builtin-enum-pattern-source-v1',profileDigest:profile.digest,generic:{enumeration,patterns,fields,ident,intoExpr},parser:{tuple,variant},recipes,compilerMeta:contracts,constructors,builderRecipes,positiveSchemas,schemas:[definition,originalAstDefinition(profile,schema,'struct','PatField')],sourceControls:{binder:'actual mk_pattern_ident(prefix,index)',bindingMode:{byRef:'No',mutability:'Not'},fieldSpans:'original FieldDef with trait ctxt; original name/type/variant spans retained separately'},namespaceAuthority:false,generatedImplBehavior:false};
 const plan=freeze({...evidence,digest:hash(JSON.stringify(evidence))});issued.set(plan,profile);plans.set(profile,plan);return plan;
}
export function requireOriginalBuiltinEnumPatternSource(plan,profile){if(!issued.has(plan)||issued.get(plan)!==profile)throw new TypeError('Original enum pattern source requires its genuine profile and plan');return plan;}
