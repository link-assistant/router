// A conditional outer-item range lemma. This does not select the caller's
// derive owner or discharge the independent generated-attribute/export joins.
import {createHash} from 'node:crypto';
import {builtinDeriveAstSourceProfile,builtinAstOriginal,originalAstFunction,astFragmentText,astStructLiteral,originalAstPositiveConstructors,originalAstDefinition} from './builtin-derive-ast-meta.mjs';
import {builtinStandardDeriveRegistry,builtinStandardDeriveSourceOwner} from './builtin-derive-standard-inputs.mjs';
import {originalMacroTrees} from './macro-token-trees.mjs';
import {rustTokens} from './rust-structure.mjs';
import {originalImplNamespaceSourcePlan,requireOriginalImplNamespaceSourcePlan} from './derive-ancestor-attribute-scope.mjs';
import {originalPrivateParserIngressUnchanged,originalStaticSourceIntrinsicsUnchanged,originalDataFreezeIntrinsicsUnchanged,throwOriginalCapturedTypeError} from './original-json-intrinsics.mjs';
const initial=originalPrivateParserIngressUnchanged()&&originalStaticSourceIntrinsicsUnchanged()&&originalDataFreezeIntrinsicsUnchanged();
const proofs=initial?new WeakMap():null;
const fail=message=>throwOriginalCapturedTypeError('Original builtin derive Type range: '+message);
function guard(){if(!initial||!originalPrivateParserIngressUnchanged()||!originalStaticSourceIntrinsicsUnchanged()||!originalDataFreezeIntrinsicsUnchanged())fail('original source operations changed');}
const hash=value=>{const result=createHash('sha256').update(value).digest('hex');guard();return result;};
const compact=source=>rustTokens(source).filter(token=>token.type!=='comment').map(token=>token.text).join('');
const freeze=value=>{if(value&&typeof value==='object'){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;};
const deriving='compiler/rustc_builtin_macros/src/deriving/';
// Complete original dispatch grammar, including every non-emission branch.
const dispatchTemplate="fn expand_ext(\n        self,\n        cx: &ExtCtxt<'_>,\n        mitem: &ast::MetaItem,\n        item: &'a Annotatable,\n        push: &mut dyn FnMut(Annotatable),\n        from_scratch: bool,\n    ) {\n        match item {\n            Annotatable::Item(item) => {\n                let is_packed = matches!(\n                    AttributeParser::parse_limited(cx.sess, &item.attrs, sym::repr, item.span, item.id),\n                    Some(Attribute::Parsed(AttributeKind::Repr(r))) if r.iter().any(|(x, _)| matches!(x, ReprPacked(..)))\n                );\n\n                let newitem = match &item.kind {\n                    ast::ItemKind::Struct(ident, generics, struct_def) => self.expand_struct_def(\n                        cx,\n                        struct_def,\n                        *ident,\n                        generics,\n                        from_scratch,\n                        is_packed,\n                    ),\n                    ast::ItemKind::Enum(ident, generics, enum_def) => {\n                        // We ignore `is_packed` here, because `repr(packed)`\n                        // enums cause an error later on.\n                        //\n                        // This can only cause further compilation errors\n                        // downstream in blatantly illegal code, so it is fine.\n                        self.expand_enum_def(cx, enum_def, *ident, generics, from_scratch)\n                    }\n                    ast::ItemKind::Union(ident, generics, struct_def) => {\n                        if self.supports_unions {\n                            self.expand_struct_def(\n                                cx,\n                                struct_def,\n                                *ident,\n                                generics,\n                                from_scratch,\n                                is_packed,\n                            )\n                        } else {\n                            cx.dcx().emit_err(errors::DeriveUnion { span: mitem.span });\n                            return;\n                        }\n                    }\n                    _ => unreachable!(),\n                };\n                // Keep the lint attributes of the previous item to control how the\n                // generated implementations are linted\n                let mut attrs = newitem.attrs.clone();\n                attrs.extend(\n                    item.attrs\n                        .iter()\n                        .filter(|a| {\n                            a.has_any_name(&[\n                                sym::allow,\n                                sym::warn,\n                                sym::deny,\n                                sym::forbid,\n                                sym::stable,\n                                sym::unstable,\n                            ])\n                        })\n                        .cloned(),\n                );\n                push(Annotatable::Item(P(ast::Item { attrs, ..(*newitem).clone() })))\n            }\n            _ => unreachable!(),\n        }\n    }";
function callback(profile,path,name){
 const origin=builtinAstOriginal(profile,path);if(hash(origin.source)!==origin.sha256)fail('complete current original compiler source differs');
 const fragment=originalAstFunction(profile,path,name),original=astFragmentText(fragment);
 if(hash(original)!==fragment.sha256)fail('complete current original callback differs');
 return {path,sourceSha256:origin.sha256,name,span:fragment.span,original,syntax:fragment.syntax};
}
function route(callback,original,conclusion){
 const all=compact(callback.original),part=compact(original),at=all.indexOf(part);
 if(!part||at<0||all.indexOf(part,at+1)>=0)fail('original output route differs: '+conclusion);
 return {callback,original,conclusion,completeCallbackRetained:true};
}
function body(callback){const result=callback.syntax.at(-1);if(result?.delimiter!=='{')fail('whole original body required');return result.children;}
function text(nodes){return nodes.map(node=>node.kind==='group'?node.delimiter+text(node.children)+({'(' : ')','[' : ']','{' : '}'}[node.delimiter]):node.text).join('');}
function walk(nodes,visit){for(let at=0;at<nodes.length;at++){visit(nodes,at);if(nodes[at].kind==='group')walk(nodes[at].children,visit);}}
function unshadowed(callback,names){
 const declarations=[];walk(body(callback),(nodes,at)=>{
  const token=nodes[at];if(['let','for','fn'].includes(token.text)){
   let end=at+1;while(end<nodes.length&&!['=',':','in'].includes(nodes[end].text)&&nodes[end].kind!=='group')end++;
   const bindings=nodes.slice(at+1,end);if(bindings.some(node=>names.includes(node.text)))fail('original receiver is shadowed by a complete local binding');declarations.push({kind:token.text,span:token.span,syntax:bindings});
  }
  if(token.text==='|'){let end=at+1;while(end<nodes.length&&nodes[end].text!=='|'&&nodes[end].kind!=='group')end++;if(nodes[end]?.text==='|'&&nodes.slice(at+1,end).some(node=>names.includes(node.text)))fail('original receiver is shadowed by a closure parameter');}
 });return {names,declarations,completeBodyVisited:true};
}
function tail(callback,receiver,method){
 const nodes=body(callback),selected=nodes.slice(-4),earlyExits=[];
 walk(nodes,(items,at)=>{const node=items[at];if(node.text==='return'||node.text==='?'||node.text==='yield')earlyExits.push(node);});
 if(earlyExits.length)fail('original range has another return, try or yield branch');
 if(selected[0]?.text!==receiver||selected[1]?.text!=='.'||selected[2]?.text!==method||selected[3]?.delimiter!=='('||nodes.length>4&&nodes.at(-5)?.text!==';')fail('the complete original body has another normal result expression');
 return {callback,receiver,method,arguments:selected[3].children,earlyExits,receiverBindings:unshadowed(callback,[receiver]),completeNormalReturnSet:true};
}
// Compile every use of the actual output capability. The callback can have
// arbitrary method/body computations, but cannot send that capability there:
// every use must be the fourth argument of its own local TraitDef receiver.
function forwarding(callback){
 const roots=body(callback),receivers=new Set(),forwarded=[];
 for(let at=0;at<roots.length;at++)if(roots[at].text==='let'&&roots[at+1]?.type==='ident'&&roots[at+2]?.text==='='&&roots[at+3]?.text==='TraitDef'&&roots[at+4]?.delimiter==='{'){
  if(receivers.has(roots[at+1].text))fail('original TraitDef receiver has multiple local bindings');receivers.add(roots[at+1].text);
 }
 walk(roots,(nodes,at)=>{const node=nodes[at];if(!receivers.has(node.text))return;
  const definition=nodes===roots&&nodes[at-1]?.text==='let'&&nodes[at+1]?.text==='='&&nodes[at+2]?.text==='TraitDef'&&nodes[at+3]?.delimiter==='{';
  const reference=nodes[at+1]?.text==='.'&&['expand','expand_ext'].includes(nodes[at+2]?.text)&&nodes[at+3]?.delimiter==='(';
  if(!definition&&!reference)fail('original TraitDef receiver escapes, mutates or is shadowed');
 });
 function visit(nodes){for(let at=0;at<nodes.length;at++){
  const node=nodes[at];if(node.kind==='group'){
   if(node.children.some(child=>child.text==='push')){
    const receiver=nodes[at-3],dot=nodes[at-2],method=nodes[at-1],args=text(node.children);
    if(node.delimiter!=='('||!receivers.has(receiver?.text)||dot?.text!=='.'||!['expand','expand_ext'].includes(method?.text)||!/^cx,mitem,item,push(?:,(?:true|false|is_simple))?,?$/u.test(args))fail('output capability escapes the source TraitDef forwarding grammar');
    forwarded.push({receiver:receiver.text,method:method.text,span:node.span,originalArguments:node.children});
   }else visit(node.children);
  }else if(node.text==='push')fail('unaccounted original output capability use');
 }}visit(roots);
 if(!forwarded.length)fail('no complete original output forwarding route');return forwarded;
}
function deriveSourcePlan(dependencies,name){
 guard();const registry=builtinStandardDeriveRegistry(dependencies),owner=builtinStandardDeriveSourceOwner(registry,dependencies,name),profile=builtinDeriveAstSourceProfile(dependencies);
 const declaration=originalMacroTrees(owner.registration.deriveModule.original),paths=declaration.filter(node=>node.delimiter==='['&&node.children[0]?.text==='path');
 if(paths.length>1)fail('original registered callback module has ambiguous source paths');
 let relative=owner.registration.callback.slice(0,-1).join('/')+'.rs';
 if(paths.length){const tokens=paths[0].children;if(tokens.length!==3||tokens[1].text!=='='||tokens[2].type!=='string'||!/^"[a-z_/]+\.rs"$/u.test(tokens[2].text))fail('original callback module source path remains unproved');relative=tokens[2].text.slice(1,-1);}
 const path=deriving+relative,entry=callback(profile,path,owner.registration.callback.at(-1));
 const forwards=forwarding(entry),generic=deriving+'generic/mod.rs';
 const callbacks={entry,expand:callback(profile,generic,'expand'),expandExt:callback(profile,generic,'expand_ext'),struct:callback(profile,generic,'expand_struct_def'),enumeration:callback(profile,generic,'expand_enum_def'),create:callback(profile,generic,'create_derived_impl'),item:callback(profile,'compiler/rustc_expand/src/build.rs','item')};
 const normalReturns={struct:tail(callbacks.struct,'self','create_derived_impl'),enumeration:tail(callbacks.enumeration,'self','create_derived_impl'),create:tail(callbacks.create,'cx','item')};
 for(const key of ['struct','enumeration'])if(text(normalReturns[key].arguments)!=='cx,type_ident,generics,field_tys,methods,is_packed')fail('original normal result forwards different constructor arguments');
 const itemArguments=normalReturns.create.arguments;
 if(text(itemArguments.slice(0,6))!=='self.span,attrs,'||text(itemArguments.slice(6,11))!=='ast::ItemKind::Impl'||itemArguments[11]?.delimiter!=='('||itemArguments.length!==13||itemArguments[12]?.text!==',')fail('original constructor normal result has another outer discriminant or argument');
 const builder='fn item(&self,span:Span,attrs:ast::AttrVec,kind:ast::ItemKind)->P<ast::Item>{P(ast::Item{attrs,id:ast::DUMMY_NODE_ID,kind,vis:ast::Visibility{span:span.shrink_to_lo(),kind:ast::VisibilityKind::Inherited,tokens:None,},span,tokens:None,})}';
 if(compact(callbacks.item.original)!==compact(builder))fail('complete original item builder has another control or kind flow');
 const createFragment=originalAstFunction(profile,generic,'create_derived_impl'),itemFragment=originalAstFunction(profile,'compiler/rustc_expand/src/build.rs','item'),constructors=originalAstPositiveConstructors(profile,createFragment,'ItemKind');
 const originalSchema=builtinAstOriginal(profile,'compiler/rustc_ast/src/ast.rs');if(hash(originalSchema.source)!==originalSchema.sha256)fail('complete current original AST schema differs');
 const sourceConstructorSchemas={constructors,implementation:astStructLiteral(profile,createFragment,'Impl'),item:astStructLiteral(profile,itemFragment,'Item'),itemDefinition:originalAstDefinition(profile,'compiler/rustc_ast/src/ast.rs','struct','Item')};
 if(constructors.length!==1||constructors[0].variant.name!=='Impl'||constructors[0].variant.arity!==1||text(sourceConstructorSchemas.item.fields.find(row=>row.name==='kind')?.expression??[])!=='kind')fail('original source constructor discriminant/preserved payload differs');
 if(compact(callbacks.expandExt.original)!==compact(dispatchTemplate))fail('complete original dispatch control/dataflow grammar differs');
 const rules=[
  route(callbacks.expand,'self.expand_ext(cx, mitem, item, push, false);','ordinary TraitDef expansion forwards the original callback unchanged'),
  route(callbacks.expandExt,'let newitem = match &item.kind {','all original Struct/Enum/Union branches supply the same newitem join'),
  route(callbacks.expandExt,'push(Annotatable::Item(P(ast::Item { attrs, ..(*newitem).clone() })))','the sole emission copies the selected newitem kind and replaces only attrs'),
  route(callbacks.expandExt,'let mut attrs = newitem.attrs.clone();','outer generated attributes start from the actual returned Impl'),
  route(callbacks.expandExt,'sym::allow, sym::warn, sym::deny, sym::forbid, sym::stable, sym::unstable,','only these actual source lint/stability names can be copied from the input'),
  route(callbacks.struct,'self.create_derived_impl(cx, type_ident, generics, field_tys, methods, is_packed)','the complete struct/union body returns the same item constructor; generated methods occupy its parameter'),
  route(callbacks.enumeration,'self.create_derived_impl(cx, type_ident, generics, field_tys, methods, is_packed)','the complete enum body returns the same item constructor; generated methods occupy its parameter'),
  route(callbacks.create,'let attrs = thin_vec![cx.attr_word(sym::automatically_derived, self.span),];','the constructor adds the actual automatically_derived attribute'),
  route(callbacks.create,'ast::ItemKind::Impl(Box::new(ast::Impl {','every value returned through the final item builder has the concrete Impl discriminant'),
  route(callbacks.create,'items: methods.into_iter().chain(associated_types).collect(),','all generated methods and associated types are children of that Impl'),
  route(callbacks.item,'kind,','the actual item builder preserves its supplied kind'),
 ];
 // Capability uses include signatures only in this count. The emission body
 // contains one push call, with no forwarding/alias/other use of that value.
 const expandBody=text(body(callbacks.expand)),emitBody=text(body(callbacks.expandExt));
 if(expandBody!=='self.expand_ext(cx,mitem,item,push,false);'||(emitBody.match(/\bpush\b/gu)??[]).length!==1)fail('complete generic output capability branch set differs');
 const resolver=requireOriginalImplNamespaceSourcePlan(originalImplNamespaceSourcePlan());guard();
 return freeze({schema:'original-builtin-derived-outer-item-range-v1',dependenciesDigest:dependencies.digest,name,owner,forwards,callbacks,rules,resolver,
  conditionalRange:{emittedCallbackItemKinds:['ItemKind::Impl'],newEnclosingTypeBindings:[],originalInputItemPreservationBySeparateDispatcherProved:false},
  completeDispatch:{callback:callbacks.expandExt,original:dispatchTemplate,completeBodyChecked:true},normalReturns,completeItemBuilder:{callback:callbacks.item,original:builder,completeBodyChecked:true},sourceConstructorSchemas,
  independentObligations:['actual caller AttrLike owner and all competing producers','actual generated outer attribute owners','root MacroNS escape including builtin replacement hygiene','nested expression/statement and associated-item diagnostics'],
  callerOwnerResolved:false,generatedOuterAttributeOwnersResolved:false,macroExportExceptionClosed:false,completeGeneratedOutput:false,namespaceAuthority:false,runtimeAuthority:false,wholeCompilerExecuted:false});
}
export function captureOriginalBuiltinDeriveTypeRange(dependencies,name){
 guard();if(typeof name!=='string')fail('actual registered original name required');const facts=deriveSourcePlan(dependencies,name),token=Object.freeze({schema:'private-original-builtin-derived-outer-item-range-v1'});proofs.set(token,{dependencies,name,facts});return token;
}
export function originalBuiltinDeriveTypeRangeFacts(token,dependencies,name){
 guard();const state=proofs.get(token);if(!state||state.dependencies!==dependencies||state.name!==name)fail('copied foreign or changed original range proof');const current=deriveSourcePlan(dependencies,name);
 if(current.callbacks.entry.original!==state.facts.callbacks.entry.original)fail('complete original callback changed');return current;
}
