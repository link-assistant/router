// Complete no-escape caller flow DATA; never a public source/type permit.
import {requireOriginalPrimitiveTryFromChecker} from './extensions/host-contracts.mjs';
import {requireBorrowedJsonToolType} from './borrowed-json-tool-20261103-native-types.mjs';
import {metadataDigest} from './extensions/source-links.mjs';
import {withCompleteSourceClosingFence} from './complete-source-closing-fence.mjs';
import {unsupported} from './vendor/meta-language/translation/diagnostics.js';
export function validateBorrowedJsonToolCallerFlow(checker,entry,{current,genuine}){
 requireOriginalPrimitiveTryFromChecker(checker);current();const snapshot=metadataDigest({params:entry.params,ret:entry.ret,body:entry.body}),fail=(message,node)=>{throw unsupported('original borrowed JSON predicate whole caller',message,node?.span??entry.span);};
 const close=()=>{requireOriginalPrimitiveTryFromChecker(checker);current();if(metadataDigest({params:entry.params,ret:entry.ret,body:entry.body})!==snapshot)fail('complete original body changed',entry);};
 const domain=(type,node)=>{if(type?.kind==='routerBorrowedJsonTool'){requireBorrowedJsonToolType(type);return 'json';}if(type?.kind==='bool'&&!type.rustReference&&!type.rustOwnership)return 'bool';fail('original JSON or boolean domain required',node);};
 const bindings=new Map();for(const parameter of entry.params){if(bindings.has(parameter.name))fail('duplicate parameter',parameter);bindings.set(parameter.name,domain(parameter.type,parameter));}let cells=100000;
 const visit=(node,env,borrow=false,depth=0)=>{
  if(--cells<0||depth>160||!node||typeof node!=='object')fail('original complete100000-cell/depth160 flow bound',node);const kind=domain(node.type,node),read=child=>visit(child,env,false,depth+1);
  if(node.k==='var'){if(env.get(node.name)!==kind)fail('actual parameter/local domain differs',node);if(kind==='json'&&(!borrow||!entry.params.some(parameter=>parameter.name===node.name&&domain(parameter.type,parameter)==='json')))fail('JSON input must be a direct original parameter root',node);return kind;}
  if(node.k==='lit'&&kind==='bool'&&typeof node.value==='boolean')return kind;
  if(node.k==='routerHostCall'){if(node.id!=='borrowedJsonToolIsTranslatable'||!genuine(node)||node.args.length!==1||kind!=='bool'||visit(node.args[0],env,true,depth+1)!=='json')fail('actual private bool-only predicate required',node);return kind;}
  if(node.k==='let'){if(node.mutable||env.has(node.name)||read(node.value)!=='bool')fail('only immutable fresh boolean locals admitted',node);const inner=new Map(env);inner.set(node.name,'bool');return visit(node.body,inner,borrow,depth+1);}
  if(node.k==='if'){if(read(node.cond)!=='bool')fail('actual boolean condition required',node);const left=visit(node.then,new Map(env),borrow,depth+1),right=visit(node.else,new Map(env),borrow,depth+1);if(left!==kind||right!==kind)fail('complete branch domains differ',node);return kind;}
  if(node.k==='binary'&&['and','or','eq','ne'].includes(node.op)&&kind==='bool'&&read(node.left)==='bool'&&read(node.right)==='bool')return kind;
  if(node.k==='unary'&&node.op==='not'&&kind==='bool'&&read(node.arg??node.value)==='bool')return kind;
  fail('control/helper/escape needs its separate complete theorem: '+node.k,node);
 };
 return withCompleteSourceClosingFence(()=>{if(domain(entry.ret,entry)!=='bool'||visit(entry.body,bindings)!=='bool')fail('only complete bool-returning callers admitted',entry);close();return {sourceAuthority:false,semanticAuthority:false,visitedCells:100000-cells};},[close]);
}
