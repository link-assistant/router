// A conditional sibling module is not a selected conditional caller. Original
// parser/resolver scope restoration owns this distinction; cfg stays unknown.
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {sourceItems,rustTokens} from './rust-structure.mjs';
import {originalSourceModuleItems,moduleScopeKey,isSourceModuleView} from './source-module-views.mjs';
import {isResolvedSourceScopeSet,assertResolvedSourceScopeOrigin} from './module-bindings.mjs';
import {itemConfiguration,compilationProfile} from './cfg-profile.mjs';
import {planConditionalModuleSourcePath,isTrackedModulePathPlan} from './module-paths.mjs';
import {originalMacroTrees,originalMacroInvocation} from './macro-token-trees.mjs';
import {compileDeclarativeMacro,expandDeclarativeMacro} from './declarative-token-macros.mjs';
import {builtinStandardDeriveRegistry,builtinStandardDeriveSourceOwner} from './builtin-derive-standard-inputs.mjs';
import {isDeriveDependencyProof} from './derive-dependencies.mjs';
import {macroBindingAffects} from './macro-subnamespaces.mjs';
import {originalLexingIntrinsicsUnchanged} from './original-lexing-intrinsics.mjs';
import {originalDeriveHelperCryptoUnchanged} from './derive-footprints.mjs';
import {createPrivateFrozenJsonCache} from './private-frozen-json.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta} from './concrete-syntax-meta.mjs';
import {originalPrivateParserIngressUnchanged,originalStaticSourceIntrinsicsUnchanged,originalDataFreezeIntrinsicsUnchanged} from './original-json-intrinsics.mjs';
const sourceWitnessJson=createPrivateFrozenJsonCache();
const root=new URL('./source-profiles/derive-ancestor-scope/',import.meta.url),profileBytes=readFileSync(new URL('manifest.json',root)),profile=JSON.parse(profileBytes);
const hash=value=>createHash('sha256').update(value).digest('hex'),freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;},same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const fail=message=>{throw new TypeError('Original conditional ancestor: '+message);},contexts=new WeakMap(),proofs=new WeakMap(),plans=new WeakSet();
const significant=tokens=>tokens.filter(token=>token.type!=='comment'),words=source=>significant(rustTokens(source)).map(token=>token.text).join('');
const originals=new Map(profile.sources.map(pin=>{
 const url=new URL(pin.archive,root);if(!url.pathname.startsWith(new URL('./source-profiles/',import.meta.url).pathname))fail('source archive escapes its retained profiles');
 const packed=readFileSync(url),raw=gunzipSync(packed,{maxOutputLength:180000});if(packed.length!==pin.archiveBytes||hash(packed)!==pin.archiveSha256||raw.length!==pin.bytes||hash(raw)!==pin.sha256)fail('complete original source archive differs');
 const source=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(raw);if(hash(source)!==pin.sha256)fail('original Unicode decoding differs');return [pin.path,freeze({...pin,source})];
}));
// Parse each immutable original input once into an inventory. This holds no
// caller result or namespace permission; every context/selection is separate.
const functionInputs=new Map([...originals].filter(([path])=>path.endsWith('.rs')).map(([path,origin])=>{
 const found=[];
 function scan(items,offset,owner){for(const item of items){
  const tokens=significant(item.tokens);if(item.term==='fn')found.push({item,offset,owner});
  if(item.term==='impl'){const open=tokens.find(token=>token.text==='{'),close=tokens.at(-1);if(open&&close?.text==='}')scan(sourceItems(origin.source.slice(offset+open.end,offset+close.start)),offset+open.end,words(origin.source.slice(offset+item.start,offset+open.start)));}
 }}scan(sourceItems(origin.source),0,null);
 return [path,freeze(found)];
}));
function originalFunction(path,name,ownerPart=null){
 const origin=originals.get(path),found=functionInputs.get(path).filter(row=>row.item.name===name&&(!ownerPart||row.owner?.includes(ownerPart)));
 if(found.length!==1)fail('original callback absent/ambiguous: '+path+'::'+name);
 const {item,offset,owner}=found[0],span={start:offset+item.start,end:offset+item.end};return freeze({path,sourceSha256:origin.sha256,name,owner,span,original:origin.source.slice(span.start,span.end)});
}
function recipe(callback,original,role){
 const normalized=words(callback.original),expected=words(original);if(!expected||normalized.indexOf(expected)<0||normalized.indexOf(expected)!==normalized.lastIndexOf(expected))fail('original callback recipe differs: '+role);
 return {role,callback,selectedOriginal:original,selectedTokenSequence:expected,wholeCallbackExecuted:false};
}
export function originalConditionalAncestorSourcePlan(){
 const graph='compiler/rustc_resolve/src/build_reduced_graph.rs',macros='compiler/rustc_resolve/src/macros.rs',config='compiler/rustc_expand/src/config.rs';
 const selections={module:originalFunction(graph,'build_reduced_graph_for_item','BuildReducedGraphVisitor'),visit:originalFunction(graph,'visit_item','Visitor'),defineMacro:originalFunction(graph,'define_macro','BuildReducedGraphVisitor'),define:originalFunction(graph,'define','Resolver'),collector:originalFunction('compiler/rustc_resolve/src/def_collector.rs','visit_item','Visitor'),compileMacro:originalFunction(macros,'compile_macro','Resolver'),compileDeclarative:originalFunction('compiler/rustc_expand/src/mbe/macro_rules.rs','compile_declarative_macro'),macroKind:originalFunction('compiler/rustc_expand/src/base.rs','macro_kind','SyntaxExtension'),subnamespace:originalFunction(macros,'sub_namespace_match'),configure:originalFunction(config,'configure','StripUnconfigured'),inCfg:originalFunction(config,'in_cfg','StripUnconfigured'),parser:originalFunction('compiler/rustc_parse/src/parser/item.rs','parse_item_mod','Parser')};
 const recipes=[
  recipe(selections.module,`let parent_scope = &self.parent_scope; let parent = parent_scope.module;`,'actual original parent binding'),
  recipe(selections.module,`ItemKind::Mod(_, ident, ref mod_kind) => { let module = self.r.new_module(Some(parent), ModuleKind::Def(def_kind, def_id, Some(ident.name)), expansion.to_expn_id(), item.span, parent.no_implicit_prelude || ast::attr::contains_name(&item.attrs, sym::no_implicit_prelude),); self.r.define(parent, ident, TypeNS, (module, vis, sp, expansion)); if let ast::ModKind::Loaded(_, _, _, Err(_)) = mod_kind { self.r.mods_with_parse_errors.insert(def_id); } self.parent_scope.module = module; }`,'one parent module-name TypeNS binding; child body scope'),
  recipe(selections.visit,`let orig_module_scope = self.parent_scope.module;`,'actual original parent save'),
  recipe(selections.visit,`match item.kind { ItemKind::Mod(..) if self.contains_macro_use(&item.attrs) => { self.parent_scope.macro_rules } _ => orig_macro_rules_scope, }`,'original macro-use exception and ordinary textual scope restoration'),
  recipe(selections.visit,`self.parent_scope.module = orig_module_scope;`,'original parent module restoration'),
  recipe(selections.defineMacro,`self.r.define(self.r.graph_root, ident, MacroNS, import_binding);`,'global exported macro binding retained'),
  recipe(selections.defineMacro,`self.r.define(module, ident, MacroNS, (res, vis, span, expansion));`,'ordinary macro namespace remains in original child module'),
  recipe(selections.collector,`let macro_data = self.resolver.compile_macro(def, *ident, &attrs, i.span, i.id, edition); let macro_kind = macro_data.ext.macro_kind(); opt_macro_data = Some(macro_data); DefKind::Macro(macro_kind)`,'original definition kind from complete compiler source'),
  recipe(selections.compileMacro,`let (mut ext, mut rule_spans) = compile_declarative_macro(self.tcx.sess, self.tcx.features(), macro_def, ident, attrs, span, node_id, edition,);`,'original resolver delegates the complete original definition to its declarative compiler'),
  recipe(selections.compileMacro,`MacroData { ext: Arc::new(ext), rule_spans, macro_rules: macro_def.macro_rules }`,'original returned syntax extension determines the definition kind'),
  recipe(selections.compileDeclarative,`SyntaxExtensionKind::LegacyBang(expander)`,'original declarative macro successful/dummy backend kind'),
  recipe(selections.macroKind,`SyntaxExtensionKind::Bang(..) | SyntaxExtensionKind::LegacyBang(..) | SyntaxExtensionKind::GlobDelegation(..) => MacroKind::Bang,`,'original Bang kind'),
  recipe(selections.subnamespace,`MacroKind::Bang => SubNS::Bang, MacroKind::Attr | MacroKind::Derive => SubNS::AttrLike,`,'original Bang versus requested AttrLike subnamespace'),
  recipe(selections.configure,`self.process_cfg_attrs(&mut node); self.in_cfg(node.attrs()).then(|| { self.try_configure_tokens(&mut node); node })`,'original absent or unchanged-present node; no cfg branch selected'),
  recipe(selections.inCfg,`attrs.iter().all(|attr| !is_cfg(attr) || self.cfg_true(attr).0)`,'original node configuration predicate'),
  recipe(selections.parser,`let ident = self.parse_ident()?; let mod_kind = if self.eat(exp!(Semi)) { ModKind::Unloaded } else { self.expect(exp!(OpenBrace))?; let (inner_attrs, items, inner_span) = self.parse_mod(exp!(CloseBrace))?; attrs.extend(inner_attrs); ModKind::Loaded(items, Inline::Yes, inner_span, Ok(())) }; Ok(ItemKind::Mod(safety, ident, mod_kind))`,'original module identifier and external/inline AST branches'),
 ];
 const value=freeze({schema:'original-conditional-ancestor-source-plan-v1',profileSha256:hash(profileBytes),sourceInputs:profile.sources,selections,recipes,cfgBranches:['absent','unchanged original present module'],retainedUncompiledBranches:['compile_macro builtin replacement','proc_macro_stub','unknown child contents','unknown global bang exports','conditional availability','compiler error routes'],namespaceAuthority:false,runtimeAuthority:false,wholeCompilerExecuted:false});plans.add(value);return value;
}
export function requireOriginalConditionalAncestorSourcePlan(value){if(!plans.has(value))fail('copied or foreign source plan');return value;}
// Reuse the same complete pinned resolver input, without changing any existing
// conditional-sibling plan or treating its public namespace flags as authority.
const implPlans=new WeakSet(),implStringPrototype=Object.getPrototypeOf(''),implIncludes=Object.getOwnPropertyDescriptor(implStringPrototype,'includes');
let cachedImplPlan=null;
function reusableImplPlan(){
 if(!originalLexingIntrinsicsUnchanged()||!originalDeriveHelperCryptoUnchanged()||!implIncludes||!Object.hasOwn(implIncludes,'value'))return false;
 const current=Object.getOwnPropertyDescriptor(implStringPrototype,'includes');
 return current&&Object.hasOwn(current,'value')&&current.value===implIncludes.value&&current.writable===implIncludes.writable&&current.enumerable===implIncludes.enumerable&&current.configurable===implIncludes.configurable&&Reflect.apply(Function.prototype.toString,implIncludes.value,[])==='function includes() { [native code] }';
}
export function originalImplNamespacePlanCacheFacts(){return Object.freeze({eligible:!!reusableImplPlan(),cached:cachedImplPlan!==null,callerOutputsCached:false});}
export function originalImplNamespaceSourcePlan(){
 // Only the immutable, privately pinned compiler-source witness is shared.
 // Any observable non-native/changed operation retains the complete old path.
 if(reusableImplPlan()&&cachedImplPlan!==null)return requireOriginalImplNamespaceSourcePlan(cachedImplPlan);
 const graph='compiler/rustc_resolve/src/build_reduced_graph.rs';
 const selections={item:originalFunction(graph,'build_reduced_graph_for_item','BuildReducedGraphVisitor'),associated:originalFunction(graph,'visit_assoc_item','Visitor'),block:originalFunction(graph,'visit_block','Visitor')};
 const recipes=[
  recipe(selections.item,`ItemKind::Impl(box Impl { of_trait: Some(..), .. }) | ItemKind::Impl { .. } | ItemKind::ForeignMod(..) | ItemKind::GlobalAsm(..) => {}`,'actual Impl alternatives add no enclosing module names'),
  recipe(selections.item,`ItemKind::Const(box ConstItem { ident, .. }) | ItemKind::Delegation(box Delegation { ident, .. }) | ItemKind::Static(box StaticItem { ident, .. }) => { self.r.define(parent, ident, ValueNS, (res, vis, sp, expansion)); }`,'a const declares only its actual identifier in ValueNS'),
  recipe(selections.associated,`if ctxt == AssocCtxt::Trait { let parent = self.parent_scope.module; let expansion = self.parent_scope.expansion; self.r.define(parent, ident, ns, (self.res(def_id), vis, item.span, expansion)); } else if !matches!(&item.kind, AssocItemKind::Delegation(deleg) if deleg.from_glob) { let impl_def_id = self.r.tcx.local_parent(local_def_id); let key = BindingKey::new(ident.normalize_to_macros_2_0(), ns); self.r.impl_binding_keys.entry(impl_def_id).or_default().insert(key); }`,'actual impl associated names stay in impl_binding_keys rather than enclosing module'),
  recipe(selections.block,`let orig_current_module = self.parent_scope.module; let orig_current_macro_rules_scope = self.parent_scope.macro_rules; self.build_reduced_graph_for_block(block); visit::walk_block(self, block); self.parent_scope.module = orig_current_module; self.parent_scope.macro_rules = orig_current_macro_rules_scope;`,'actual block restores enclosing module and textual macro scope'),
 ];
 const value=freeze({schema:'original-impl-enclosing-namespace-source-plan-v1',profileSha256:hash(profileBytes),selections,recipes,wholeCompilerExecuted:false,namespaceAuthority:false,runtimeAuthority:false});implPlans.add(value);if(reusableImplPlan())cachedImplPlan=value;return value;
}
export function requireOriginalImplNamespaceSourcePlan(value){if(!implPlans.has(value))fail('copied or foreign impl namespace source plan');return value;}
// Complete native resolver source witness; no caller verdict is retained.
const enumPlans=new WeakSet();
export function originalEnumNamespaceSourcePlan(){
 const path='compiler/rustc_resolve/src/build_reduced_graph.rs';
 const selections={item:originalFunction(path,'build_reduced_graph_for_item','BuildReducedGraphVisitor'),variant:originalFunction(path,'visit_variant','Visitor'),visit:originalFunction(path,'visit_item','Visitor')};
 const recipes=[
  recipe(selections.item,`ItemKind::Enum(ident, _, _) | ItemKind::Trait(box ast::Trait { ident, .. }) => { let module = self.r.new_module(Some(parent), ModuleKind::Def(def_kind, def_id, Some(ident.name)), expansion.to_expn_id(), item.span, parent.no_implicit_prelude,); self.r.define(parent, ident, TypeNS, (module, vis, sp, expansion)); self.parent_scope.module = module; }`,'original generic parameters do not alter the enclosing enum TypeNS binding'),
  recipe(selections.variant,`if variant.is_placeholder { self.visit_invoc_in_module(variant.id); return; }`,'unexpanded variants remain independent obligations'),
  recipe(selections.variant,`self.r.define(parent, ident, TypeNS, (self.res(def_id), vis, variant.span, expn_id));`,'original variant type name in its actual enum namespace'),
  recipe(selections.variant,`if let Some(ctor_node_id) = variant.data.ctor_node_id() { let feed = self.r.feed(ctor_node_id); let ctor_def_id = feed.key(); let ctor_res = self.res(ctor_def_id); self.r.define(parent, ident, ValueNS, (ctor_res, ctor_vis, variant.span, expn_id)); self.r.feed_visibility(feed, ctor_vis); }`,'only actual tuple/unit constructors bind the value namespace'),
  recipe(selections.visit,`self.parent_scope.module = orig_module_scope;`,'original enum visitor restores the enclosing parent namespace'),
 ];
 const value=freeze({schema:'original-enum-namespace-source-plan-v1',profileSha256:hash(profileBytes),selections,recipes,namespaceAuthority:false,runtimeAuthority:false,genericTypeValidity:false,wholeCompilerExecuted:false});enumPlans.add(value);return value;
}
export function requireOriginalEnumNamespaceSourcePlan(value){if(!enumPlans.has(value))fail('copied or foreign enum namespace source plan');return value;}

