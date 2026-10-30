// Only fresh checked declarations from the actual forward capture reach this
// DATA traversal. It does not issue source/type/namespace/execution authority.
import {sameType} from '../checked-types.mjs';
export function checkedOwnedVectorTail(declaration,checkScalar){
 declaration=observeNativeFunctionControl(declaration);
 let work=0,bindings=0;const tails=[];
 function visit(node,names,depth){
  if(++work>4096||depth>64)throw new TypeError('Owned reverse vector origin: bounded checked control required');
  while(node?.k==='let'){
   if(++bindings>64||node.mutable||typeof node.name!=='string'||names.has(node.name)||!sameType(node.type,declaration.ret))throw new TypeError('Owned reverse vector origin: bounded immutable scalar bindings required');
   names.add(node.name);checkScalar(node.value?.type);node=node.body;
  }
  if(node?.k==='if'){
   if(!sameType(node.type,declaration.ret)||node.cond?.type?.kind!=='bool'||node.cond.type.rustReference||node.cond.type.rustGenericIdentityUnresolved)throw new TypeError('Owned reverse vector origin: actual checked bool branches required');
   visit(node.then,new Set(names),depth+1);visit(node.else,new Set(names),depth+1);return;
  }
  if(node?.k!=='array'||node.compatibilityCore?.id!=='router-core-vector-list-v1'||!sameType(node.type,declaration.ret))throw new TypeError('Owned reverse vector origin: complete checked owned array tail required');
  tails.push(node);if(tails.length>64)throw new TypeError('Owned reverse vector origin: bounded branch leaves required');
 }
 visit(declaration.body,new Set(),0);return tails[0];
}

import {observeNativeFunctionControl} from './owned-native-function-control.mjs';

// Routes are source coordinates only. Fresh whole-project scope and original
// source views independently prove the actual empty module on every operation.
export function nativeEmptyModuleRoute(value){
 const fail=message=>{throw new TypeError('Native empty module: '+message);};
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==2||!Object.hasOwn(value,'rustPath')||!Object.hasOwn(value,'module'))fail('exact native file/module route required');
 ownedSourcePath(value.rustPath);if(!value.rustPath.endsWith('.rs')||!Array.isArray(value.module)||value.module.length>64||value.module.some(name=>typeof name!=='string'||!/^[A-Za-z_][A-Za-z0-9_]*$/u.test(name)))fail('bounded complete native module coordinates required');return {rustPath:value.rustPath,module:[...value.module]};
}
export function requireCurrentEmptyNativeModule(project,files,route){
 const {rustPath,module}=nativeEmptyModuleRoute(route),source=files.get(rustPath),same=(a,b)=>JSON.stringify(a)===JSON.stringify(b),fail=message=>{throw new TypeError('Native empty module: '+message);};
 if(typeof source!=='string')fail('deleted native files require their separate removal rule');const scopes=project.sourceScopes.filter(row=>row.source===rustPath&&same(row.module,module));
 const prefix=(a,b)=>a.length<=b.length&&a.every((part,index)=>part===b[index]),digest=createHash('sha256').update(source).digest('hex');
 if(scopes.length===0){
  const parents=project.sourceScopes.filter(row=>row.source===rustPath&&row.module.length<module.length&&prefix(row.module,module)).sort((a,b)=>b.module.length-a.module.length);if(!parents.length||parents.length>1&&parents[0].module.length===parents[1].module.length)fail('one actual closest original parent module required');const parent=parents[0];
  if(parent.sha256!==digest||parent.sourceView?.sourcePath!==rustPath||parent.sourceView.configurationCondition!=='active')fail('actual active original parent source required');const items=originalModuleViewItems(parent.sourceView,source),next=module[parent.module.length];
  if(items.some(row=>!['fn','mod','const','static','struct','enum','type','impl','trait'].includes(row.term)||row.tokens.some(token=>token.type!=='comment'&&token.text==='#')||row.term==='mod'&&row.name===next))fail('parent source contains a retained module or unproved expansion/import/attribute');
  if(project.sourceScopes.some(row=>row.source===rustPath&&prefix(module,row.module))||project.executableDeclarations.some(row=>row.source===rustPath&&prefix(module,row.qualifiedName.split('.').slice(0,-1))))fail('current native scope or declaration still occupies removed module coordinates');
  return {rustPath,module,moduleRemoved:true,sourceAuthority:false,semanticAuthority:false};
 }
 if(scopes.length!==1||scopes[0].sha256!==digest||scopes[0].sourceView?.sourcePath!==rustPath||scopes[0].sourceView.configurationCondition!=='active')fail('one actual active current native module required');
 if(originalModuleViewItems(scopes[0].sourceView,source).length!==0)fail('only a genuinely empty original module may clear its receiving pair');
 if(project.executableDeclarations.some(row=>row.source===rustPath&&same(row.qualifiedName.split('.').slice(0,-1),module)))fail('an executable native function cannot disappear behind empty metadata');
 return {rustPath,module,sourceAuthority:false,semanticAuthority:false};
}
export function prepareEmptyNativeModulePair(javascriptPath,typescriptPath){
 ownedSourcePath(javascriptPath);ownedSourcePath(typescriptPath);if(!javascriptPath.endsWith('.mjs')||!/\.(?:mts|ts)$/u.test(typescriptPath))throw new TypeError('Native empty module: complete receiving module paths required');
 const pair=prepareOwnedCorePairedTypes(javascriptPath,'',typescriptPath,'');if(pair.functions.length!==0||pair.javascript.source!==''||pair.typescript.source!=='')throw new TypeError('Native empty module: canonical empty native AST pair required');return pair;
}
import {ownedSourcePath} from './owned-vector-candidate-source.mjs';
import {originalModuleViewItems} from '../source-module-views.mjs';
import {prepareOwnedCorePairedTypes} from './owned-core-paired-types.mjs';
import {createHash} from 'node:crypto';
