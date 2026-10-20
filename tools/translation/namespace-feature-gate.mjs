// Original crate feature collection precedes expansion. Its negative result
// does not close the independent generated-span allows_unstable exception.
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {originalMacroTrees} from './macro-token-trees.mjs';
import {rustTokens} from './rust-structure.mjs';
import {originalSourceModuleItems,isSourceModuleView} from './source-module-views.mjs';
import {assertResolvedSourceScopeOrigin} from './module-bindings.mjs';
import {originalStaticSourceIntrinsicsUnchanged,originalDataFreezeIntrinsicsUnchanged} from './original-json-intrinsics.mjs';
const root=new URL('./source-profiles/namespace-feature-gate/',import.meta.url);
const initial=originalStaticSourceIntrinsicsUnchanged()&&originalDataFreezeIntrinsicsUnchanged();
const plans=new WeakSet(),proofs=new WeakMap();
const hash=value=>createHash('sha256').update(value).digest('hex');
const fail=message=>{throw new TypeError('Original crate feature gate: '+message);};
const freeze=value=>{if(value&&typeof value==='object'){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;};
function guard(){if(!initial||!originalStaticSourceIntrinsicsUnchanged()||!originalDataFreezeIntrinsicsUnchanged())fail('original source operations changed');}
const compact=value=>rustTokens(value).filter(token=>token.type!=='comment').map(token=>token.text).join('');
function callback(origin,name,selector=null){
 const roots=originalMacroTrees(origin.source,{maxBytes:256000,maxTokens:32000,maxDepth:64}),found=[];
 function visit(nodes){for(let at=0;at<nodes.length;at++){
  if(nodes[at].text==='fn'&&nodes[at+1]?.text===name){let end=at+2;while(end<nodes.length&&!(nodes[end].kind==='group'&&nodes[end].delimiter==='{')&&nodes[end].text!==';')end++;
   if(nodes[end]?.kind==='group'&&nodes[end].delimiter==='{'){const span={start:nodes[at].span.start,end:nodes[end].span.end},original=origin.source.slice(span.start,span.end);if(selector===null||original.includes(selector))found.push({path:origin.path,sourceSha256:origin.sha256,name,span,original,syntax:nodes.slice(at,end+1)});}
  }if(nodes[at].kind==='group')visit(nodes[at].children);
 }}visit(roots);if(found.length!==1)fail('whole original callback absent/ambiguous: '+name);return found[0];
}
function recipe(callback,source,role){const all=compact(callback.original),part=compact(source),at=all.indexOf(part);if(!part||at<0||all.indexOf(part,at+1)>=0)fail('original route differs: '+role);return {callback,source,role,wholeCallbackExecuted:false};}
export function originalCrateFeatureGateSourcePlan(){
 guard();const bytes=readFileSync(new URL('manifest.json',root));if(hash(bytes)!=='9c5da63624ae46f8d68ec88506dd9c6b3df93971f604618292aaa0d13b5cb851')fail('complete original source registry differs');
 const profile=JSON.parse(bytes),sources=profile.sources.map(pin=>{
  const url=new URL(pin.archive,root);if(!url.pathname.startsWith(new URL('./source-profiles/',import.meta.url).pathname))fail('original source path escapes');
  const packed=readFileSync(url);if(packed.length!==pin.archiveBytes||hash(packed)!==pin.archiveSha256)fail('complete original archive differs');
  const raw=gunzipSync(packed,{maxOutputLength:262144});if(raw.length!==pin.bytes||hash(raw)!==pin.sha256)fail('complete original source differs');
  const source=new TextDecoder('utf8',{fatal:true,ignoreBOM:true}).decode(raw);if(hash(source)!==pin.sha256)fail('complete original Unicode source differs');guard();return {...pin,source};
 });
 const select=(suffix,name,selector=null)=>{const rows=sources.filter(row=>row.path.endsWith(suffix));if(rows.length!==1)fail('unique complete compiler source required');return callback(rows[0],name,selector);};
 const callbacks={collect:select('expand/src/config.rs','features'),preconfigure:select('expand/src/config.rs','pre_configure_attrs'),conditional:select('expand/src/config.rs','process_cfg_attr'),expandConditional:select('expand/src/config.rs','expand_cfg_attr'),
  create:select('interface/src/passes.rs','create_and_enter_global_ctxt'),expand:select('interface/src/passes.rs','configure_and_expand'),language:select('feature/src/unstable.rs','set_enabled_lang_feature'),library:select('feature/src/unstable.rs','set_enabled_lib_feature'),enabled:select('feature/src/unstable.rs','enabled'),
  gate:select('ast_passes/src/feature_gate.rs','visit_attribute'),allowInternal:select('passes/src/check_attr.rs','check_allow_internal_unstable'),syntax:select('expand/src/base.rs','new','let allow_internal_unstable ='),expansion:select('expand/src/base.rs','expn_data')};
 const recipes=[
  recipe(callbacks.collect,'let mut features = Features::default();','collector starts from the original default feature set'),
  recipe(callbacks.collect,'if attr.has_name(sym::feature) && let Some(list) = attr.meta_item_list() { list } else { ThinVec::new() }','only preconfigured original feature lists enter the collector'),
  recipe(callbacks.preconfigure,'attrs.iter().flat_map(|attr| strip_unconfigured.process_cfg_attr(attr)).take_while(|attr| !is_cfg(attr) || strip_unconfigured.cfg_true(attr).0).collect()','original cfg_attr alternatives precede feature collection; cfg may truncate'),
  recipe(callbacks.conditional,'if attr.has_name(sym::cfg_attr) { self.expand_cfg_attr(attr, true) } else { vec![attr.clone()] }','ordinary original attributes are unchanged'),
  recipe(callbacks.expandConditional,'flat_map(|item| self.process_cfg_attr(&self.expand_cfg_attr_item(cfg_attr, item)))','all nested original cfg_attr alternatives recurse'),
  recipe(callbacks.create,'feed.features_query(tcx.arena.alloc(rustc_expand::config::features(tcx.sess, &pre_configured_attrs, crate_name,))); feed.crate_for_resolver(tcx.arena.alloc(Steal::new((krate, pre_configured_attrs))));','immutable feature query is fed before the crate enters resolver expansion'),
  recipe(callbacks.expand,'let features = tcx.features();','expansion reads the already collected feature query'),
  recipe(callbacks.expand,'ecx.monotonic_expander().expand_crate(krate)','original full crate expansion follows feature collection'),
  recipe(callbacks.language,'self.enabled_features.insert(lang_feat.gate_name);','language setter records only its supplied symbol'),
  recipe(callbacks.library,'self.enabled_features.insert(lib_feat.gate_name);','library setter records only its supplied symbol'),
  recipe(callbacks.enabled,'self.enabled_features.contains(&feature)','feature lookup is exact set membership'),
  recipe(callbacks.gate,'gate_alt!(self, check(self.features), *feature, attr.span, *message, *notes);','post-expansion builtin gate includes the original attribute span'),
  recipe(callbacks.allowInternal,'if attr.is_proc_macro_attr() { return; }','procedural macro definitions may carry allow_internal_unstable'),
  recipe(callbacks.syntax,'let allow_internal_unstable = find_attr!(attrs, AttributeKind::AllowInternalUnstable(i) => i).map(|i| i.as_slice()).unwrap_or_default();','syntax extensions retain their own original internal feature permissions'),
  recipe(callbacks.expansion,'self.allow_internal_unstable.clone(),','expansion hygiene carries the extension permissions'),
 ];
 const gateSource=sources.find(row=>row.path.endsWith('ast_passes/src/feature_gate.rs')),builtinSource=sources.find(row=>row.path.endsWith('feature/src/builtin_attrs.rs')),unstable=sources.find(row=>row.path.endsWith('feature/src/unstable.rs'));
 const required=[
  [gateSource,'if !$has_feature && !$span.allows_unstable($name)','gate also permits a privileged generated span'],
  [builtinSource,'check: Features::$gate,','gated registration calls the actual Features method'],
  [builtinSource,'rustc_attr!(rustc_builtin_macro, Normal, template!(Word, List: "name, /*opt*/ attributes(name1, name2, ...)"), ErrorFollowing, EncodeCrossCrate::Yes,)','builtin replacement attribute retains its exact original registration'],
  [unstable,'#[derive(Clone, Default, Debug)] pub struct Features','original set receiver has its real Default owner obligation'],
 ];
 for(const [origin,source,role] of required){if(!compact(origin.source).includes(compact(source)))fail('complete source route differs: '+role);recipes.push({path:origin.path,sourceSha256:origin.sha256,source,role,wholeCallbackExecuted:false});}
 const plan=freeze({schema:'original-crate-feature-gate-source-plan-v1',profileSha256:hash(bytes),compilerCommit:profile.compilerCommit,sources,callbacks,recipes,
  gateBranches:['feature enabled','feature absent and span allows_unstable','feature absent and span unprivileged: diagnostic'],
  obligations:['Features::default empty-set owner','generated attribute span provenance','actual external procedural owner','post-expansion error route'],
  namespaceAuthority:false,runtimeAuthority:false,wholeCompilerExecuted:false});guard();plans.add(plan);return plan;
}
export function requireOriginalCrateFeatureGateSourcePlan(plan){guard();if(!plans.has(plan))fail('copied or foreign source plan');const fresh=originalCrateFeatureGateSourcePlan();if(plan.profileSha256!==fresh.profileSha256)fail('original compiler profile changed');return plan;}
function split(nodes){const rows=[[]];for(const node of nodes){if(node.text===',')rows.push([]);else rows.at(-1).push(node);}if(!rows.at(-1).length)rows.pop();return rows;}
function identifier(nodes){if(nodes[0]?.text==='r'&&nodes[1]?.text==='#'&&nodes[2]?.type==='ident')return {name:nodes[2].text,used:3};if(nodes[0]?.kind==='token'&&/^[_A-Za-z][_A-Za-z0-9]*$/u.test(nodes[0].text))return {name:nodes[0].text,used:1};return null;}
function alternatives(nodes,feature,budget,depth=0){
 if(depth>64||++budget.cells>20000)fail('original attribute recursion exceeds bound');const id=identifier(nodes);if(!id||id.name==='unsafe')fail('original attribute name/safety remains unproved');
 const tail=nodes.slice(id.used);if(id.name==='cfg_attr'){
  if(tail.length!==1||tail[0]?.delimiter!=='(')fail('complete original cfg_attr list required');const parts=split(tail[0].children);if(parts.length<2||parts.some(part=>!part.length))fail('complete original cfg_attr alternatives required');
  return {name:id.name,predicate:parts[0],branches:['absent','all original present alternatives'],attributes:parts.slice(1).map(part=>alternatives(part,feature,budget,depth+1))};
 }
 if(id.name==='feature'){
  if(tail.length!==1||tail[0]?.delimiter!=='(')fail('complete original feature list required');const names=split(tail[0].children).map(part=>{const value=identifier(part);if(!value||value.used!==part.length)fail('original feature syntax remains unproved');return value.name;});
  if(names.includes(feature))fail('requested feature occurs in an original configuration alternative');return {name:id.name,features:names};
 }
 return {name:id.name,original:nodes};
}
function inspect(state){
 guard();assertResolvedSourceScopeOrigin(state.binding.scopes,{modules:state.modules,compilationProfile:state.profile});
 const roots=state.modules.filter(module=>Array.isArray(module.path)&&module.path.length===0);if(roots.length!==1||!isSourceModuleView(roots[0].sourceView))fail('one genuine complete original crate root required');
 const module=roots[0];originalSourceModuleItems(module);const trees=originalMacroTrees(module.source,{maxBytes:256000,maxTokens:32000,maxDepth:64}),attributes=[],budget={cells:0};
 for(let at=0;at<trees.length;at++)if(trees[at].text==='#'&&trees[at+1]?.text==='!'){
  const group=trees[at+2];if(group?.delimiter!=='[')fail('complete original inner attribute required');attributes.push({span:{start:trees[at].span.start,end:group.span.end},alternatives:alternatives(group.children,state.feature,budget)});at+=2;
 }
 const sourcePlan=originalCrateFeatureGateSourcePlan(),facts=freeze({schema:'original-crate-feature-syntax-absence-v1',source:module.file,sourceSha256:hash(module.source),sourceViewDigest:module.sourceView.digest,feature:state.feature,attributes,sourcePlan,
  allOriginalCfgAlternativesRetained:true,originalFeatureNameAbsent:true,featureDefaultOwnerProved:false,generatedSpanExceptionClosed:false,attributeGateClosed:false,namespaceAuthority:false,runtimeAuthority:false});
 assertResolvedSourceScopeOrigin(state.binding.scopes,{modules:state.modules,compilationProfile:state.profile});guard();return facts;
}
// This private source result deliberately cannot issue enabled=false or an
// attribute-owner certificate until the Default and hygiene joins are proved.
export function captureOriginalCrateFeatureAbsence({modules,binding,compilationProfile=null,feature}={}){
 guard();if(typeof feature!=='string'||!/^[_A-Za-z][_A-Za-z0-9]*$/u.test(feature))fail('original requested feature name required');
 const state={modules,binding,profile:compilationProfile,feature},facts=inspect(state),token=Object.freeze({schema:'private-original-crate-feature-syntax-absence-v1'});proofs.set(token,{state,facts});return token;
}
export function originalCrateFeatureAbsenceFacts(token){guard();const state=proofs.get(token);if(!state)fail('copied or foreign feature source proof');const facts=inspect(state.state);if(facts.sourceSha256!==state.facts.sourceSha256||facts.sourceViewDigest!==state.facts.sourceViewDigest||facts.feature!==state.facts.feature)fail('original feature source changed');return facts;}