export function createOriginalAncestorAttributeScopeContext({modules,binding,dependencies}={}){
 if(!Array.isArray(modules)||!isResolvedSourceScopeSet(binding?.scopes)||binding.scopes.length!==modules.length||!isDeriveDependencyProof(dependencies))fail('complete private resolver and dependency source scopes required');
 assertResolvedSourceScopeOrigin(binding.scopes,{modules,compilationProfile:binding.compilationProfile});
 const snapshots=modules.map(module=>{originalSourceModuleItems(module);const scope=binding.scopes.find(scope=>moduleScopeKey(scope)===moduleScopeKey(module));if(!scope||scope.file!==module.file||!same(scope.compilationProfile,compilationProfile(module.compilationProfile)))fail('original module resolver scope differs');return freeze({file:module.file,path:[...module.path],source:module.source,sourceView:module.sourceView,directory:module.directory,pathDirectory:module.pathDirectory,compilationProfile:module.compilationProfile,configurationCondition:module.configurationCondition??'active'});});
 const plan=originalConditionalAncestorSourcePlan(),registry=builtinStandardDeriveRegistry(dependencies),context=freeze({schema:'private-original-ancestor-scope-context-v1',sourcePlanDigest:hash(JSON.stringify(plan)),sources:snapshots.map(module=>({source:module.file,module:module.path,sourceSha256:hash(module.source),sourceViewDigest:module.sourceView?.digest??null})),namespaceAuthority:false,runtimeAuthority:false});contexts.set(context,{snapshots,binding,plan,dependencies,registry,attributeDefinition:null,attributeSources:new Map(),childSources:new Map()});return context;
}
function actualModule(state,module){const rows=state.snapshots.filter(row=>moduleScopeKey(row)===moduleScopeKey(module));if(rows.length!==1||rows[0].source!==module.source||rows[0].sourceView!==module.sourceView||!same(rows[0].compilationProfile,module.compilationProfile)||rows[0].configurationCondition!==(module.configurationCondition??'active'))fail('caller original source/view/profile/condition differs');originalSourceModuleItems(module);return rows[0];}
function requestedOwners(requests){
 if(!Array.isArray(requests)||!requests.length||requests.length>128)fail('bounded actual requested owners required');
 return requests.map(request=>{const properties=Object.getOwnPropertyDescriptors(request);if(Object.getOwnPropertySymbols(request).length||Object.keys(properties).sort().join(',')!=='name,namespace'||Object.values(properties).some(row=>!('value' in row)))fail('requested owner needs plain namespace/name data');const {name,namespace}=request;if(!['type','attribute'].includes(namespace)||typeof name!=='string'||name.length>128||!/^[\p{XID_Start}_][\p{XID_Continue}_]*$/u.test(name))fail('requested source owner syntax differs');return {namespace,name};});
}
function originalBuiltinAttribute(state,name){
 if(state.attributeSources.has(name))return state.attributeSources.get(name);
 const origin=originals.get('compiler/rustc_feature/src/builtin_attrs.rs'),items=sourceItems(origin.source),rows=items.filter(row=>row.term==='static'&&row.name==='BUILTIN_ATTRIBUTES');if(rows.length!==1)fail('original builtin attribute registry absent/ambiguous');
 const row=rows[0],trees=originalMacroTrees(origin.source.slice(row.start,row.end)),array=trees.filter(tree=>tree.kind==='group'&&tree.delimiter==='[').at(-1),candidates=[];if(!array)fail('original builtin attribute array differs');
 for(let at=0;at<array.children.length;at++)if(array.children[at].text==='ungated'&&array.children[at+1]?.text==='!'&&array.children[at+2]?.delimiter==='('&&array.children[at+2].children[0]?.text===name)candidates.push({group:array.children[at+2],start:row.start+array.children[at].span.start,end:row.start+array.children[at+2].span.end});
 if(candidates.length!==1)fail('child attribute lacks one actual ungated builtin registration: '+name);
 const selected=candidates[0],original=origin.source.slice(selected.start,selected.end),invocation=originalMacroInvocation(original),definition=state.attributeDefinition??=compileDeclarativeMacro(origin.source,{name:'ungated',owner:['rustc_feature','builtin_attrs']}),expansion=expandDeclarativeMacro(definition,invocation.trees);
 const value=freeze({path:origin.path,sourceSha256:origin.sha256,registrySpan:{start:row.start,end:row.end},definition,originalInvocation:{...invocation,sourceSpan:{start:selected.start,end:selected.end},original,originalGroup:selected.group},expansion,registeredBuiltinOnly:true,attributeBehaviorExecuted:false});state.attributeSources.set(name,value);return value;
}
function childAttributeSources(state,owner,row){
 const tokens=significant(row.tokens),proofs=[];
 for(let at=0;at<tokens.length;at++){
  if(tokens[at].text!=='#')continue;let begin=at,next=at+1;if(tokens[next]?.text==='!')next++;
  if(tokens[next]?.text!=='[')fail('child attribute boundary differs');let depth=0,end=next;for(;end<tokens.length;end++){if(tokens[end].text==='[')depth++;if(tokens[end].text===']'&&!--depth)break;}if(depth)fail('child attribute boundary is incomplete');
  const condition=itemConfiguration(tokens.slice(begin,end+1),owner.compilationProfile),attribute=condition.attributes[0];if(!attribute||condition.diagnostics.length)fail('child attribute configuration syntax is unproved');
  if(attribute.name==='cfg_attr'||['rustc_builtin_macro','proc_macro','proc_macro_attribute','proc_macro_derive','feature'].includes(attribute.name))fail('conditional child retains internal/procedural macro kind effects');
  const ancestors=state.binding.scopes.filter(scope=>scope.path.every((name,index)=>owner.path[index]===name));if(ancestors.some(scope=>scope.bindings.some(binding=>binding.name===attribute.name&&macroBindingAffects(binding,'attribute'))||scope.unresolvedImports.some(entry=>entry.glob||entry.name===attribute.name)))fail('child builtin attribute owner is shadowed/imported');
  if(attribute.name==='derive'){
   const body=tokens.slice(next+2,end),names=body.slice(1,-1);if(body[0]?.text!=='('||body.at(-1)?.text!==')'||!names.length)fail('child standard derive list is unproved');
   let needName=true;const selected=[];for(const token of names){if(needName){if(token.type!=='ident')fail('child procedural/qualified derive remains unproved');const sourceOwner=builtinStandardDeriveSourceOwner(state.registry,state.dependencies,token.text);if(ancestors.some(scope=>scope.bindings.some(binding=>binding.name===token.text&&macroBindingAffects(binding,'attribute'))||scope.unresolvedImports.some(entry=>entry.glob||entry.name===token.text)))fail('child standard derive owner is shadowed/imported');selected.push(sourceOwner);needName=false;}else{if(token.text!==',')fail('child procedural/qualified derive remains unproved');needName=true;}}
   proofs.push({attribute,selectedOriginalOwners:selected,sourceRegistryDigest:state.registry.digest,generatedOutputsCompiled:false});
  }else proofs.push({attribute,originalRegistration:originalBuiltinAttribute(state,attribute.name)});
  at=end;
 }
 return proofs;
}
// References are storage only. The complete original plan and expansions
// stay in the authenticated context; no digest can issue a namespace proof.
function sourceReference(value){const original=sourceWitnessJson(value);return {sha256:hash(original),bytes:Buffer.byteLength(original)};}
function sourcePlanReference(plan){return freeze({schema:'original-conditional-source-plan-reference-v1',...sourceReference(plan),profileSha256:plan.profileSha256,
 selections:Object.fromEntries(Object.entries(plan.selections).map(([name,callback])=>[name,{path:callback.path,sourceSha256:callback.sourceSha256,name:callback.name,owner:callback.owner,span:callback.span,originalSha256:hash(callback.original)}])),
 recipes:plan.recipes.map(row=>({role:row.role,callback:sourceReference(row.callback),selectedOriginalSha256:hash(row.selectedOriginal),selectedTokenSequenceSha256:hash(row.selectedTokenSequence),wholeCallbackExecuted:row.wholeCallbackExecuted})),
 wholeCompilerExecuted:false,namespaceAuthority:false,runtimeAuthority:false});}
