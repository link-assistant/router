// Private lineage for complete actual compiler visitor macro expansions.
// Expanded functions are never relabelled as contiguous original Rust methods.
import {createHash} from 'node:crypto';
import {builtinAstOriginal,isBuiltinDeriveAstProfile} from './builtin-derive-ast-meta.mjs';
import {originalMacroTrees,originalMacroInvocation,originalMacroTreeText,freezeMacroTree} from './macro-token-trees.mjs';
import {compileDeclarativeMacro,expandDeclarativeMacro,declarativeExpansionLineage,declarativeSubInput} from './declarative-token-macros.mjs';
import {encodeBuiltinSourceMeta,decodeBuiltinSourceMeta} from './builtin-source-meta.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex'),inventories=new WeakMap(),cached=new WeakMap(),functions=new WeakMap(),calls=new WeakMap(),expanded=new WeakMap();
const text=tree=>tree?.kind==='token'?tree.text:tree?.kind==='fragment'&&['ident','lifetime','tt'].includes(tree.fragment)&&tree.trees.length===1?text(tree.trees[0]):null;
const identifier=tree=>typeof text(tree)==='string'&&/^[A-Za-z_][A-Za-z0-9_]*$/u.test(text(tree));
function selectDefinition(source,name,owner){
 const trees=originalMacroTrees(source.source,{maxBytes:256000,maxTokens:32000}),matches=[];
 for(let at=0;at<trees.length;at++)if(text(trees[at])==='macro_rules'&&text(trees[at+1])==='!'&&text(trees[at+2])===name&&trees[at+3]?.delimiter==='{')matches.push(at);
 if(matches.length!==1)throw new TypeError('Original visitor macro definition is absent/ambiguous');const at=matches[0],span={start:trees[at].span.start,end:trees[at+3].span.end},written=source.source.slice(span.start,span.end),definition=compileDeclarativeMacro(written,{name,owner});
 return {source,trees,definition,span,written};
}
function actualInvocation(definition){
 const matches=[];for(let at=0;at<definition.trees.length;at++)if(text(definition.trees[at])===definition.definition.name&&text(definition.trees[at+1])==='!'&&definition.trees[at+2]?.kind==='group')matches.push(at);
 if(matches.length!==1)throw new TypeError('Original visitor macro invocation is absent/ambiguous');const at=matches[0],span={start:definition.trees[at].span.start,end:definition.trees[at+2].span.end},written=definition.source.source.slice(span.start,span.end),input=originalMacroInvocation(written),expansion=expandDeclarativeMacro(definition.definition,input.trees);
 if(declarativeExpansionLineage(expansion).definition!==definition.definition)throw new TypeError('Original visitor expansion lost its actual definition lineage');return {...definition,invocationSpan:span,invocationSource:written,input,expansion};
}
function indexFunctions(expansion){
 const result=[];function visit(nodes,path=[]){for(let at=0;at<nodes.length;at++){
  if(text(nodes[at])==='fn'&&identifier(nodes[at+1])){let end=at+2;while(end<nodes.length&&nodes[end]?.delimiter!=='{'&&text(nodes[end])!==';')end++;if(nodes[end]?.delimiter==='{')result.push({name:text(nodes[at+1]),syntax:nodes.slice(at,end+1),bodyPath:[...path,end],definitionTokenPath:[...path,at]});}
  if(nodes[at]?.kind==='group')visit(nodes[at].children,[...path,at]);
 }}visit(expansion.trees);return result;
}
export function builtinVisitorSourceInventory(profile){
 if(!isBuiltinDeriveAstProfile(profile))throw new TypeError('Visitor source requires genuine original compiler profile');if(cached.has(profile))return cached.get(profile);
 const source=builtinAstOriginal(profile,'compiler/rustc_ast/src/visit.rs'),helpers=builtinAstOriginal(profile,'compiler/rustc_ast_ir/src/visit.rs');
 if(!source.source.includes('pub use rustc_ast_ir::{try_visit, visit_opt, walk_list, walk_visitable_list};')||!source.source.includes('pub use rustc_ast_ir::visit::VisitorResult;'))throw new TypeError('Original visitor helper import owners changed');
 const roots=['common_visitor_and_walkers','generate_list_visit_fns'].map(name=>actualInvocation(selectDefinition(source,name,['rustc_ast','visit']))),helperDefinitions=new Map(['try_visit','visit_opt','walk_list','walk_visitable_list'].map(name=>[name,selectDefinition(helpers,name,['rustc_ast_ir'])]));
 // Actual macro_export is retained source evidence. It is not compiler feature
 // or Router namespace authority, and never admits a caller by spelling alone.
 for(const helper of helperDefinitions.values()){const prefix=helpers.source.slice(0,helper.span.start);if(!prefix.trimEnd().endsWith('#[macro_export]'))throw new TypeError('Original visitor helper declaration attribute differs');}
 const nodes=roots.flatMap(root=>indexFunctions(root.expansion).map(row=>({...row,root}))),expansions=roots.map(root=>({source:source.path,sourceSha256:source.sha256,definitionSpan:root.span,definitionDigest:root.definition.digest,invocationSpan:root.invocationSpan,invocationSource:root.invocationSource,expansionDigest:root.expansion.digest,rootTrees:root.expansion.trees.length,remainingBudgets:root.expansion.remainingBudgets,fullExpansionBackingRetainedPrivately:true,ownerVerified:false}));
 const evidence={schema:'original-compiler-visitor-expansion-inventory-v1',profileDigest:profile.digest,source:{path:source.path,sha256:source.sha256},helperSource:{path:helpers.path,sha256:helpers.sha256},expansions,functionInventory:nodes.map(row=>({name:row.name,expansionDigest:row.root.expansion.digest,definitionTokenPath:row.definitionTokenPath,bodyPath:row.bodyPath})),sourceAttributesAndImportsRetained:true,namespaceAuthority:false,visitorRuntimeAuthority:false,generatedImplBehavior:false};const value=freezeMacroTree({...evidence,digest:hash(JSON.stringify(evidence))});inventories.set(value,{profile,roots,nodes,helperDefinitions,source,helpers});cached.set(profile,value);return value;
}
export function builtinVisitorFullExpansions(inventory){const state=inventories.get(inventory);if(!state)throw new TypeError('Visitor backing requires its genuine original inventory');return freezeMacroTree(state.roots.map(root=>({source:root.source.path,sourceSha256:root.source.sha256,definitionSpan:root.span,definition:root.definition,invocationSpan:root.invocationSpan,input:root.input,expansion:root.expansion})));}
export function builtinVisitorExpandedFunction(inventory,name,contains=null){
 const state=inventories.get(inventory);if(!state||typeof name!=='string'||contains!==null&&(typeof contains!=='string'||!contains.length||contains.length>256))throw new TypeError('Visitor callback selection requires genuine inventory and bounded selector');const matches=state.nodes.filter(row=>row.name===name&&(contains===null||row.syntax.map(originalMacroTreeText).join(' ').includes(contains)));if(matches.length!==1)throw new TypeError('Expanded visitor callback is absent/ambiguous: '+name);const row=matches[0],encoded=encodeBuiltinSourceMeta(row.syntax),syntax=decodeBuiltinSourceMeta(encoded);if(JSON.stringify(syntax)!==JSON.stringify(row.syntax))throw new TypeError('Expanded visitor full callback roundtrip changed');
 const evidence={schema:'original-expanded-compiler-visitor-function-v1',inventoryDigest:inventory.digest,source:state.source.path,sourceSha256:state.source.sha256,name,selector:contains,expansionDigest:row.root.expansion.digest,definitionSpan:row.root.span,invocationSpan:row.root.invocationSpan,definitionTokenPath:row.definitionTokenPath,bodyPath:row.bodyPath,syntax,syntaxSha256:hash(JSON.stringify(syntax)),semanticSyntaxRoundTrip:true,spanDomain:'mixed exact original definition/invocation token spans; no synthetic contiguous fn span',namespaceAuthority:false,visitorRuntimeAuthority:false};const value=freezeMacroTree({...evidence,digest:hash(JSON.stringify(evidence))});functions.set(value,{inventory,row});return value;
}
export function assertBuiltinVisitorFunction(inventory,fragment){if(functions.get(fragment)?.inventory!==inventory)throw new TypeError('Visitor callback requires its genuine original expansion inventory');return fragment;}
export function builtinVisitorFunctionText(inventory,fragment){assertBuiltinVisitorFunction(inventory,fragment);return fragment.syntax.map(originalMacroTreeText).join(' ');}
export function builtinVisitorHelperCalls(inventory,fragment){
 assertBuiltinVisitorFunction(inventory,fragment);const state=functions.get(fragment),result=[];
 function visit(nodes,path){for(let at=0;at<nodes.length;at++){if(identifier(nodes[at])&&text(nodes[at+1])==='!'&&nodes[at+2]?.kind==='group'){const name=text(nodes[at]),inputPath=[...path,at+2],evidence={schema:'original-expanded-visitor-helper-call-v1',inventoryDigest:inventory.digest,functionDigest:fragment.digest,name,sourceSha256:nodes[at].sourceSha256,span:{start:nodes[at].span.start,end:(nodes[at+2].span??nodes[at+2].sourceSyntax?.span).end},inputPath,expansionDigest:state.row.root.expansion.digest,sourceOwnerResolved:false};const value=freezeMacroTree({...evidence,digest:hash(JSON.stringify(evidence))});calls.set(value,{inventory,fragment,row:state.row,inputPath,name});result.push(value);at+=2;continue;}if(nodes[at]?.kind==='group')visit(nodes[at].children,[...path,at]);}}
 visit(state.row.syntax.at(-1).children,state.row.bodyPath);return freezeMacroTree(result);
}
export function expandBuiltinVisitorHelper(inventory,call){
 const state=calls.get(call),owner=inventories.get(inventory);if(!state||state.inventory!==inventory||!owner)throw new TypeError('Visitor helper expansion requires a genuine actual callback call');const helper=owner.helperDefinitions.get(state.name);if(!helper)throw new TypeError('Original visitor callback macro owner remains unproved: '+state.name);const input=declarativeSubInput(state.row.root.expansion,state.inputPath),proof=expandDeclarativeMacro(helper.definition,input);expanded.set(proof,{inventory,call,helper});return proof;
}
export function assertBuiltinVisitorHelperExpansion(inventory,call,proof){const state=expanded.get(proof);if(!state||state.inventory!==inventory||state.call!==call)throw new TypeError('Visitor helper output requires its exact original call lineage');return proof;}
