// Complete conservative caller flow. This returns DATA, never a private permit.
import {requireOriginalPrimitiveTryFromChecker} from './extensions/host-contracts.mjs';
import {requireBorrowedStandardTextMapType} from './borrowed-standard-map-20261103-native-types.mjs';
import {requireBorrowedString} from './extensions/string-iterators.mjs';
import {metadataDigest} from './extensions/source-links.mjs';
import {withCompleteSourceClosingFence} from './complete-source-closing-fence.mjs';
import {unsupported} from './vendor/meta-language/translation/diagnostics.js';
export function validateBorrowedStandardMapCallerFlow(checker,entry,{current,genuine}){
 requireOriginalPrimitiveTryFromChecker(checker);current();
 const snapshot=metadataDigest({params:entry.params,ret:entry.ret,body:entry.body});
 const fail=(message,node)=>{throw unsupported('borrowed standard-map whole caller',message,node?.span??entry.span);};
 const close=()=>{requireOriginalPrimitiveTryFromChecker(checker);current();if(metadataDigest({params:entry.params,ret:entry.ret,body:entry.body})!==snapshot)fail('complete original body changed',entry);};
 const domain=(type,node)=>{if(type?.kind==='routerStandardTextMap'){requireBorrowedStandardTextMapType(type);return 'map';}if(type?.kind==='bool'&&!type.rustReference&&!type.rustOwnership)return 'bool';if(type?.kind==='string'){requireBorrowedString(type,node?.span);return 'text';}fail('unsupported original input/result domain',node);};
 let cells=100000;const bindings=new Map();
 for(const parameter of entry.params){if(bindings.has(parameter.name))fail('duplicate parameter',parameter);bindings.set(parameter.name,domain(parameter.type,parameter));}
 const visit=(node,env,borrow=false,depth=0)=>{
  if(--cells<0||depth>160)fail('original100000-cell/depth160 bound',node);if(!node||typeof node!=='object')fail('complete checked body required',entry);
  const kind=domain(node.type,node),read=(child,mode=false)=>visit(child,env,mode,depth+1);
  if(node.k==='var'){if(env.get(node.name)!==kind)fail('actual bound parameter/local type differs',node);if(kind==='map'&&!borrow)fail('shared map alias/copy/result theorem remains separate',node);return kind;}
  if(node.k==='lit'){if(kind==='map'||kind==='bool'&&typeof node.value!=='boolean'||kind==='text'&&typeof node.value!=='string')fail('actual scalar literal required',node);return kind;}
  if(node.k==='routerHostCall'){
   if(node.id!=='router_borrowed_text_map_matches_literals'||!genuine(node)||node.args.length<2||node.args.length>66||kind!=='bool')fail('actual private original predicate required',node);
   if(read(node.args[0],true)!=='map'||read(node.args[1])!=='text')fail('actual shared map/key required',node);
   for(const literal of node.args.slice(2))if(literal.k!=='lit'||read(literal)!=='text')fail('pure original scalar literal choices required',literal);return 'bool';
  }
  if(node.k==='let'){if(node.mutable||env.has(node.name))fail('mutable/rebound names require separate assignment theorem',node);const value=read(node.value),inner=new Map(env);inner.set(node.name,value);return visit(node.body,inner,borrow,depth+1);}
  if(node.k==='if'){if(read(node.cond)!=='bool')fail('actual bool condition required',node);const a=visit(node.then,new Map(env),borrow,depth+1),b=visit(node.else,new Map(env),borrow,depth+1);if(a!==b||a!==kind)fail('branch result domains differ',node);return kind;}
  if(node.k==='binary'&&['and','or','eq','ne'].includes(node.op)){const left=read(node.left),right=read(node.right);if(kind!=='bool'||left!==right||['and','or'].includes(node.op)&&left!=='bool')fail('actual scalar boolean operation required',node);return kind;}
  if(node.k==='unary'&&node.op==='not'&&kind==='bool'&&read(node.arg??node.value)==='bool')return kind;
  fail('control/helper/escape requires its separate complete theorem: '+node.k,node);
 };
 return withCompleteSourceClosingFence(()=>{if(domain(entry.ret,entry)!=='bool'||visit(entry.body,bindings)!=='bool')fail('only original bool-returning caller admitted',entry);close();return {checkedCandidateOnly:true,sourceAuthority:false,semanticAuthority:false,visitedCells:100000-cells};},[close]);
}