function childAttributeReferences(rows){return rows.map(row=>({...row,attributes:row.attributes.map(attribute=>({attribute:attribute.attribute,
 ...(attribute.originalRegistration?{originalRegistration:{schema:'original-conditional-builtin-registration-reference-v1',...sourceReference(attribute.originalRegistration),path:attribute.originalRegistration.path,sourceSha256:attribute.originalRegistration.sourceSha256,registrySpan:attribute.originalRegistration.registrySpan,invocationSpan:attribute.originalRegistration.originalInvocation.sourceSpan,registeredBuiltinOnly:true,attributeBehaviorExecuted:false}}:{}),
 ...(attribute.selectedOriginalOwners?{selectedOriginalOwners:attribute.selectedOriginalOwners.map(owner=>({schema:'original-conditional-standard-owner-reference-v1',...sourceReference(owner),target:owner.target})),sourceRegistryDigest:attribute.sourceRegistryDigest,generatedOutputsCompiled:false}:{})
 }))}));}
export function proveOriginalConditionalSiblingScope({context,module,item,caller,requests}={}){
 const state=contexts.get(context);if(!state)fail('scope context is copied or unissued');const parent=actualModule(state,module),actualCaller=actualModule(state,caller),owners=requestedOwners(requests);
 if(parent.configurationCondition!=='active'||!parent.path.every((name,index)=>actualCaller.path[index]===name)||actualCaller.configurationCondition!=='active'||!isSourceModuleView(parent.sourceView))fail('conditional target or enclosing caller remains unproved');
 const original=originalSourceModuleItems(parent).find(row=>row.start===item?.start&&row.end===item?.end);if(!original||original.term!=='mod'||!same(original,item))fail('complete original conditional module declaration differs');
 const condition=itemConfiguration(original.tokens,parent.compilationProfile);if(condition.status!=='unknown'||condition.diagnostics.length||!condition.attributes.length||condition.attributes.some(attribute=>attribute.name!=='cfg'||attribute.evaluation?.value!==null||attribute.evaluation.diagnostics.length))fail('conditional declaration has an unproved attribute effect');
 const scope=state.binding.scopes.find(scope=>moduleScopeKey(scope)===moduleScopeKey(parent));
 if(scope.unresolvedImports.some(entry=>entry.glob||owners.some(owner=>owner.name===entry.name))||scope.bindings.some(binding=>owners.some(owner=>owner.name===binding.name&&(owner.namespace==='attribute'&&macroBindingAffects(binding,'attribute')||owner.namespace==='type'&&binding.namespace==='type'))))fail('conditional scope can affect the requested original owner through an imported, ambiguous or shadowing binding');
 const paths=[...new Set(state.snapshots.map(row=>row.file))],plan=planConditionalModuleSourcePath(parent,original,paths);if(!isTrackedModulePathPlan(plan)||plan.inline||plan.explicitPath!==null||plan.availabilitySelected!==false)fail('plain unique external conditional source candidate required');
 const target=[...parent.path,plan.name];if(target.every((name,index)=>actualCaller.path[index]===name)||owners.some(owner=>owner.name===plan.name))fail('conditional module can affect the requested original owner');
 const child=state.snapshots.filter(row=>same(row.path,target)&&row.file===plan.target);if(child.length!==1||child[0].configurationCondition!=='unknown'||!isSourceModuleView(child[0].sourceView))fail('complete genuine conditional child candidate required');originalSourceModuleItems(child[0]);
 const bindings=scope.bindings.filter(row=>row.name===plan.name);if(bindings.length!==1||bindings[0].namespace!=='type'||bindings[0].kind!=='mod'||bindings[0].status!=='unresolved'||bindings[0].source!==parent.file||!same(bindings[0].span,plan.span)||bindings[0].target!==null)fail('conditional declaration namespace binding is absent/ambiguous');
 // Internal builtin substitutions can change a macro kind. They are not
 // covered by the ordinary original declarative Bang route retained above.
 const affected=state.snapshots.filter(row=>target.every((name,index)=>row.path[index]===name));for(const owner of affected)originalSourceModuleItems(owner);
 let childAttributes=state.childSources.get(moduleScopeKey(child[0]));if(!childAttributes){childAttributes=[];for(const owner of affected)for(const row of originalSourceModuleItems(owner)){const config=itemConfiguration(row.tokens,owner.compilationProfile);if(config.status==='inactive')continue;childAttributes.push({source:owner.file,module:owner.path,itemSpan:{start:row.start,end:row.end},attributes:childAttributeSources(state,owner,row)});}freeze(childAttributes);state.childSources.set(moduleScopeKey(child[0]),childAttributes);}
 const fullEvidence=freeze({schema:'original-conditional-sibling-owner-scope-v1',source:parent.file,module:parent.path,sourceSha256:hash(parent.source),sourceViewDigest:parent.sourceView.digest,span:plan.span,declarationSha256:plan.declarationSha256,original:parent.source.slice(original.start,original.end),caller:{source:actualCaller.file,module:actualCaller.path,sourceSha256:hash(actualCaller.source),sourceViewDigest:actualCaller.sourceView?.digest??null},requests:owners,sourcePlan:state.plan,sourcePathPlan:plan,originalBinding:bindings[0],child:{source:child[0].file,module:target,sourceSha256:hash(child[0].source),sourceViewDigest:child[0].sourceView.digest,configurationCondition:'unknown',contentsComplete:false},childAttributes,cfgBranches:['absent','unchanged original present module'],requestedOwnerUnchanged:true,conditionalAvailabilitySelected:false,globalBangComplete:false,unresolvedGlobalBangEffectsRetained:true,childContentsComplete:false,namespaceAuthority:false,runtimeAuthority:false});const value=freeze({...fullEvidence,sourcePlan:sourcePlanReference(state.plan),childAttributes:childAttributeReferences(childAttributes),fullEvidenceReference:{schema:'original-conditional-sibling-full-evidence-reference-v1',...sourceReference(fullEvidence)}});proofs.set(value,{context,module:parent,caller:actualCaller,item:original,requests:owners,fullEvidence});return value;
}
export function assertOriginalConditionalSiblingScope(value,context,module,item,caller,requests){const state=proofs.get(value);if(!state||state.context!==context||moduleScopeKey(state.module)!==moduleScopeKey(module)||moduleScopeKey(state.caller)!==moduleScopeKey(caller)||!same(state.requests,requestedOwners(requests)))fail('copied, changed or foreign conditional sibling proof');const fresh=proveOriginalConditionalSiblingScope({context,module,item,caller,requests});if(!same(value,fresh))fail('original conditional sibling scope changed');return value;}

