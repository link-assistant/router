// Source-selected Eq callback bridge. These are original construction recipes
// and typed source leaves; no generated implementation bodies are synthesized.
import {createHash} from 'node:crypto';
import {originalMacroTrees} from './macro-token-trees.mjs';
import {boundedInput} from './serde-bang-footprints.mjs';
import {inventoryDeriveQuoteMeta,createQuoteFragmentCompiler} from './derive-quote-meta.mjs';
import {originalAstFunction,originalAstDefinition,astStructLiteral,astSyntaxText,astFragmentText,astEnumVariant} from './builtin-derive-ast-meta.mjs';
const generic='compiler/rustc_builtin_macros/src/deriving/generic/mod.rs';
const build='compiler/rustc_expand/src/build.rs',schema='compiler/rustc_ast/src/ast.rs';
const hash=value=>createHash('sha256').update(value).digest('hex');
const inventories=new WeakMap();
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
const member=(recipe,name)=>recipe.fields.find(field=>field.name===name);
function field(recipe,name,expected){
  const actual=member(recipe,name);if(!actual||astSyntaxText(actual.expression)!==expected)throw new TypeError('Original Eq AST field flow changed: '+recipe.name+'.'+name);return actual;
}
function contains(fragment,...needles){const text=astFragmentText(fragment);for(const needle of needles)if(!text.includes(needle))throw new TypeError('Original Eq AST recipe flow changed: '+fragment.source+' '+needle);}
function sourceLeaves(original,certificate){
  const source=original.module.source.slice(certificate.span.start,certificate.span.end);
  // This utility checks actual headers/fields. The owner is checked by the
  // enclosing private builtin invocation, independent of Serde ownership.
  const input=boundedInput(certificate,source,null);
  // Nested attributes could conditionally change the original field set or
  // expand it before this callback. Retain that obligation instead of guessing.
  function nested(nodes,depth=0){for(let at=0;at<nodes.length;at++){
    if(depth&&nodes[at].text==='#'){
      const attribute=nodes[at+1];if(attribute?.kind!=='group'||attribute.delimiter!=='['||attribute.children[0]?.text!=='doc')throw new TypeError('Eq source field/variant attribute expansion remains unproved');
      at++;continue;
    }
    if(nodes[at].kind==='group')nested(nodes[at].children,depth+1);
  }}
  nested(originalMacroTrees(source));
  let inventory=inventories.get(original.dependencies);if(!inventory){inventory=inventoryDeriveQuoteMeta(original.dependencies);inventories.set(original.dependencies,inventory);}
  const compiler=createQuoteFragmentCompiler(inventory);
  const fields=(input.fields??[]).map(value=>{
    const span={start:certificate.span.start+value.typeSpan.start,end:certificate.span.start+value.typeSpan.end};
    const typeSource=original.module.source.slice(span.start,span.end);
    const typed=compiler.roundTrip(compiler.sourceType(typeSource,{source:certificate.source,sourceSha256:certificate.sourceSha256,span,field:value.name,owner:'original Eq field Ty clone'}));
    return {name:value.name,span,sourceSha256:hash(typeSource),syntaxSha256:hash(JSON.stringify(typed.syntax)),category:typed.provenance.category,syntax:typed.syntax,semanticSyntaxRoundTrip:typed.provenance.semanticRoundTrip===true};
  });
  // The actual simple-name dedup branch may omit statements; both branches
  // preserve the same checked type-only statement kind, without enumeration.
  return {inputStyle:input.style,fields,variants:input.variants,assertionCount:{minimum:fields.length?1:0,maximum:fields.length},deduplication:'actual is_simple_path/seen_type_names branch; both preserve LocalKind::Decl'};
}
export function liftBuiltinEqAstRoute({profile,original,certificate,entry}={}){
  const descriptor=astStructLiteral(profile,entry,'TraitDef'),method=astStructLiteral(profile,entry,'MethodDef');
  field(descriptor,'path','path_std ! (cmp :: Eq)');
  const methods=member(descriptor,'methods')?.expression;
  if(methods?.length!==3||methods[0].text!=='vec'||methods[1].text!=='!'||methods[2].delimiter!=='['||![2,3].includes(methods[2].children.length)||methods[2].children.length===3&&methods[2].children[2].text!==','||methods[2].children[0].text!=='MethodDef'||methods[2].children[1].span.start!==method.span.start)throw new TypeError('Original Eq requires exactly its one MethodDef source literal');
  field(descriptor,'additional_bounds','Vec :: new ()');field(descriptor,'associated_types','Vec :: new ()');
  field(method,'generics','Bounds :: empty ()');field(method,'explicit_self','true');field(method,'nonself_args','vec ! []');field(method,'ret_ty','Unit');
  field(method,'name','sym :: assert_receiver_is_total_eq');
  contains(entry,'trait_def.expand_ext(cx, mitem, item, push, true)','cs_total_eq_assert(a, b, c)','cx.with_def_site_ctxt(span)');
  const recipe=(path,name,selector=null)=>originalAstFunction(profile,path,name,selector);
  const callback=recipe('compiler/rustc_builtin_macros/src/deriving/cmp/eq.rs','cs_total_eq_assert');
  contains(callback,'StaticStruct(vdata, ..)','StaticEnum(enum_def, ..)','process_variant(&variant.data)','field.ty.clone()','&[sym::cmp, sym::AssertParamIsEq]','BlockOrExpr::new_stmts(stmts)','!seen_type_names.insert(name)');
  const assertion=recipe('compiler/rustc_builtin_macros/src/deriving/mod.rs','assert_ty_bounds');
  contains(assertion,'cx.with_def_site_ctxt(span)','vec![GenericArg::Type(ty)]','stmts.push(cx.stmt_let_type_only(span, cx.ty_path(assert_path)))');
  const localBuilder=recipe(build,'stmt_let_type_only'),local=astStructLiteral(profile,localBuilder,'Local');
  field(local,'kind','LocalKind :: Decl');field(local,'ty','Some (ty)');field(local,'pat','self . pat_wild (span)');field(local,'attrs','AttrVec :: new ()');field(local,'tokens','None');
  const stmtBuilder=recipe(build,'stmt_local'),statement=astStructLiteral(profile,stmtBuilder,'Stmt');field(statement,'kind','ast :: StmtKind :: Let (local)');
  const stmts=recipe(generic,'new_stmts'),blockBridge=recipe(generic,'into_block'),blockBuilder=recipe(build,'block');
  contains(stmts,'BlockOrExpr(stmts, None)');contains(blockBridge,'if let Some(expr) = self.1','cx.block(span, self.0)');
  const block=astStructLiteral(profile,blockBuilder,'Block');field(block,'stmts','stmts');field(block,'tokens','None');
  const createMethod=recipe(generic,'create_method'),assoc=astStructLiteral(profile,createMethod,'AssocItem'),fn=astStructLiteral(profile,createMethod,'Fn');
  field(assoc,'attrs','self . attributes . clone ()');field(assoc,'tokens','None');
  field(fn,'body','Some (body_block)');field(fn,'contract','None');field(fn,'define_opaque','None');field(fn,'ident','method_ident');field(fn,'generics','fn_generics');
  contains(createMethod,'ast::AssocItemKind::Fn(Box::new(ast::Fn {','let body_block = body.into_block(cx, span)','ast::FnRetTy::Ty(ret_type)','Ident::new(self.name, span)');
  const tyPath='compiler/rustc_builtin_macros/src/deriving/generic/ty.rs';
  const emptyBounds=recipe(tyPath,'empty'),bounds=astStructLiteral(profile,emptyBounds,'Bounds');field(bounds,'bounds','Vec :: new ()');
  const emptyVec=recipe('library/alloc/src/vec/mod.rs','new');field(astStructLiteral(profile,emptyVec,'Vec'),'len','0');
  const generics=recipe(tyPath,'to_generics'),ret=recipe(tyPath,'to_ty','Unit =>'),explicitSelf=recipe(tyPath,'get_explicit_self');
  contains(generics,'self','ThinVec::new()');contains(ret,'Unit =>','ast::TyKind::Tup(ThinVec::new())');contains(explicitSelf,'SelfKind::Region(None, ast::Mutability::Not)');
  const structure=recipe(generic,'expand_struct_def'),enumeration=recipe(generic,'expand_enum_def'),staticStruct=recipe(generic,'expand_static_struct_method_body'),staticEnum=recipe(generic,'expand_static_enum_method_body'),dispatch=recipe(generic,'call_substructure_method');
  contains(structure,'from_scratch || method_def.is_static()','expand_static_struct_method_body','method_def.create_method(');
  contains(enumeration,'from_scratch || method_def.is_static()','expand_static_enum_method_body','method_def.create_method(');
  contains(staticStruct,'&StaticStruct(struct_def, summary)');contains(staticEnum,'&StaticEnum(enum_def)');contains(dispatch,'f(cx, span, &substructure)');
  const sink=recipe(generic,'create_derived_impl'),implementation=astStructLiteral(profile,sink,'Impl');
  field(implementation,'items','methods . into_iter () . chain (associated_types) . collect ()');
  const expand=recipe(generic,'expand_ext'),itemBuilder=recipe(build,'item');
  const item=astStructLiteral(profile,itemBuilder,'Item');field(item,'kind','kind');field(item,'tokens','None');
  contains(sink,'ast::ItemKind::Impl(Box::new(ast::Impl {','self.associated_types.iter()');contains(expand,'push(Annotatable::Item(P(ast::Item { attrs, ..(*newitem).clone() })))');
  const parameters=recipe(generic,'find_type_parameters');contains(parameters,'self.ty_param_names.contains(&segment.ident.name)');
  const receiver=recipe(schema,'from_self');contains(receiver,'TyKind::ImplicitSelf','SelfKind::Region(lt, mutbl)','TyKind::Ref(lt, MutTy { ty: infer_ty, mutbl })');
  const builders=[receiver,recipe(build,'path_all'),recipe(build,'ty_path'),recipe(build,'pat_wild'),recipe(build,'fn_decl'),recipe(generic,'get_ret_ty'),recipe(generic,'extract_arg_details')];
  const schemas=[['enum','ItemKind'],['struct','Impl'],['enum','AssocItemKind'],['struct','Fn'],['struct','FnSig'],['struct','FnDecl'],['struct','Block'],['enum','StmtKind'],['struct','Local'],['enum','LocalKind'],['enum','TyKind']].map(([kind,name])=>originalAstDefinition(profile,schema,kind,name));
  const positiveVariants=[['ItemKind','Impl',1],['AssocItemKind','Fn',1],['StmtKind','Let',1],['LocalKind','Decl',0],['TyKind','Path',2],['TyKind','Tup',1],['TyKind','Ref',2]].map(([owner,name,arity])=>{
    const definition=schemas.find(value=>value.syntax.some(node=>node.text===owner)),variant=astEnumVariant(profile,definition,name);if(variant.arity!==arity)throw new TypeError('Original Eq AST positive constructor arity changed: '+owner+'::'+name);return {owner,...variant};
  });
  const input=sourceLeaves(original,certificate);
  const evidence={schema:'original-eq-type-only-method-bridge-v1',profileDigest:profile.digest,descriptor,method,recipes:[entry,callback,assertion,localBuilder,stmtBuilder,stmts,blockBridge,blockBuilder,createMethod,emptyBounds,emptyVec,generics,ret,explicitSelf,structure,enumeration,staticStruct,staticEnum,dispatch,sink,expand,itemBuilder,parameters,...builders],positiveSchemas:schemas,positiveVariants,typedSource:input,constructionFlow:{sourceCallback:callback.digest,fieldType:'actual field.ty clone in original assertion Type argument',statement:{constructor:localBuilder.digest,kind:'LocalKind::Decl',initializerCount:0,wrapper:'StmtKind::Let'},block:{bridge:blockBridge.digest,optionalExpression:'None from original new_stmts',constructor:blockBuilder.digest},associatedItem:{constructor:createMethod.digest,kind:'AssocItemKind::Fn',methods:1,genericBounds:0,nonselfArguments:0,returnKind:'TyKind::Tup empty'},implementation:{constructor:sink.digest,kind:'ItemKind::Impl',associatedTypes:0},hygiene:'original with_def_site_ctxt and original self/field Ty spans retained',constantBranches:['Const::Yes','Const::No'],fieldlessAndDedupBranches:'all preserve the identical closed type-only statement category'},generatedImplBehavior:false};
  return freeze({...evidence,digest:hash(JSON.stringify(evidence))});
}
