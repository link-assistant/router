// Original Clone callbacks -> a positive, recursively closed AST grammar.
// This confines generated syntax; it does not execute Clone or certify Copy.
import {createHash} from 'node:crypto';
import {types} from 'node:util';
import {builtinDeriveDataInputs,builtinPayloadDataInputs} from './builtin-derive-data-inputs.mjs';
import {originalBuiltinEnumPatternSource,requireOriginalBuiltinEnumPatternSource} from './builtin-derive-enum-patterns.mjs';
import {inventoryDeriveQuoteMeta,createQuoteFragmentCompiler} from './derive-quote-meta.mjs';
import {originalAstFunction,originalAstDefinition,astStructLiteral,astSyntaxText,astFragmentText,astEnumVariant,originalAstPositiveConstructors} from './builtin-derive-ast-meta.mjs';
import {createBuiltinAstBuilderMetaCompiler} from './builtin-ast-builder-meta.mjs';
import {createCompletedDataFreezer} from './private-data-freeze.mjs';
const directory='compiler/rustc_builtin_macros/src/deriving/',generic=directory+'generic/mod.rs',build='compiler/rustc_expand/src/build.rs',schema='compiler/rustc_ast/src/ast.rs';
const hash=value=>createHash('sha256').update(value).digest('hex');
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
const freezeCompleted=createCompletedDataFreezer(freeze);
const plans=new WeakMap(),outputs=new WeakMap(),inventories=new WeakMap();
const member=(recipe,name)=>recipe.fields.find(value=>value.name===name);
function field(recipe,name,expected){const actual=member(recipe,name);if(!actual||astSyntaxText(actual.expression)!==expected)throw new TypeError('Original Clone AST slot changed: '+recipe.name+'.'+name);return actual;}
function contains(recipe,...needles){const text=astFragmentText(recipe);for(const needle of needles)if(!text.includes(needle))throw new TypeError('Original Clone AST source flow changed: '+needle);}
function sourcePlan(profile,entry){
 if(plans.has(profile)){const state=plans.get(profile);if(state.entry!==entry)throw new TypeError('Original Clone entry differs from its sealed profile');return state;}
 const recipes=[],byName=new Map(),compiler=createBuiltinAstBuilderMetaCompiler(profile),compileMeta=[];
 const recipe=(path,name,selector=null)=>{const value=originalAstFunction(profile,path,name,selector);recipes.push(value);byName.set(path+'::'+name,value);return value;};
 const actualEntry=recipe(directory+'clone.rs','expand_deriving_clone');if(actualEntry!==entry)throw new TypeError('Original Clone entry requires its privately pinned AST fragment');
 const descriptor=astStructLiteral(profile,entry,'TraitDef'),method=astStructLiteral(profile,entry,'MethodDef');
 field(descriptor,'path','path_std ! (clone :: Clone)');field(descriptor,'associated_types','Vec :: new ()');field(descriptor,'additional_bounds','bounds');
 field(method,'name','sym :: clone');field(method,'generics','Bounds :: empty ()');field(method,'explicit_self','true');field(method,'nonself_args','Vec :: new ()');field(method,'ret_ty','Self_');field(method,'attributes','thin_vec ! [cx . attr_word (sym :: inline , span)]');field(method,'fieldless_variants_strategy','FieldlessVariantsStrategy :: Default');
 const methods=member(descriptor,'methods')?.expression;if(methods?.length!==3||methods[0].text!=='vec'||methods[1].text!=='!'||methods[2].delimiter!=='['||methods[2].children.length!==2||methods[2].children[0].text!=='MethodDef'||methods[2].children[1].span.start!==method.span.start)throw new TypeError('Original Clone must have its one source MethodDef');
 contains(entry,'cx.resolver.has_derive_copy(container_id)','is_simple = true','is_simple = false','cs_clone_simple("Clone", c, s, sub, false)','cs_clone("Clone", c, s, sub)','trait_def.expand_ext(cx, mitem, item, push, is_simple)');
 const simple=recipe(directory+'clone.rs','cs_clone_simple'),full=recipe(directory+'clone.rs','cs_clone');
 contains(simple,'StaticStruct(vdata, ..)','StaticEnum(enum_def, ..)','process_variant(&variant.data)','field.ty.kind.is_simple_path()','!seen_type_names.insert(name)','field.ty.clone()','field.span','&[sym::clone, sym::AssertParamIsClone]','BlockOrExpr::new_mixed(stmts, Some(cx.expr_deref(trait_span, cx.expr_self(trait_span))))');
 contains(full,'Struct(vdata_, af)','EnumMatching(.., variant, af)','let args = thin_vec![field.self_expr.clone()]','cx.expr_call_global(field.span, fn_path.clone(), args)','cx.std_path(&[sym::clone, sym::Clone, sym::clone])','cx.field_imm(field.span, ident, call)','cx.expr_struct(trait_span, ctor_path, fields)','VariantData::Unit(..) => cx.expr_path(ctor_path)','BlockOrExpr::new_expr(expr)');
 const assertion=recipe(directory+'mod.rs','assert_ty_bounds');contains(assertion,'cx.with_def_site_ctxt(span)','vec![GenericArg::Type(ty)]','cx.stmt_let_type_only(span, cx.ty_path(assert_path))');
 const selected=['expand_ext','expand_struct_def','expand_enum_def','expand_struct_method_body','expand_static_struct_method_body','expand_enum_method_body','expand_static_enum_method_body','create_struct_patterns','create_struct_pattern_fields','create_struct_field_access_fields','create_fields','extract_arg_details','get_ret_ty','call_substructure_method','create_method','create_derived_impl','new_expr','new_mixed','into_expr','into_block','find_type_parameters'];
 for(const name of selected)recipe(generic,name);
 const get=name=>byName.get(generic+'::'+name);
 contains(get('expand_struct_def'),'from_scratch || method_def.is_static()','expand_static_struct_method_body','method_def.create_method(');contains(get('expand_enum_def'),'from_scratch || method_def.is_static()','expand_static_enum_method_body','method_def.create_method(');
 contains(get('create_struct_field_access_fields'),'ast::ExprKind::Field(','selflike_arg.clone()','struct_field.ident.unwrap_or_else','if is_packed','cx.expr_addr_of(sp, field_expr)');
 contains(get('create_fields'),'struct_field.span.with_ctxt(self.span.ctxt())','let self_expr = exprs.remove(0)','name: struct_field.ident');
 const enumeration=get('expand_enum_method_body');contains(enumeration,'self.fieldless_variants_strategy == FieldlessVariantsStrategy::Unify','FieldlessVariantsStrategy::Default => ()','else if let [variant] = variants.as_slice()','&EnumMatching(variant, Vec::new())','selflike_args.len() == 1','cx.arm(span, single_pat, arm_expr)','_ if variants.len() > 1 && selflike_args.len() > 1','_ => None','BlockOrExpr(ThinVec::new(), Some(get_match_expr(selflike_args)))');
 contains(get('create_struct_patterns'),'VariantData::Unit(..) => cx.pat_path(self.span, struct_path)');contains(get('create_struct_pattern_fields'),'self.create_fields(struct_def');
 contains(get('new_expr'),'BlockOrExpr(ThinVec::new(), Some(expr))');contains(get('new_mixed'),'BlockOrExpr(stmts, expr)');contains(get('into_expr'),'if self.0.is_empty()','Some(expr) => expr');contains(get('into_block'),'self.0.push(cx.stmt_expr(expr))','cx.block(span, self.0)');
 const createMethod=get('create_method'),fn=astStructLiteral(profile,createMethod,'Fn'),assoc=astStructLiteral(profile,createMethod,'AssocItem');field(fn,'body','Some (body_block)');field(fn,'contract','None');field(fn,'define_opaque','None');field(assoc,'tokens','None');field(assoc,'attrs','self . attributes . clone ()');
 contains(createMethod,'ast::AssocItemKind::Fn(Box::new(ast::Fn {','ast::Param::from_self(ast::AttrVec::default(), explicit_self, ident)','self_arg.into_iter().chain(nonself_args).collect()','let body_block = body.into_block(cx, span)','ast::FnRetTy::Ty(ret_type)');
 const sink=get('create_derived_impl'),implementation=astStructLiteral(profile,sink,'Impl');field(implementation,'items','methods . into_iter () . chain (associated_types) . collect ()');contains(sink,'ast::ItemKind::Impl(Box::new(ast::Impl {','self.associated_types.iter()','sym::automatically_derived');contains(get('expand_ext'),'push(Annotatable::Item(P(ast::Item { attrs, ..(*newitem).clone() })))');contains(get('find_type_parameters'),'self.ty_param_names.contains(&segment.ident.name)');
 const tyPath=directory+'generic/ty.rs';const explicitSelf=recipe(tyPath,'get_explicit_self');contains(explicitSelf,'SelfKind::Region(None, ast::Mutability::Not)','let self_path = cx.expr_self(span)');recipe(tyPath,'empty');recipe(tyPath,'to_generics');recipe(tyPath,'to_ty','Self_ =>');
 const fromSelf=recipe(schema,'from_self');contains(fromSelf,'TyKind::ImplicitSelf','TyKind::Ref(lt, MutTy { ty: infer_ty, mutbl })');
 const param=astStructLiteral(profile,fromSelf,'Param'),selfPat=astStructLiteral(profile,fromSelf,'Pat');field(param,'attrs','attrs');field(param,'is_placeholder','false');field(selfPat,'tokens','None');field(selfPat,'kind','PatKind :: Ident (BindingMode (ByRef :: No , mutbl) , eself_ident , None)');
 const fnHeader=recipe(schema,'default','fn default() -> FnHeader'),header=astStructLiteral(profile,fnHeader,'FnHeader');field(header,'safety','Safety :: Default');field(header,'coroutine_kind','None');field(header,'constness','Const :: No');field(header,'ext','Extern :: None');
 const parser='compiler/rustc_parse/src/parser/item.rs',parseField=recipe(parser,'parse_field_def'),parseSingle=recipe(parser,'parse_single_struct_field'),parseType=recipe(parser,'parse_name_and_ty');
 contains(parseField,'self.parse_outer_attributes()?','let lo = this.token.span','this.parse_visibility','UsePreAttrPos::No');const parserText=astFragmentText(parseField);if(!(parserText.indexOf('self.parse_outer_attributes()?')<parserText.indexOf('let lo = this.token.span')&&parserText.indexOf('let lo = this.token.span')<parserText.indexOf('this.parse_visibility')))throw new TypeError('Original Clone field span parser order changed');
 contains(parseSingle,'self.parse_name_and_ty','token::Comma');contains(parseType,'let ty = self.parse_ty()?','lo.to(self.prev_token.span)');
 const builderNames=['expr','expr_path','expr_ident','expr_self','expr_call','expr_call_global','expr_addr_of','expr_deref','expr_struct','field_imm','pat','pat_path','pat_wild','arm','expr_match','block','stmt_expr','stmt_local','stmt_let_type_only','path','path_global','path_all','path_ident','ty_path','fn_decl','item'];
 for(const name of builderNames){const value=recipe(build,name);try{compileMeta.push(compiler.compile(name));}catch(error){compileMeta.push({recipeDigest:value.digest,sourceMetaRefusal:error.message,selectedOwnerBangComplete:false});}}
 const builder=name=>byName.get(build+'::'+name);
 const expr=astStructLiteral(profile,builder('expr'),'Expr');field(expr,'kind','kind');field(expr,'attrs','AttrVec :: new ()');field(expr,'tokens','None');
 const expressionField=astStructLiteral(profile,builder('field_imm'),'ExprField');field(expressionField,'expr','e');field(expressionField,'attrs','AttrVec :: new ()');field(expressionField,'is_placeholder','false');field(expressionField,'is_shorthand','false');
 const structExpr=astStructLiteral(profile,builder('expr_struct'),'StructExpr');field(structExpr,'qself','None');field(structExpr,'rest','ast :: StructRest :: None');field(structExpr,'fields','fields');
 const arm=astStructLiteral(profile,builder('arm'),'Arm');field(arm,'attrs','AttrVec :: new ()');field(arm,'guard','None');field(arm,'body','Some (expr)');field(arm,'is_placeholder','false');
 const pat=astStructLiteral(profile,builder('pat'),'Pat');field(pat,'kind','kind');field(pat,'tokens','None');
 const local=astStructLiteral(profile,builder('stmt_let_type_only'),'Local');field(local,'kind','LocalKind :: Decl');field(local,'ty','Some (ty)');field(local,'pat','self . pat_wild (span)');field(local,'attrs','AttrVec :: new ()');field(local,'tokens','None');
 const block=astStructLiteral(profile,builder('block'),'Block');field(block,'stmts','stmts');field(block,'tokens','None');
 field(astStructLiteral(profile,builder('stmt_expr'),'Stmt'),'kind','ast :: StmtKind :: Expr (expr)');field(astStructLiteral(profile,builder('stmt_local'),'Stmt'),'kind','ast :: StmtKind :: Let (local)');field(astStructLiteral(profile,builder('item'),'Item'),'tokens','None');
 const positive=new Map();for(const [name,owner]of [['expr_path','ExprKind'],['expr_call','ExprKind'],['expr_addr_of','ExprKind'],['expr_deref','ExprKind'],['expr_struct','ExprKind'],['expr_match','ExprKind'],['ty_path','TyKind']])positive.set(name,originalAstPositiveConstructors(profile,builder(name),owner));
 // PatKind is an actual imported constructor in build.rs, without the ast::
 // qualifier. The general builder compiler resolves that original use binding.
 for(const name of ['pat_path','pat_wild']){const contract=compiler.compile(name),constructors=[];function visit(value){if(!value||typeof value!=='object')return;if(value.tag==='positive-ast-enum-constructor'&&value.owner==='PatKind')constructors.push({source:value.source,sourceSha256:value.sourceSha256,span:value.span,variant:value.variantSchema,args:value.args,recipeDigest:contract.recipe.digest,import:value.import});for(const child of Object.values(value))if(child&&typeof child==='object')visit(child);}visit(contract.result);if(constructors.length!==1)throw new TypeError('Original Clone pattern constructor flow is not unique');positive.set(name,constructors);}
 positive.set('source_field',originalAstPositiveConstructors(profile,get('create_struct_field_access_fields'),'ExprKind').filter(value=>value.variant.name==='Field'));
 const schemas=[['enum','ItemKind'],['struct','Impl'],['enum','AssocItemKind'],['struct','Fn'],['struct','FnSig'],['struct','FnDecl'],['struct','Param'],['struct','Block'],['enum','StmtKind'],['struct','Local'],['enum','LocalKind'],['struct','Expr'],['struct','ExprField'],['struct','StructExpr'],['struct','Pat'],['enum','PatKind'],['struct','Arm'],['enum','ExprKind'],['enum','TyKind']].map(([kind,name])=>originalAstDefinition(profile,schema,kind,name));
 const variants=[['ItemKind','Impl',1],['AssocItemKind','Fn',1],['StmtKind','Expr',1],['StmtKind','Let',1],['LocalKind','Decl',0],['ExprKind','Path',2],['ExprKind','Call',2],['ExprKind','Field',2],['ExprKind','AddrOf',3],['ExprKind','Unary',2],['ExprKind','Struct',1],['ExprKind','Match',3],['PatKind','Path',2],['PatKind','Wild',0],['PatKind','Ident',3],['TyKind','Path',2],['TyKind','Ref',2],['TyKind','ImplicitSelf',0]].map(([owner,name,arity])=>{const definition=schemas.find(value=>value.syntax.some(node=>node.text===owner)),variant=astEnumVariant(profile,definition,name);if(variant.arity!==arity)throw new TypeError('Original Clone positive AST arity changed');return {owner,...variant};});
 const stdPath=recipe('compiler/rustc_expand/src/base.rs','std_path');contains(stdPath,'Ident::new(kw::DollarCrate, def_site)','self.with_def_site_ctxt(DUMMY_SP)');
 const evidence={schema:'original-clone-positive-ast-plan-v1',profileDigest:profile.digest,entry,descriptor,method,recipes,compileMeta,positiveSchemas:schemas,positiveVariants:variants,constructors:[...positive].map(([name,constructors])=>({name,constructors})),constructionFlow:{associatedTypes:0,methods:1,nonselfArguments:0,selflikeArguments:1,methodGenerics:0,return:'actual Self_ original nongeneric owner Ty',receiver:'actual Param::from_self SelfKind::Region(None,Not)',simple:'static data -> type-only LocalKind::Decl assertions + Unary(Deref,self)',full:'named Struct fields -> Clone::clone(&self.field); unit Struct/Enum -> Path; multiple unit variants -> exhaustive Match',excludedBranches:['union','packed','tuple','payload variant','empty enum','Unify','SpecializeIfAllVariantsFieldless','multiple selflike arguments','discriminant_value','unreachable','compiler diagnostic format!'],sourceAttributes:'field/variant attributes are not copied into generated body; actual helper owners require an independent invocation join'},generatedImplBehavior:false};
 const result=freezeCompleted({...evidence,digest:hash(JSON.stringify(evidence))}),state={entry,profile,result,positive};plans.set(profile,state);return state;
}
function originalLeaves(original,certificate,input){
 const actual=(input.style==='payload-enum'?builtinPayloadDataInputs:builtinDeriveDataInputs)({source:original.module.source,span:certificate.span});if(JSON.stringify(input)!==JSON.stringify(actual)||input.wholeSourceSha256!==certificate.sourceSha256||input.itemSha256!==certificate.itemSha256||input.name!==certificate.name||input.kind!==certificate.kind)throw new TypeError('Original Clone syntax differs from its private invocation');
 if(input.attributes.some(attribute=>attribute.name==='repr'))throw new TypeError('Original Clone repr/packed data remains outside the selected output grammar');
 let inventory=inventories.get(original.dependencies);if(!inventory){inventory=inventoryDeriveQuoteMeta(original.dependencies);inventories.set(original.dependencies,inventory);}const compiler=createQuoteFragmentCompiler(inventory);
 const typedField=value=>{const typed=compiler.roundTrip(compiler.sourceType(value.typeSource,{source:certificate.source,sourceSha256:certificate.sourceSha256,span:value.typeSpan,field:value.name,owner:'original Clone field Ty clone'}));return {...value,type:{kind:'SourceTy',sourceSha256:hash(value.typeSource),syntaxSha256:hash(JSON.stringify(typed.syntax)),syntax:typed.syntax,span:value.typeSpan,semanticSyntaxRoundTrip:typed.provenance.semanticRoundTrip===true},fieldInfoSpan:{domain:'actual FieldDef.span with original trait hygiene; identifier and type spans retained separately',span:value.fieldDefinitionSpan,nameSpan:value.nameSpan,typeSpan:value.typeSpan}};};
 return {inputSyntax:input,fields:input.fields.map(typedField),variants:input.style==='payload-enum'?input.variants.map(variant=>({...variant,fields:variant.fields.map(typedField)})):input.variants};
}
function materialize(state,leaves,payload=null){
 const constructor=name=>state.positive.get(name)?.[0];
 const expr=(name,slots)=>({kind:'Expr',attrs:[],tokens:null,constructor:constructor(name),slots});
 const path=(segments)=>({kind:'Path',segments});
 const self=()=>expr('expr_path',{qself:null,path:path(['self'])});
 const standard={kind:'OriginalStandardRoot',symbol:'kw::DollarCrate',hygiene:'original std_path with_def_site_ctxt'};
 const unit=variant=>expr('expr_path',{qself:null,path:path(variant?[leaves.inputSyntax.name,variant.name]:[leaves.inputSyntax.name])});
 const cloneField=field=>expr('expr_call',{expr:expr('expr_path',{qself:null,path:path([standard,'clone','Clone','clone'])}),args:[expr('expr_addr_of',{borrowKind:'Ref',mutability:'Not',e:expr('source_field',{e:self(),ident:field.name,fieldInfoSpan:field.fieldInfoSpan})})]});
 let full;
 if(payload){
  const constructorFor=variant=>{const variantPath=path([leaves.inputSyntax.name,variant.name]),clone=field=>expr('expr_call',{expr:expr('expr_path',{qself:null,path:path([standard,'clone','Clone','clone'])}),args:[expr('expr_path',{qself:null,path:path(['__self_'+field.index])})]});
   if(variant.style==='unit')return expr('expr_path',{qself:null,path:variantPath});
   if(variant.style==='tuple')return expr('expr_call',{expr:expr('expr_path',{qself:null,path:variantPath}),args:variant.fields.map((field,index)=>clone({...field,index}))});
   return expr('expr_struct',{qself:null,path:variantPath,fields:variant.fields.map((field,index)=>({kind:'ExprField',ident:field.name,attrs:[],is_shorthand:false,is_placeholder:false,fieldInfoSpan:field.fieldInfoSpan,expr:clone({...field,index})})),rest:'None'});
  };
  const pattern=variant=>{const common={kind:'Pat',tokens:null},args={qself:null,path:path([leaves.inputSyntax.name,variant.name])},binders=variant.fields.map((field,index)=>({kind:'PatKind::Ident',bindingMode:{byRef:'No',mutability:'Not'},ident:'__self_'+index,subpattern:null,sourceSpan:field.fieldDefinitionSpan}));
   if(variant.style==='unit')return {...common,constructor:payload.constructors.pat_path,slots:args};
   if(variant.style==='tuple')return {...common,constructor:payload.constructors.pat_tuple_struct,slots:{...args,subpatterns:binders}};
   return {...common,constructor:payload.constructors.pat_struct,slots:{...args,fields:variant.fields.map((field,index)=>({kind:'PatField',ident:field.name,isShorthand:false,attrs:[],isPlaceholder:false,sourceSpan:field.fieldDefinitionSpan,pattern:binders[index]})),rest:'PatFieldsRest::None'}};
  };
  full=leaves.variants.length===1&&!leaves.variants[0].fields.length?constructorFor(leaves.variants[0]):expr('expr_match',{arg:self(),matchKind:'Prefix',arms:leaves.variants.map(variant=>({kind:'Arm',attrs:[],guard:null,is_placeholder:false,pat:pattern(variant),body:constructorFor(variant)}))});
 }else if(leaves.inputSyntax.style==='named-struct')full=expr('expr_struct',{qself:null,path:path([leaves.inputSyntax.name]),fields:leaves.fields.map(field=>({kind:'ExprField',ident:field.name,attrs:[],is_shorthand:false,is_placeholder:false,fieldInfoSpan:field.fieldInfoSpan,expr:cloneField(field)})),rest:'None'});
 else if(leaves.inputSyntax.style==='unit-struct'||leaves.variants.length===1)full=unit(leaves.variants[0]);
 else full=expr('expr_match',{arg:self(),matchKind:'Prefix',arms:leaves.variants.map(variant=>({kind:'Arm',attrs:[],guard:null,is_placeholder:false,pat:{kind:'Pat',tokens:null,constructor:constructor('pat_path'),slots:{qself:null,path:path([leaves.inputSyntax.name,variant.name])}},body:unit(variant)}))});
 // The original is_simple_path predicate/dedup chooses a subsequence of these
 // exact type-only statements. No choice changes any AST node category.
 const assertionFields=payload?leaves.variants.flatMap(variant=>variant.fields):leaves.fields,candidates=assertionFields.map(field=>({kind:'Stmt',variant:'Let',local:{kind:'Local',variant:'Decl',initializer:null,attrs:[],tokens:null,pat:{kind:'Pat',tokens:null,constructor:constructor('pat_wild'),slots:{}},ty:{kind:'AssertionTy',path:path([standard,'clone','AssertParamIsClone']),argument:field.type},fieldInfoSpan:field.fieldInfoSpan}}));
 const body=expression=>({kind:'Block',tokens:null,rules:'Default',statements:[{kind:'Stmt',variant:'Expr',expr:expression}]});
 const method=block=>({kind:'ItemKind::Impl',associatedTypes:[],items:[{kind:'AssocItemKind::Fn',attrs:['inline'],tokens:null,name:'clone',header:{safety:'Default',coroutine_kind:null,constness:'No',ext:'None'},generics:[],contract:null,define_opaque:null,parameters:[{kind:'Param',attrs:[],is_placeholder:false,pat:{kind:'PatKind::Ident',byRef:'No',mutability:'Not',ident:'self',subpattern:null,tokens:null},receiver:{kind:'TyKind::Ref',lifetime:null,mutability:'Not',pointee:'TyKind::ImplicitSelf'}}],returnType:{kind:'OriginalSelfTy',name:leaves.inputSyntax.name},body:block}],attrs:['automatically_derived']});
 return [{feature:'has_derive_copy=false',output:method(body(full))},{feature:'has_derive_copy=true',output:method({...body(expr('expr_deref',{op:'Deref',e:self()})),typeOnlyStatements:{selection:'original is_simple_path/seen_type_names subsequence; both original branches retain only LocalKind::Decl',candidates}})}];
}
// Public syntax validation grants no issuer authority. Every recursive category
// is positive and constructor-bearing; unknown items/macros/guards are refused.
// This private tree was materialized by the original source route. Charge
// every logical occurrence before hashing/freezing its complete evidence.
// The independent positive grammar and private issuer checks still run below.
const CLONE_AST_NODES=32000,CLONE_AST_DEPTH=64;
function assertCloneAstSize(branches){
 let nodes=0;
 function visit(value,depth=0){
  if(++nodes>CLONE_AST_NODES||depth>CLONE_AST_DEPTH)throw new TypeError('Clone positive AST validation budget exceeded');
  if(value!==null&&typeof value==='object')for(const key of Object.keys(value))visit(value[key],depth+1);
 }
 visit(branches);
}
export function validateBuiltinCloneAstOutput(route,branches){
 const state=outputs.get(route);if(!state)throw new TypeError('Clone AST validation requires a genuine original source route');let nodes=0;
 const fail=()=>{throw new TypeError('Clone positive AST grammar/slot differs from original output');};
 const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
 function visit(actual,expected,depth=0){if(++nodes>CLONE_AST_NODES||depth>CLONE_AST_DEPTH)throw new TypeError('Clone positive AST validation budget exceeded');if(actual===null||typeof actual!=='object'){if(!same(actual,expected))fail();return;}if(types.isProxy(actual)||expected===null||typeof expected!=='object'||Array.isArray(actual)!==Array.isArray(expected))fail();const descriptors=Object.getOwnPropertyDescriptors(actual);for(const descriptor of Object.values(descriptors))if(!('value'in descriptor))fail();const a=Object.keys(actual),b=Object.keys(expected);if(!same(a,b))fail();for(const key of b)visit(descriptors[key].value,expected[key],depth+1);}
 visit(branches,state.branches);return true;
}
export function liftBuiltinCloneAstRoute({profile,original,certificate,entry,input}={}){
 const state=sourcePlan(profile,entry),leaves=originalLeaves(original,certificate,input),payload=input.style==='payload-enum'?requireOriginalBuiltinEnumPatternSource(originalBuiltinEnumPatternSource(profile),profile):null;
 if(payload){const original=originalAstFunction(profile,directory+'clone.rs','cs_clone');contains(original,'VariantData::Tuple(..)','let subcalls = all_fields.iter().map(|f| subcall(cx, f)).collect()','cx.expr_call(trait_span, path, subcalls)');}
 const branches=materialize(state,leaves,payload);
 assertCloneAstSize(branches);
 const evidence={schema:'original-clone-positive-ast-output-v1',profileDigest:profile.digest,source:certificate.source,sourceSha256:certificate.sourceSha256,itemSha256:certificate.itemSha256,span:certificate.span,typedSource:leaves,plan:{schema:state.result.schema,digest:state.result.digest,originalCompilerMetaPrivatelyRetained:true},...(payload?{payloadPatternSource:payload,payloadFlow:{allVariantsRetained:true,resolverBranches:['has_derive_copy=false','has_derive_copy=true'],full:'actual EnumMatching bound field paths -> Clone call -> source tuple/named/unit constructor',simple:'all actual variant fields -> original global is_simple_path/dedup type-only assertion subsequence',runtimeAuthority:false}}:{}),branches,positiveOutputGrammarComplete:true,selectedBodyBangComplete:true,namespaceAuthority:false,copyAuthority:false,noDropAuthority:false,constAuthority:false,generatedImplBehavior:false,obligations:['actual original derive and all helper/ancestor attribute bindings require independent private joins','Clone field trait calls, Copy assertion validity and borrowed/owned runtime behavior remain uncompiled','unknown layouts/configuration/source-stage errors remain refused']};
 const result=freezeCompleted({...evidence,digest:hash(JSON.stringify(evidence))});outputs.set(result,{state,branches});validateBuiltinCloneAstOutput(result,branches);return result;
}
export function builtinCloneOriginalSourcePlan(route){const value=outputs.get(route);if(!value)throw new TypeError('Clone plan requires genuine original output');return value.state.result;}