// Authenticate the actual caller and every original source join before exposing
// complete retained evidence. Copied metadata is never an accessor capability.
export function originalConditionalSiblingScopeEvidence(value,context,module,item,caller,requests){assertOriginalConditionalSiblingScope(value,context,module,item,caller,requests);return proofs.get(value).fullEvidence;}


// Independent finite source DATA. No caller context and no shared verdict cache.
export function originalDerivedOuterBuiltinAttributeRegistrations(){
 const check=()=>{if(!derivedAttributeCatalogueNative||!originalLexingIntrinsicsUnchanged()||!originalDeriveHelperCryptoUnchanged()||!originalPrivateParserIngressUnchanged()||!originalStaticSourceIntrinsicsUnchanged()||!originalDataFreezeIntrinsicsUnchanged())fail('original attribute catalogue operations changed');};check();
 const manifest=readFileSync(new URL('manifest.json',root));if(hash(manifest)!=='9113a635e5534c083dbc3af97ef815040fc916548a245e5477941873f7dc62f5'||!manifest.equals(profileBytes))fail('complete current builtin attribute inventory differs');
 const path='compiler/rustc_feature/src/builtin_attrs.rs',origin=originals.get(path),pin=profile.sources.find(row=>row.path===path);if(!pin||!origin)fail('actual complete builtin attribute source absent');
 const archiveURL=new URL(pin.archive,root),packed=readFileSync(archiveURL),raw=gunzipSync(packed,{maxOutputLength:180000}),source=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(raw);
 if(packed.length!==pin.archiveBytes||hash(packed)!==pin.archiveSha256||raw.length!==pin.bytes||hash(raw)!==pin.sha256||source!==origin.source)fail('complete current builtin attribute source differs');
 const state={attributeSources:new Map(),attributeDefinition:null},names=['automatically_derived','allow','warn','deny','forbid','stable','unstable'],registrations=names.map(name=>({name,registration:originalBuiltinAttribute(state,name)}));
 const concrete=transportConcreteSyntaxSource(source,{language:'Rust'});if(transportConcreteSyntaxMeta(concrete.meta).source!==source)fail('complete builtin attribute concrete inverse differs');
 const registry=sourceItems(source).filter(row=>row.term==='static'&&row.name==='BUILTIN_ATTRIBUTES');if(registry.length!==1)fail('one complete actual builtin attribute array required');const header=significant(registry[0].tokens),staticAt=header.findIndex(token=>token.text==='static');if(staticAt<0||header.slice(0,staticAt).some(token=>token.text==='cfg'||token.text==='cfg_attr'))fail('actual builtin attribute array availability remains conditional');
 const trees=originalMacroTrees(source.slice(registry[0].start,registry[0].end)),array=trees.filter(tree=>tree.delimiter==='[').at(-1);if(!array)fail('complete source attribute array absent');
 for(const {registration}of registrations){const at=array.children.findIndex(node=>registry[0].start+node.span.start===registration.originalInvocation.sourceSpan.start);if(at<0||at>0&&array.children[at-1].text!==','||array.children[at+3]?.text!==',')fail('actual ungated registration has another enclosing attribute or element boundary');}
 if(!readFileSync(new URL('manifest.json',root)).equals(manifest)||!readFileSync(archiveURL).equals(packed))fail('complete builtin attribute inputs changed during source proof');check();
 return freeze({schema:'original-derived-outer-builtin-attribute-registrations-v1',path,source,sourceSha256:pin.sha256,manifestSha256:hash(manifest),concreteSyntax:concrete.meta,inverse:source,registrations,sourceAuthority:false,namespaceAuthority:false,runtimeAuthority:false,callerOwnerResolved:false,attributeBehaviorExecuted:false,crossInvocationCache:false});
}
const derivedAttributeCatalogueNative=originalLexingIntrinsicsUnchanged()&&originalDeriveHelperCryptoUnchanged()&&originalPrivateParserIngressUnchanged()&&originalStaticSourceIntrinsicsUnchanged()&&originalDataFreezeIntrinsicsUnchanged();

