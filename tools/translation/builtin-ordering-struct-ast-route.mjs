// Original named/unit struct Ord and PartialOrd construction. Namespace syntax
// only: trait dispatch, comparison results, Copy and Drop remain unproved.
import {createHash} from 'node:crypto';
import {originalAstFunction,astStructLiteral,astSyntaxText,astFragmentText,astEnumVariant,originalAstDefinition,originalAstPositiveConstructors} from './builtin-derive-ast-meta.mjs';
import {inventoryDeriveQuoteMeta,createQuoteFragmentCompiler} from './derive-quote-meta.mjs';
import {createBuiltinAstBuilderMetaCompiler,builtinAstSourceImports} from './builtin-ast-builder-meta.mjs';
const generic='compiler/rustc_builtin_macros/src/deriving/generic/mod.rs',build='compiler/rustc_expand/src/build.rs',schema='compiler/rustc_ast/src/ast.rs';
const hash=value=>createHash('sha256').update(value).digest('hex');
function contains(recipe,...needles){const source=astFragmentText(recipe);for(const needle of needles)if(!source.includes(needle))throw TypeError('Original struct ordering construction changed: '+needle);}
function field(recipe,name,expected){if(astSyntaxText(recipe.fields.find(row=>row.name===name)?.expression??[])!==expected)throw TypeError('Original struct ordering slot changed: '+recipe.name+'.'+name);}
function extend(profile,plan){
 const compiler=createBuiltinAstBuilderMetaCompiler(profile);
 const recipes=[],get=(path,name)=>{const value=originalAstFunction(profile,path,name);recipes.push(value);return value;};
 const structure=get(generic,'expand_struct_def'),body=get(generic,'expand_struct_method_body'),projection=get(generic,'create_struct_field_access_fields'),fields=get(generic,'create_fields'),fold=get(generic,'cs_fold');
 contains(structure,'struct_def.fields().iter().map(|field| field.ty.clone())','from_scratch || method_def.is_static()','method_def.expand_struct_method_body(','method_def.create_method(');
 contains(body,'assert!(selflike_args.len() == 1 || selflike_args.len() == 2)','trait_.create_struct_field_access_fields(cx, selflike_args, struct_def, is_packed)','&Struct(struct_def, selflike_fields)');
 contains(projection,'ast::ExprKind::Field(','selflike_arg.clone()','struct_field.ident.unwrap_or_else','if is_packed','cx.expr_addr_of(sp, field_expr)');
 contains(fields,'struct_field.span.with_ctxt(self.span.ctxt())','let self_expr = exprs.remove(0)','other_selflike_exprs','name: struct_field.ident');
 contains(fold,'EnumMatching(.., all_fields) | Struct(_, all_fields)','if all_fields.is_empty()','return f(cx, CsFold::Fieldless)','all_fields.split_last().unwrap()','let base_expr = f(cx, CsFold::Single(base_field))','let new = f(cx, CsFold::Single(field))','f(cx, CsFold::Combine(field.span, old, new))','rest.iter().rfold(base_expr, op)');
 if(plan.partial)contains(plan.entry,'let discr_then_data = if let Annotatable::Item(item) = item','let ItemKind::Enum(_, _, def) = &item.kind','} else {\n        true\n    }');
 const constructors=new Map(plan.constructors),rows=originalAstPositiveConstructors(profile,projection,'ExprKind');if(rows.length!==1||rows[0].variant.name!=='Field')throw TypeError('Original struct ordering field constructor differs');constructors.set('source_field',rows[0]);
 const fieldVariant=astEnumVariant(profile,originalAstDefinition(profile,schema,'enum','ExprKind'),'Field');if(fieldVariant.arity!==2)throw TypeError('Original struct ordering Field arity changed');
 // These original PatKind constructors use the actual imported name. The
 // existing builder compiler resolves that binding and retains its source.
 const patterns=new Map();for(const[name,wanted]of [['pat_path','Path'],['pat_tuple_struct','TupleStruct']]){
  get(build,name);const contract=compiler.compile(name),rows=[];
  function visit(value){if(!value||typeof value!=='object')return;if(value.tag==='positive-ast-enum-constructor'&&value.owner==='PatKind')rows.push({source:value.source,sourceSha256:value.sourceSha256,span:value.span,variant:value.variantSchema,args:value.args,recipeDigest:contract.recipe.digest,import:value.import});for(const child of Object.values(value))if(child&&typeof child==='object')visit(child);}
  visit(contract.result);if(rows.length!==1||rows[0].variant.name!==wanted)throw TypeError('Original struct ordering pattern constructor differs: '+name);patterns.set(wanted,rows[0]);
 }
 // Ident's with_span_pos call has no executable builder compilation. Select
 // its complete original constructor syntax and actual imported PatKind owner;
 // the span/hygiene transformation stays explicit syntax, not runtime proof.
 const ident=get(build,'pat_ident_binding_mode'),imports=builtinAstSourceImports(profile,build).filter(row=>row.name==='PatKind'&&row.target.join('::')==='rustc_ast::PatKind');
 contains(ident,'let pat = PatKind::Ident(ann, ident.with_span_pos(span), None);','self.pat(span, pat)');
 const nodes=ident.syntax.at(-1).children,at=nodes.findIndex((node,index)=>node.text==='PatKind'&&nodes[index+1]?.text==='::'&&nodes[index+2]?.text==='Ident'),argumentsNode=nodes[at+3],variant=astEnumVariant(profile,originalAstDefinition(profile,schema,'enum','PatKind'),'Ident');
 if(imports.length!==1||at<0||argumentsNode?.delimiter!=='('||variant.arity!==3||astSyntaxText(argumentsNode.children)!=='ann , ident . with_span_pos (span) , None')throw TypeError('Original struct ordering Ident constructor differs');
 const args=[];let from=0;for(let index=0;index<=argumentsNode.children.length;index++)if(index===argumentsNode.children.length||argumentsNode.children[index].text===','){args.push(argumentsNode.children.slice(from,index));from=index+1;}
 patterns.set('Ident',{source:ident.source,sourceSha256:ident.sourceSha256,span:{start:nodes[at].span.start,end:argumentsNode.span.end},variant,args,recipeDigest:ident.digest,import:imports[0],spanOperation:'original ident.with_span_pos(span) syntax only'});
 const parser='compiler/rustc_parse/src/parser/item.rs',outer=get(parser,'parse_field_def'),named=get(parser,'parse_name_and_ty'),single=get(parser,'parse_single_struct_field');contains(outer,'let attrs = self.parse_outer_attributes()?','let lo = this.token.span','this.parse_visibility','UsePreAttrPos::No');field(astStructLiteral(profile,named,'FieldDef'),'span','lo . to (self . prev_token . span)');field(astStructLiteral(profile,named,'FieldDef'),'attrs','attrs');contains(single,'let a_var = self.parse_name_and_ty','token::Comma');
 return {constructors,patterns,recipes,fieldVariant};
}
function close(plan,extra,body,fields){
 const constructors=new Set(extra.constructors.values()),patterns=new Set(extra.patterns.values()),byName=new Map(fields.map(field=>[field.name,field]));let expressions=0,comparisons=0,matches=0,borrows=0;
 const fail=()=>{throw TypeError('Original struct ordering positive recursive AST closure differs');};
 function pattern(node){if(node?.kind!=='Pat'||node.tokens!==null||!patterns.has(node.constructor))fail();const s=node.slots;switch(node.constructor.variant.name){
  case 'Path':if(s.path?.segments?.at(-1)!=='Equal')fail();break;
  case 'TupleStruct':if(!plan.partial||s.path?.segments?.at(-1)!=='Some'||s.children?.length!==1)fail();pattern(s.children[0]);break;
  case 'Ident':if(s.bindingMode!=='NONE'||s.ident!=='cmp'||s.subpattern!==null)fail();break;default:fail();}}
 function visit(node){if(++expressions>4096||node?.kind!=='Expr'||node.tokens!==null||node.attrs?.length!==0||!constructors.has(node.constructor))fail();const s=node.slots;switch(node.constructor.variant.name){
  case 'Path':if(s.path?.kind!=='Path'||!Array.isArray(s.path.segments)||!s.path.segments.length)fail();break;
  case 'Field':if(!byName.has(s.ident)||JSON.stringify(s.sourceSpan)!==JSON.stringify(byName.get(s.ident).fieldDefinitionSpan)||!['self','other'].includes(s.base?.slots?.path?.segments?.[0]))fail();visit(s.base);break;
  case 'AddrOf':if(s.borrowKind!=='Ref'||s.mutability!=='Not'||s.e?.constructor!==extra.constructors.get('source_field'))fail();borrows++;visit(s.e);break;
  case 'Call':{const p=s.expr?.slots?.path?.segments;if(s.expr?.constructor!==extra.constructors.get('expr_path')||p?.[0]?.symbol!=='kw::DollarCrate'||!Array.isArray(s.args))fail();if(p.slice(1).join('::')===['cmp',plan.partial?'PartialOrd':'Ord',plan.partial?'partial_cmp':'cmp'].join('::')){if(s.args.length!==2)fail();comparisons++;}else if(plan.partial&&p.slice(1).join('::')==='option::Option::Some'){if(s.args.length!==1)fail();}else fail();visit(s.expr);s.args.forEach(visit);break;}
  case 'Match':if(s.matchKind!=='Prefix'||s.arms?.length!==2)fail();matches++;visit(s.argument);for(const arm of s.arms){if(arm.kind!=='Arm'||arm.attrs?.length!==0||arm.guard!==null||arm.isPlaceholder!==false)fail();pattern(arm.pattern);visit(arm.body);}break;
  default:fail();}}
 visit(body);if(comparisons!==fields.length||matches!==Math.max(0,fields.length-1)||borrows!==fields.length*2)fail();
 return {schema:'original-struct-ordering-positive-tree-v1',nodes:expressions,comparisons,matches,immutableFieldBorrows:borrows,localInitializers:0,sourceConstructorsOnly:true,bodyExpressionComplete:true,namespaceAuthority:false};
}
export function liftBuiltinStructOrderingAstRoute({profile,original,certificate,input,plan}={}){
 if(input.kind!=='struct'||!['named-struct','unit-struct'].includes(input.style)||input.fields.length>128||input.variants.length||input.attributes.some(row=>!['derive','doc'].includes(row.name)))throw TypeError('Original ordering struct input remains outside its ordinary nonpacked domain');
 const compiler=createQuoteFragmentCompiler(inventoryDeriveQuoteMeta(original.dependencies)),extra=extend(profile,plan),fields=input.fields.map(field=>{const source=original.module.source.slice(field.typeSpan.start,field.typeSpan.end),typed=compiler.roundTrip(compiler.sourceType(source,{source:certificate.source,sourceSha256:certificate.sourceSha256,span:field.typeSpan,field:field.name,owner:'original ordering field Ty clone'}));return {...field,sourceSha256:hash(source),syntax:typed.syntax,semanticSyntaxRoundTrip:typed.provenance.semanticRoundTrip===true};});
 const root={kind:'Ident',symbol:'kw::DollarCrate',hygiene:'actual std_path def-site'},node=(builder,slots)=>({kind:'Expr',constructor:extra.constructors.get(builder),attrs:[],tokens:null,slots}),path=segments=>node('expr_path',{path:{kind:'Path',segments}}),call=(segments,args)=>node('expr_call',{expr:path([root,...segments]),args}),pattern=(kind,slots)=>({kind:'Pat',constructor:extra.patterns.get(kind),tokens:null,slots}),equalPath={kind:'Path',segments:[root,'cmp','Ordering','Equal']};
 const sourceFieldInputs=fields.map(field=>({name:field.name,span:field.fieldDefinitionSpan,selfExpr:node('expr_addr_of',{borrowKind:'Ref',mutability:'Not',e:node('source_field',{base:path(['self']),ident:field.name,sourceSpan:field.fieldDefinitionSpan,hygiene:'original trait context'})}),otherSelflikeExprs:[node('expr_addr_of',{borrowKind:'Ref',mutability:'Not',e:node('source_field',{base:path(['other']),ident:field.name,sourceSpan:field.fieldDefinitionSpan,hygiene:'original trait context'})})]}));
 let body;for(let index=sourceFieldInputs.length-1;index>=0;index--){const field=sourceFieldInputs[index],comparison=call(['cmp',original.name,plan.partial?'partial_cmp':'cmp'],[field.selfExpr,...field.otherSelflikeExprs]);if(!body){body=comparison;continue;}const equal=pattern('Path',{path:equalPath}),eqPattern=plan.partial?pattern('TupleStruct',{path:{kind:'Path',segments:[root,'option','Option','Some']},children:[equal]}):equal,arm=(pattern,body)=>({kind:'Arm',attrs:[],guard:null,isPlaceholder:false,pattern,body});body=node('expr_match',{argument:comparison,matchKind:'Prefix',arms:[arm(eqPattern,body),arm(pattern('Ident',{bindingMode:'NONE',ident:'cmp',subpattern:null}),path(['cmp']))],sourceSpan:field.span});}
 if(!body){const equal=path(equalPath.segments);body=plan.partial?call(['option','Option','Some'],[equal]):equal;}
 const recursiveNamespaceClosure=close(plan,extra,body,fields),returnType={kind:'TyKind::Path',qself:null,path:{segments:[root,...(plan.partial?['option','Option']:['cmp','Ordering'])],parameters:plan.partial?[{kind:'GenericArg::Type',type:{kind:'TyKind::Path',qself:null,path:{segments:[root,'cmp','Ordering'],parameters:[]}}}]:[]}};
 return {schema:'original-struct-ordering-ast-route-v1',profileDigest:profile.digest,descriptor:plan.descriptor,method:plan.method,pathMacros:plan.pathMacros,recipes:[...plan.recipes,...extra.recipes],positiveSchemas:[...plan.positiveSchemas,extra.fieldVariant],schemas:plan.schemas,typedSource:{...input,fields},sourceFieldInputs,signatureSyntax:{receiver:{kind:'TyKind::Ref',lifetime:null,mutability:'Not',pointee:'actual implicit Self from Param::from_self'},other:{kind:'TyKind::Ref',lifetime:null,mutability:'Not',pointee:'actual self_ref/to_ty path with zero original generic parameters'},returnType},sourceControls:{implementations:1,methods:1,associatedTypes:0,receiverArguments:2,structStrategy:'original Struct field access in declaration order',discrThenData:plan.partial?true:null,selectedCsFold:fields.length?'Struct(fields) → split_last Single → rfold Combine':'Struct(empty) → Fieldless',constness:['Const::Yes','Const::No'],packedInputAdmitted:false},implementations:[{kind:'ItemKind::Impl',traitPath:'cmp::'+original.name,associatedItems:[{kind:'AssocItemKind::Fn',name:plan.partial?'partial_cmp':'cmp',statements:[],body,recursiveNamespaceClosure}],constness:['Const::Yes','Const::No'],namespaceAuthority:false}],namespaceAuthority:false,generatedImplBehavior:false,copyAuthority:false,noDropAuthority:false,constAuthority:false};
}