// Separate enclosing-only representation. Constructor witnesses are joined by
// private identity to the complete original source plan, rather than copied
// into each syntax occurrence. The legacy full-output limits stay unchanged.
function closeCloneEnclosingBranches(state,leaves,branches){
 let cells=0;
 const fail=()=>{throw new TypeError('Clone enclosing positive grammar differs from original output');};
 const count=depth=>{if(++cells>32000||depth>64)throw new TypeError('Clone enclosing syntax budget exceeded');};
 function exact(value,keys,depth){
  count(depth);
  if(!value||typeof value!=='object'||types.isProxy(value)||Array.isArray(value)||Object.getPrototypeOf(value)!==Object.prototype)fail();
  const names=Reflect.ownKeys(value);if(names.length!==keys.length||keys.some((key,index)=>names[index]!==key))fail();
  for(const key of keys){const field=Object.getOwnPropertyDescriptor(value,key);if(!field||!Object.hasOwn(field,'value'))fail();}
 }
 function list(value,length,visit,depth){
  count(depth);
  if(!Array.isArray(value)||types.isProxy(value)||Object.getPrototypeOf(value)!==Array.prototype||value.length!==length)fail();
  const keys=Reflect.ownKeys(value);if(keys.length!==length+1||keys.at(-1)!=='length')fail();
  for(let index=0;index<length;index++){
   if(keys[index]!==String(index))fail();const field=Object.getOwnPropertyDescriptor(value,''+index);
   if(!field||!Object.hasOwn(field,'value'))fail();visit(field.value,index,depth+1);
  }
 }
 const atom=(value,expected)=>{count(0);if(value!==expected)fail();};
 const witness=name=>{const value=state.positive.get(name)?.[0];if(!value)fail();return value;};
 const empty=(value,depth)=>list(value,0,()=>{},depth);
 function path(value,segments,depth){
  exact(value,['kind','segments'],depth);atom(value.kind,'Path');
  list(value.segments,segments.length,(segment,index,d)=>{
   if(typeof segments[index]==='string')atom(segment,segments[index]);
   else{exact(segment,['kind','symbol','hygiene'],d);atom(segment.kind,'OriginalStandardRoot');atom(segment.symbol,'kw::DollarCrate');atom(segment.hygiene,'original std_path with_def_site_ctxt');}
  },depth+1);
 }
 function expression(value,builder,keys,depth){
  exact(value,['kind','attrs','tokens','constructor','slots'],depth);atom(value.kind,'Expr');empty(value.attrs,depth+1);atom(value.tokens,null);
  atom(value.constructor,witness(builder));
  exact(value.slots,keys,depth+1);return value.slots;
 }
 function sourcePath(value,segments,depth){const slots=expression(value,'expr_path',['qself','path'],depth);atom(slots.qself,null);path(slots.path,segments,depth+1);}
 function self(value,depth){sourcePath(value,['self'],depth);}
 const standard={};
 function cloneField(value,field,depth){
  const call=expression(value,'expr_call',['expr','args'],depth);sourcePath(call.expr,[standard,'clone','Clone','clone'],depth+1);
  list(call.args,1,(argument,_index,d)=>{
   const borrow=expression(argument,'expr_addr_of',['borrowKind','mutability','e'],d);atom(borrow.borrowKind,'Ref');atom(borrow.mutability,'Not');
   const selected=expression(borrow.e,'source_field',['e','ident','fieldInfoSpan'],d+1);self(selected.e,d+2);atom(selected.ident,field.name);atom(selected.fieldInfoSpan,field.fieldInfoSpan);
  },depth+1);
 }
 function full(value,depth){
  if(leaves.inputSyntax.style==='named-struct'){
   const slots=expression(value,'expr_struct',['qself','path','fields','rest'],depth);atom(slots.qself,null);path(slots.path,[leaves.inputSyntax.name],depth+1);atom(slots.rest,'None');
   list(slots.fields,leaves.fields.length,(node,index,d)=>{
    const field=leaves.fields[index];exact(node,['kind','ident','attrs','is_shorthand','is_placeholder','fieldInfoSpan','expr'],d);atom(node.kind,'ExprField');atom(node.ident,field.name);empty(node.attrs,d+1);atom(node.is_shorthand,false);atom(node.is_placeholder,false);atom(node.fieldInfoSpan,field.fieldInfoSpan);cloneField(node.expr,field,d+1);
   },depth+1);
  }else if(leaves.inputSyntax.style==='unit-struct'||leaves.variants.length===1){
   sourcePath(value,leaves.inputSyntax.style==='unit-struct'?[leaves.inputSyntax.name]:[leaves.inputSyntax.name,leaves.variants[0].name],depth);
  }else{
   const slots=expression(value,'expr_match',['arg','matchKind','arms'],depth);self(slots.arg,depth+1);atom(slots.matchKind,'Prefix');
   list(slots.arms,leaves.variants.length,(arm,index,d)=>{
    const variant=leaves.variants[index];exact(arm,['kind','attrs','guard','is_placeholder','pat','body'],d);atom(arm.kind,'Arm');empty(arm.attrs,d+1);atom(arm.guard,null);atom(arm.is_placeholder,false);
    exact(arm.pat,['kind','tokens','constructor','slots'],d+1);atom(arm.pat.kind,'Pat');atom(arm.pat.tokens,null);atom(arm.pat.constructor,witness('pat_path'));
    exact(arm.pat.slots,['qself','path'],d+2);atom(arm.pat.slots.qself,null);path(arm.pat.slots.path,[leaves.inputSyntax.name,variant.name],d+3);sourcePath(arm.body,[leaves.inputSyntax.name,variant.name],d+1);
   },depth+1);
  }
 }
 function assertion(value,field,depth){
  exact(value,['kind','variant','local'],depth);atom(value.kind,'Stmt');atom(value.variant,'Let');
  const local=value.local;exact(local,['kind','variant','initializer','attrs','tokens','pat','ty','fieldInfoSpan'],depth+1);atom(local.kind,'Local');atom(local.variant,'Decl');atom(local.initializer,null);empty(local.attrs,depth+2);atom(local.tokens,null);atom(local.fieldInfoSpan,field.fieldInfoSpan);
  exact(local.pat,['kind','tokens','constructor','slots'],depth+2);atom(local.pat.kind,'Pat');atom(local.pat.tokens,null);atom(local.pat.constructor,witness('pat_wild'));exact(local.pat.slots,[],depth+3);
  exact(local.ty,['kind','path','argument'],depth+2);atom(local.ty.kind,'AssertionTy');path(local.ty.path,[standard,'clone','AssertParamIsClone'],depth+3);atom(local.ty.argument,field.type);
  if(field.type.semanticSyntaxRoundTrip!==true)fail();
 }
 const result=[];
 list(branches,2,(branch,index,depth)=>{
  const before=cells;exact(branch,['feature','output'],depth);atom(branch.feature,index?'has_derive_copy=true':'has_derive_copy=false');
  const output=branch.output;exact(output,['kind','associatedTypes','items','attrs'],depth+1);atom(output.kind,'ItemKind::Impl');empty(output.associatedTypes,depth+2);list(output.attrs,1,value=>atom(value,'automatically_derived'),depth+2);
  list(output.items,1,(method,_index,d)=>{
   exact(method,['kind','attrs','tokens','name','header','generics','contract','define_opaque','parameters','returnType','body'],d);atom(method.kind,'AssocItemKind::Fn');list(method.attrs,1,value=>atom(value,'inline'),d+1);atom(method.tokens,null);atom(method.name,'clone');empty(method.generics,d+1);atom(method.contract,null);atom(method.define_opaque,null);
   exact(method.header,['safety','coroutine_kind','constness','ext'],d+1);atom(method.header.safety,'Default');atom(method.header.coroutine_kind,null);atom(method.header.constness,'No');atom(method.header.ext,'None');
   list(method.parameters,1,(parameter,_index,p)=>{
    exact(parameter,['kind','attrs','is_placeholder','pat','receiver'],p);atom(parameter.kind,'Param');empty(parameter.attrs,p+1);atom(parameter.is_placeholder,false);
    exact(parameter.pat,['kind','byRef','mutability','ident','subpattern','tokens'],p+1);atom(parameter.pat.kind,'PatKind::Ident');atom(parameter.pat.byRef,'No');atom(parameter.pat.mutability,'Not');atom(parameter.pat.ident,'self');atom(parameter.pat.subpattern,null);atom(parameter.pat.tokens,null);
    exact(parameter.receiver,['kind','lifetime','mutability','pointee'],p+1);atom(parameter.receiver.kind,'TyKind::Ref');atom(parameter.receiver.lifetime,null);atom(parameter.receiver.mutability,'Not');atom(parameter.receiver.pointee,'TyKind::ImplicitSelf');
   },d+1);
   exact(method.returnType,['kind','name'],d+1);atom(method.returnType.kind,'OriginalSelfTy');atom(method.returnType.name,leaves.inputSyntax.name);
   const block=method.body;exact(block,index?['kind','tokens','rules','statements','typeOnlyStatements']:['kind','tokens','rules','statements'],d+1);atom(block.kind,'Block');atom(block.tokens,null);atom(block.rules,'Default');
   list(block.statements,1,(statement,_index,b)=>{
    exact(statement,['kind','variant','expr'],b);atom(statement.kind,'Stmt');atom(statement.variant,'Expr');
    if(!index)full(statement.expr,b+1);else{const slots=expression(statement.expr,'expr_deref',['op','e'],b+1);atom(slots.op,'Deref');self(slots.e,b+2);}
   },d+2);
   if(index){exact(block.typeOnlyStatements,['selection','candidates'],d+2);atom(block.typeOnlyStatements.selection,'original is_simple_path/seen_type_names subsequence; both original branches retain only LocalKind::Decl');list(block.typeOnlyStatements.candidates,leaves.fields.length,(node,index,a)=>assertion(node,leaves.fields[index],a),d+3);}
  },depth+2);
  result.push({condition:branch.feature,outputKind:'ItemKind::Impl',methods:1,associatedTypes:0,closure:{schema:'source-original-clone-enclosing-positive-tree-v1',cells:cells-before,allOriginalFieldsRetained:true,allOriginalVariantsRetained:true,constructorWitnessesPrivatelyJoined:true,bodyExpressionComplete:true,namespaceAuthority:false}});
 },0);
 return result;
}

export function compileBuiltinCloneEnclosingNamespaceModel({profile,entry,original,certificate,input}={}){
 if(input.style==='payload-enum')return null;
 const state=sourcePlan(profile,entry),leaves=originalLeaves(original,certificate,input),branches=materialize(state,leaves);
 const closed=closeCloneEnclosingBranches(state,leaves,branches);
 return {schema:'original-clone-enclosing-grammar-candidate-v1',inputStyle:input.style,
  sources:state.result.recipes.map(recipe=>({source:recipe.source,sourceSha256:recipe.sourceSha256,span:recipe.span,syntaxSha256:recipe.syntaxSha256,digest:recipe.digest})),branches:closed,
  sourceTypeRoundtrips:leaves.fields.map(field=>({name:field.name,typeSpan:field.typeSpan,sourceSha256:field.type.sourceSha256,syntaxSha256:field.type.syntaxSha256,semanticSyntaxRoundTrip:field.type.semanticSyntaxRoundTrip})),
  generatedAttributes:['automatically_derived','inline'],methodBehavior:'opaque-untranslated',namespaceAuthority:false,runtimeAuthority:false};
}