// Separate literal metadata registration domain; original catalogue stays exact.
export function originalSourceMetadataBuiltinAttributeRegistrations(){
 const check=()=>{if(!derivedAttributeCatalogueNative||!originalLexingIntrinsicsUnchanged()||!originalDeriveHelperCryptoUnchanged()||!originalPrivateParserIngressUnchanged()||!originalStaticSourceIntrinsicsUnchanged()||!originalDataFreezeIntrinsicsUnchanged())fail('original attribute catalogue operations changed');};check();
 const manifest=readFileSync(new URL('manifest.json',root));if(hash(manifest)!=='9113a635e5534c083dbc3af97ef815040fc916548a245e5477941873f7dc62f5'||!manifest.equals(profileBytes))fail('complete current builtin attribute inventory differs');
 const path='compiler/rustc_feature/src/builtin_attrs.rs',origin=originals.get(path),pin=profile.sources.find(row=>row.path===path);if(!pin||!origin)fail('actual complete builtin attribute source absent');
 const archiveURL=new URL(pin.archive,root),packed=readFileSync(archiveURL),raw=gunzipSync(packed,{maxOutputLength:180000}),source=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(raw);
 if(packed.length!==pin.archiveBytes||hash(packed)!==pin.archiveSha256||raw.length!==pin.bytes||hash(raw)!==pin.sha256||source!==origin.source)fail('complete current builtin attribute source differs');
 const state={attributeSources:new Map(),attributeDefinition:null},names=['automatically_derived','allow','warn','deny','forbid','stable','unstable','target_feature'],registrations=names.map(name=>({name,registration:originalBuiltinAttribute(state,name)}));
 const concrete=transportConcreteSyntaxSource(source,{language:'Rust'});if(transportConcreteSyntaxMeta(concrete.meta).source!==source)fail('complete builtin attribute concrete inverse differs');
 const registry=sourceItems(source).filter(row=>row.term==='static'&&row.name==='BUILTIN_ATTRIBUTES');if(registry.length!==1)fail('one complete actual builtin attribute array required');const header=significant(registry[0].tokens),staticAt=header.findIndex(token=>token.text==='static');if(staticAt<0||header.slice(0,staticAt).some(token=>token.text==='cfg'||token.text==='cfg_attr'))fail('actual builtin attribute array availability remains conditional');
 const trees=originalMacroTrees(source.slice(registry[0].start,registry[0].end)),array=trees.filter(tree=>tree.delimiter==='[').at(-1);if(!array)fail('complete source attribute array absent');
 for(const {registration}of registrations){const at=array.children.findIndex(node=>registry[0].start+node.span.start===registration.originalInvocation.sourceSpan.start);if(at<0||at>0&&array.children[at-1].text!==','||array.children[at+3]?.text!==',')fail('actual ungated registration has another enclosing attribute or element boundary');}
 if(!readFileSync(new URL('manifest.json',root)).equals(manifest)||!readFileSync(archiveURL).equals(packed))fail('complete builtin attribute inputs changed during source proof');check();
 return freeze({schema:'original-derived-outer-builtin-attribute-registrations-v1',path,source,sourceSha256:pin.sha256,manifestSha256:hash(manifest),concreteSyntax:concrete.meta,inverse:source,registrations,sourceAuthority:false,namespaceAuthority:false,runtimeAuthority:false,callerOwnerResolved:false,attributeBehaviorExecuted:false,crossInvocationCache:false});
}

