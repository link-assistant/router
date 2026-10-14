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
 const value=freeze({schema:'original-conditional-sibling-owner-scope-v1',source:parent.file,module:parent.path,sourceSha256:hash(parent.source),sourceViewDigest:parent.sourceView.digest,span:plan.span,declarationSha256:plan.declarationSha256,original:parent.source.slice(original.start,original.end),caller:{source:actualCaller.file,module:actualCaller.path,sourceSha256:hash(actualCaller.source),sourceViewDigest:actualCaller.sourceView?.digest??null},requests:owners,sourcePlan:state.plan,sourcePathPlan:plan,originalBinding:bindings[0],child:{source:child[0].file,module:target,sourceSha256:hash(child[0].source),sourceViewDigest:child[0].sourceView.digest,configurationCondition:'unknown',contentsComplete:false},childAttributes,cfgBranches:['absent','unchanged original present module'],requestedOwnerUnchanged:true,conditionalAvailabilitySelected:false,globalBangComplete:false,unresolvedGlobalBangEffectsRetained:true,childContentsComplete:false,namespaceAuthority:false,runtimeAuthority:false});proofs.set(value,{context,module:parent,caller:actualCaller,item:original,requests:owners});return value;
}
export function assertOriginalConditionalSiblingScope(value,context,module,item,caller,requests){const state=proofs.get(value);if(!state||state.context!==context||moduleScopeKey(state.module)!==moduleScopeKey(module)||moduleScopeKey(state.caller)!==moduleScopeKey(caller)||!same(state.requests,requestedOwners(requests)))fail('copied, changed or foreign conditional sibling proof');const fresh=proveOriginalConditionalSiblingScope({context,module,item,caller,requests});if(!same(value,fresh))fail('original conditional sibling scope changed');return value;}