export function originalModuleMacroUseBuiltinAttributeRegistrations(){
 const check=()=>{if(!derivedAttributeCatalogueNative||!originalLexingIntrinsicsUnchanged()||!originalDeriveHelperCryptoUnchanged()||!originalPrivateParserIngressUnchanged()||!originalStaticSourceIntrinsicsUnchanged()||!originalDataFreezeIntrinsicsUnchanged())fail('original attribute catalogue operations changed');};check();
 const manifest=readFileSync(new URL('manifest.json',root));if(hash(manifest)!=='9113a635e5534c083dbc3af97ef815040fc916548a245e5477941873f7dc62f5'||!manifest.equals(profileBytes))fail('complete current builtin attribute inventory differs');
 const path='compiler/rustc_feature/src/builtin_attrs.rs',origin=originals.get(path),pin=profile.sources.find(row=>row.path===path);if(!pin||!origin)fail('actual complete builtin attribute source absent');
 const archiveURL=new URL(pin.archive,root),packed=readFileSync(archiveURL),raw=gunzipSync(packed,{maxOutputLength:180000}),source=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(raw);
 if(packed.length!==pin.archiveBytes||hash(packed)!==pin.archiveSha256||raw.length!==pin.bytes||hash(raw)!==pin.sha256||source!==origin.source)fail('complete current builtin attribute source differs');
 const state={attributeSources:new Map(),attributeDefinition:null},names=['macro_use'],registrations=names.map(name=>({name,registration:originalBuiltinAttribute(state,name)}));
 const concrete=transportConcreteSyntaxSource(source,{language:'Rust'});if(transportConcreteSyntaxMeta(concrete.meta).source!==source)fail('complete builtin attribute concrete inverse differs');
 const registry=sourceItems(source).filter(row=>row.term==='static'&&row.name==='BUILTIN_ATTRIBUTES');if(registry.length!==1)fail('one complete actual builtin attribute array required');const header=significant(registry[0].tokens),staticAt=header.findIndex(token=>token.text==='static');if(staticAt<0||header.slice(0,staticAt).some(token=>token.text==='cfg'||token.text==='cfg_attr'))fail('actual builtin attribute array availability remains conditional');
 const trees=originalMacroTrees(source.slice(registry[0].start,registry[0].end)),array=trees.filter(tree=>tree.delimiter==='[').at(-1);if(!array)fail('complete source attribute array absent');
 for(const {registration}of registrations){const at=array.children.findIndex(node=>registry[0].start+node.span.start===registration.originalInvocation.sourceSpan.start);if(at<0||at>0&&array.children[at-1].text!==','||array.children[at+3]?.text!==',')fail('actual ungated registration has another enclosing attribute or element boundary');}
 if(!readFileSync(new URL('manifest.json',root)).equals(manifest)||!readFileSync(archiveURL).equals(packed))fail('complete builtin attribute inputs changed during source proof');check();
 return freeze({schema:'original-module-macro-use-builtin-registration-v1',path,source,sourceSha256:pin.sha256,manifestSha256:hash(manifest),concreteSyntax:concrete.meta,inverse:source,registrations,sourceAuthority:false,namespaceAuthority:false,runtimeAuthority:false,callerOwnerResolved:false,attributeBehaviorExecuted:false,crossInvocationCache:false});
}

// Fresh complete source joins for the native word-only module macro_use branch.
// The source plan remains DATA and issues no caller or namespace capability.
export function originalModuleMacroUseSourcePlan(){
 const check=()=>{if(!derivedAttributeCatalogueNative||!originalLexingIntrinsicsUnchanged()||!originalDeriveHelperCryptoUnchanged()||!originalPrivateParserIngressUnchanged()||!originalStaticSourceIntrinsicsUnchanged()||!originalDataFreezeIntrinsicsUnchanged())fail('original module macro-use source operations changed');};check();
 const manifest=readFileSync(new URL('manifest.json',root));if(!manifest.equals(profileBytes)||hash(manifest)!=='9113a635e5534c083dbc3af97ef815040fc916548a245e5477941873f7dc62f5')fail('complete original resolver inventory differs');const inputs=[];let retainedSourceBytes=manifest.length;
 for(const pin of profile.sources){const url=new URL(pin.archive,root),packed=readFileSync(url),raw=gunzipSync(packed,{maxOutputLength:180000}),source=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(raw);if(packed.length!==pin.archiveBytes||hash(packed)!==pin.archiveSha256||raw.length!==pin.bytes||hash(raw)!==pin.sha256||source!==originals.get(pin.path)?.source)fail('complete actual resolver source differs');retainedSourceBytes+=packed.length+raw.length;if(retainedSourceBytes>8388608)fail('complete resolver source byte bound exceeded');const concrete=transportConcreteSyntaxSource(source,{language:'Rust'});if(transportConcreteSyntaxMeta(concrete.meta).source!==source)fail('complete native resolver source inverse differs');inputs.push({path:pin.path,url,packed,source,concreteSyntax:concrete.meta});}
 const original=originalConditionalAncestorSourcePlan();requireOriginalConditionalAncestorSourcePlan(original);const callback=originalFunction('compiler/rustc_resolve/src/build_reduced_graph.rs','contains_macro_use','BuildReducedGraphVisitor'),selected=[
  recipe(callback,'else if !attr.has_name(sym::macro_use) { continue; }','actual original literal macro-use name branch'),
  recipe(callback,'if !attr.is_word() { self.r.dcx().emit_err(errors::ArgumentsMacroUseNotAllowed { span: attr.span }); } return true;','original plain word accepted; argument forms retain compiler errors'),
 ];
 for(const row of inputs)if(!readFileSync(row.url).equals(row.packed))fail('complete resolver sources changed during proof');if(!readFileSync(new URL('manifest.json',root)).equals(manifest))fail('complete resolver inventory changed during proof');check();
 return freeze({...original,schema:'original-word-module-macro-use-source-plan-v1',selections:{...original.selections,containsMacroUse:callback},recipes:[...original.recipes,...selected],currentSources:inputs.map(({path,source,concreteSyntax})=>({path,source,concreteSyntax,inverse:source})),requiresOriginalPlainOuterModuleWord:true,requiresCompleteChildTextualScope:true,retainedSourceBytes,namespaceAuthority:false,runtimeAuthority:false,wholeCompilerExecuted:false,crossInvocationCache:false});
}

export function originalTextualConfigurationSourcePlan(){
 const check=()=>{if(!derivedAttributeCatalogueNative||!originalLexingIntrinsicsUnchanged()||!originalDeriveHelperCryptoUnchanged()||!originalPrivateParserIngressUnchanged()||!originalStaticSourceIntrinsicsUnchanged()||!originalDataFreezeIntrinsicsUnchanged())fail('original module macro-use source operations changed');};check();
 const manifest=readFileSync(new URL('manifest.json',root));if(!manifest.equals(profileBytes)||hash(manifest)!=='9113a635e5534c083dbc3af97ef815040fc916548a245e5477941873f7dc62f5')fail('complete original resolver inventory differs');const inputs=[];let retainedSourceBytes=manifest.length;
 for(const pin of profile.sources){const url=new URL(pin.archive,root),packed=readFileSync(url),raw=gunzipSync(packed,{maxOutputLength:180000}),source=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(raw);if(packed.length!==pin.archiveBytes||hash(packed)!==pin.archiveSha256||raw.length!==pin.bytes||hash(raw)!==pin.sha256||source!==originals.get(pin.path)?.source)fail('complete actual resolver source differs');retainedSourceBytes+=packed.length+raw.length;if(retainedSourceBytes>8388608)fail('complete resolver source byte bound exceeded');const concrete=transportConcreteSyntaxSource(source,{language:'Rust'});if(transportConcreteSyntaxMeta(concrete.meta).source!==source)fail('complete native resolver source inverse differs');inputs.push({path:pin.path,url,packed,source,concreteSyntax:concrete.meta});}
 const original=originalConditionalAncestorSourcePlan();requireOriginalConditionalAncestorSourcePlan(original);const config='compiler/rustc_expand/src/config.rs',callbacks={cfgTrue:originalFunction(config,'cfg_true','StripUnconfigured'),processCfgAttr:originalFunction(config,'process_cfg_attr','StripUnconfigured'),expandCfgAttr:originalFunction(config,'expand_cfg_attr','StripUnconfigured')},selected=[
  recipe(callbacks.processCfgAttr,'if attr.has_name(sym::cfg_attr) { self.expand_cfg_attr(attr, true) } else { vec![attr.clone()] }','actual original conditional attribute selection'),
  recipe(callbacks.expandCfgAttr,'if !attr::cfg_matches(&cfg_predicate, &self.sess, self.lint_node_id, self.features) { return vec![trace_attr]; }','false original cfg_attr has no selected source attribute; compiler lint trace remains separate'),
 ];
 for(const row of inputs)if(!readFileSync(row.url).equals(row.packed))fail('complete resolver sources changed during proof');if(!readFileSync(new URL('manifest.json',root)).equals(manifest))fail('complete resolver inventory changed during proof');check();
 return freeze({...original,schema:'original-textual-configuration-source-plan-v1',selections:{...original.selections,...callbacks},recipes:[...original.recipes,...selected],currentSources:inputs.map(({path,source,concreteSyntax})=>({path,source,concreteSyntax,inverse:source})),requiresActualOriginalOuterCondition:true,requiresExplicitThreeValuedProfile:true,compilerDiagnosticTracePreserved:false,retainedSourceBytes,namespaceAuthority:false,runtimeAuthority:false,wholeCompilerExecuted:false,crossInvocationCache:false});
}

export function originalLiteralDocumentationBuiltinAttributeRegistrations(){
 const check=()=>{if(!derivedAttributeCatalogueNative||!originalLexingIntrinsicsUnchanged()||!originalDeriveHelperCryptoUnchanged()||!originalPrivateParserIngressUnchanged()||!originalStaticSourceIntrinsicsUnchanged()||!originalDataFreezeIntrinsicsUnchanged())fail('original attribute catalogue operations changed');};check();
 const manifest=readFileSync(new URL('manifest.json',root));if(hash(manifest)!=='9113a635e5534c083dbc3af97ef815040fc916548a245e5477941873f7dc62f5'||!manifest.equals(profileBytes))fail('complete current builtin attribute inventory differs');
 const path='compiler/rustc_feature/src/builtin_attrs.rs',origin=originals.get(path),pin=profile.sources.find(row=>row.path===path);if(!pin||!origin)fail('actual complete builtin attribute source absent');
 const archiveURL=new URL(pin.archive,root),packed=readFileSync(archiveURL),raw=gunzipSync(packed,{maxOutputLength:180000}),source=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(raw);
 if(packed.length!==pin.archiveBytes||hash(packed)!==pin.archiveSha256||raw.length!==pin.bytes||hash(raw)!==pin.sha256||source!==origin.source)fail('complete current builtin attribute source differs');
 const state={attributeSources:new Map(),attributeDefinition:null},names=['doc'],registrations=names.map(name=>({name,registration:originalBuiltinAttribute(state,name)}));
 const concrete=transportConcreteSyntaxSource(source,{language:'Rust'});if(transportConcreteSyntaxMeta(concrete.meta).source!==source)fail('complete builtin attribute concrete inverse differs');
 const registry=sourceItems(source).filter(row=>row.term==='static'&&row.name==='BUILTIN_ATTRIBUTES');if(registry.length!==1)fail('one complete actual builtin attribute array required');const header=significant(registry[0].tokens),staticAt=header.findIndex(token=>token.text==='static');if(staticAt<0||header.slice(0,staticAt).some(token=>token.text==='cfg'||token.text==='cfg_attr'))fail('actual builtin attribute array availability remains conditional');
 const trees=originalMacroTrees(source.slice(registry[0].start,registry[0].end)),array=trees.filter(tree=>tree.delimiter==='[').at(-1);if(!array)fail('complete source attribute array absent');
 for(const {registration}of registrations){const at=array.children.findIndex(node=>registry[0].start+node.span.start===registration.originalInvocation.sourceSpan.start);if(at<0||at>0&&array.children[at-1].text!==','||array.children[at+3]?.text!==',')fail('actual ungated registration has another enclosing attribute or element boundary');}
 if(!readFileSync(new URL('manifest.json',root)).equals(manifest)||!readFileSync(archiveURL).equals(packed))fail('complete builtin attribute inputs changed during source proof');check();
 return freeze({schema:'original-literal-documentation-builtin-registration-v1',path,source,sourceSha256:pin.sha256,manifestSha256:hash(manifest),concreteSyntax:concrete.meta,inverse:source,registrations,sourceAuthority:false,namespaceAuthority:false,runtimeAuthority:false,callerOwnerResolved:false,attributeBehaviorExecuted:false,crossInvocationCache:false});
}

// Fresh complete source joins for the native word-only module macro_use branch.
// The source plan remains DATA and issues no caller or namespace capability.

export function originalActiveTextualConfigurationSourcePlan(){
 const check=()=>{if(!derivedAttributeCatalogueNative||!originalLexingIntrinsicsUnchanged()||!originalDeriveHelperCryptoUnchanged()||!originalPrivateParserIngressUnchanged()||!originalStaticSourceIntrinsicsUnchanged()||!originalDataFreezeIntrinsicsUnchanged())fail('original module macro-use source operations changed');};check();
 const manifest=readFileSync(new URL('manifest.json',root));if(!manifest.equals(profileBytes)||hash(manifest)!=='9113a635e5534c083dbc3af97ef815040fc916548a245e5477941873f7dc62f5')fail('complete original resolver inventory differs');const inputs=[];let retainedSourceBytes=manifest.length;
 for(const pin of profile.sources){const url=new URL(pin.archive,root),packed=readFileSync(url),raw=gunzipSync(packed,{maxOutputLength:180000}),source=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(raw);if(packed.length!==pin.archiveBytes||hash(packed)!==pin.archiveSha256||raw.length!==pin.bytes||hash(raw)!==pin.sha256||source!==originals.get(pin.path)?.source)fail('complete actual resolver source differs');retainedSourceBytes+=packed.length+raw.length;if(retainedSourceBytes>8388608)fail('complete resolver source byte bound exceeded');const concrete=transportConcreteSyntaxSource(source,{language:'Rust'});if(transportConcreteSyntaxMeta(concrete.meta).source!==source)fail('complete native resolver source inverse differs');inputs.push({path:pin.path,url,packed,source,concreteSyntax:concrete.meta});}
 const original=originalConditionalAncestorSourcePlan();requireOriginalConditionalAncestorSourcePlan(original);const config='compiler/rustc_expand/src/config.rs',callbacks={cfgTrue:originalFunction(config,'cfg_true','StripUnconfigured'),processCfgAttr:originalFunction(config,'process_cfg_attr','StripUnconfigured'),expandCfgAttrItem:originalFunction(config,'expand_cfg_attr_item','StripUnconfigured'),expandCfgAttr:originalFunction(config,'expand_cfg_attr','StripUnconfigured')},selected=[
  recipe(callbacks.processCfgAttr,'if attr.has_name(sym::cfg_attr) { self.expand_cfg_attr(attr, true) } else { vec![attr.clone()] }','actual original conditional attribute selection'),
  recipe(callbacks.expandCfgAttr,'if !attr::cfg_matches(&cfg_predicate, &self.sess, self.lint_node_id, self.features) { return vec![trace_attr]; }','false original cfg_attr has no selected source attribute; compiler lint trace remains separate'),
  recipe(callbacks.expandCfgAttr,'let expanded_attrs = expanded_attrs.into_iter().flat_map(|item| self.process_cfg_attr(&self.expand_cfg_attr_item(cfg_attr, item))); iter::once(trace_attr).chain(expanded_attrs).collect()','actual recursive native conditional payload order; diagnostic trace remains separate'),
  recipe(callbacks.expandCfgAttrItem,'let mut trees = if cfg_attr.style == AttrStyle::Inner','actual original inner/outer conditional output style'),
  recipe(callbacks.expandCfgAttrItem,'let attr = ast::attr::mk_attr_from_item(&self.sess.psess.attr_id_generator, item, tokens, cfg_attr.style, item_span);','actual original conditional payload attribute constructor'),

 ];
 for(const row of inputs)if(!readFileSync(row.url).equals(row.packed))fail('complete resolver sources changed during proof');if(!readFileSync(new URL('manifest.json',root)).equals(manifest))fail('complete resolver inventory changed during proof');check();
 return freeze({...original,schema:'original-active-textual-configuration-source-plan-v1',selections:{...original.selections,...callbacks},recipes:[...original.recipes,...selected],currentSources:inputs.map(({path,source,concreteSyntax})=>({path,source,concreteSyntax,inverse:source})),requiresActualOriginalOuterCondition:true,requiresExplicitThreeValuedProfile:true,compilerDiagnosticTracePreserved:false,retainedSourceBytes,namespaceAuthority:false,runtimeAuthority:false,wholeCompilerExecuted:false,crossInvocationCache:false});
}

export function originalCommonBuiltinAttributeRegistrations(){
 const check=()=>{if(!derivedAttributeCatalogueNative||!originalLexingIntrinsicsUnchanged()||!originalDeriveHelperCryptoUnchanged()||!originalPrivateParserIngressUnchanged()||!originalStaticSourceIntrinsicsUnchanged()||!originalDataFreezeIntrinsicsUnchanged())fail('original attribute catalogue operations changed');};check();
 const manifest=readFileSync(new URL('manifest.json',root));if(hash(manifest)!=='9113a635e5534c083dbc3af97ef815040fc916548a245e5477941873f7dc62f5'||!manifest.equals(profileBytes))fail('complete current builtin attribute inventory differs');
 const path='compiler/rustc_feature/src/builtin_attrs.rs',origin=originals.get(path),pin=profile.sources.find(row=>row.path===path);if(!pin||!origin)fail('actual complete builtin attribute source absent');
 const archiveURL=new URL(pin.archive,root),packed=readFileSync(archiveURL),raw=gunzipSync(packed,{maxOutputLength:180000}),source=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(raw);
 if(packed.length!==pin.archiveBytes||hash(packed)!==pin.archiveSha256||raw.length!==pin.bytes||hash(raw)!==pin.sha256||source!==origin.source)fail('complete current builtin attribute source differs');
 const state={attributeSources:new Map(),attributeDefinition:null},names=["automatically_derived","allow","warn","deny","forbid","stable","unstable","inline","cold","must_use","deprecated","track_caller","repr","non_exhaustive","target_feature"],registrations=names.map(name=>({name,registration:originalBuiltinAttribute(state,name)}));
 const concrete=transportConcreteSyntaxSource(source,{language:'Rust'});if(transportConcreteSyntaxMeta(concrete.meta).source!==source)fail('complete builtin attribute concrete inverse differs');
 const registry=sourceItems(source).filter(row=>row.term==='static'&&row.name==='BUILTIN_ATTRIBUTES');if(registry.length!==1)fail('one complete actual builtin attribute array required');const header=significant(registry[0].tokens),staticAt=header.findIndex(token=>token.text==='static');if(staticAt<0||header.slice(0,staticAt).some(token=>token.text==='cfg'||token.text==='cfg_attr'))fail('actual builtin attribute array availability remains conditional');
 const trees=originalMacroTrees(source.slice(registry[0].start,registry[0].end)),array=trees.filter(tree=>tree.delimiter==='[').at(-1);if(!array)fail('complete source attribute array absent');
 for(const {registration}of registrations){const at=array.children.findIndex(node=>registry[0].start+node.span.start===registration.originalInvocation.sourceSpan.start);if(at<0||at>0&&array.children[at-1].text!==','||array.children[at+3]?.text!==',')fail('actual ungated registration has another enclosing attribute or element boundary');}
 if(!readFileSync(new URL('manifest.json',root)).equals(manifest)||!readFileSync(archiveURL).equals(packed))fail('complete builtin attribute inputs changed during source proof');check();
 return freeze({schema:'original-common-builtin-attribute-registrations-v1',path,source,sourceSha256:pin.sha256,manifestSha256:hash(manifest),concreteSyntax:concrete.meta,inverse:source,registrations,sourceAuthority:false,namespaceAuthority:false,runtimeAuthority:false,callerOwnerResolved:false,attributeBehaviorExecuted:false,crossInvocationCache:false});
}

// Exact current compressed originals suffice to rejoin the already pinned raw
// source bytes. This function issues no owner, namespace or executable proof.
export function originalAncestorAttributeSourceInputsCurrent(){
 const check=()=>{if(!derivedAttributeCatalogueNative||!originalLexingIntrinsicsUnchanged()||!originalDeriveHelperCryptoUnchanged()||!originalPrivateParserIngressUnchanged()||!originalStaticSourceIntrinsicsUnchanged()||!originalDataFreezeIntrinsicsUnchanged())fail('original ancestor source operations changed');};check();const manifest=readFileSync(new URL('manifest.json',root));if(hash(manifest)!=='9113a635e5534c083dbc3af97ef815040fc916548a245e5477941873f7dc62f5'||!manifest.equals(profileBytes))fail('complete current ancestor source inventory differs');let retainedSourceBytes=manifest.length;for(const pin of profile.sources){const packed=readFileSync(new URL(pin.archive,root));if(packed.length!==pin.archiveBytes||hash(packed)!==pin.archiveSha256)fail('complete current ancestor source archive differs');retainedSourceBytes+=pin.archiveBytes+pin.bytes;if(retainedSourceBytes>8388608)fail('complete original ancestor source input bound');check();}if(!readFileSync(new URL('manifest.json',root)).equals(manifest))fail('complete original ancestor inventory changed during rejoin');check();return {schema:'current-original-ancestor-source-inputs-v1',retainedSourceBytes,sourceAuthority:false,namespaceAuthority:false,runtimeAuthority:false,crossInvocationCache:false};
}
