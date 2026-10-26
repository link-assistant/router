// One synchronous source proposal only. Generated-source classification is
// separate from original caller ownership and all checked program semantics.
import {types} from 'node:util';
import {itemConfiguration} from './cfg-profile.mjs';
import {originalMacroTrees} from './macro-token-trees.mjs';
import {captureSourceModuleViews,originalModuleViewItems} from './source-module-views.mjs';
import {createOriginalPassiveBuiltinCallerAttributeScope} from './registered-builtin-caller-attribute-source.mjs';
const fail=message=>{throw new TypeError('Passive macro source attributes: '+message);};
export function withPassiveMacroAttributeValidation(operation){
 if(typeof operation!=='function'||types.isProxy(operation)||types.isAsyncFunction(operation))fail('one complete synchronous source operation required');let active=true,scope=createOriginalPassiveBuiltinCallerAttributeScope(),cells=0;const records=[];
 const tick=()=>{if(!active)fail('original source operation is closed');if(++cells>200000)fail('complete source attribute operation cell bound');};
 const validator={
  header(module,item){
   tick();const condition=itemConfiguration(item.tokens,module.compilationProfile);if(condition.status!=='active')return {closed:false,attributes:[]};const selected=[];
   for(const attribute of condition.attributes){tick();const actual=scope.at(module,item,attribute);if(!actual)return {closed:false,attributes:[]};selected.push(actual);}return {closed:true,attributes:selected,sourceAuthority:false,semanticAuthority:false};
  },
  generated(source,{sourcePath}={}){
   tick();if(typeof source!=='string')fail('complete actual generated source required');if(!source.includes('#'))return {attributes:[],sourceAuthority:false,semanticAuthority:false};
   const trees=originalMacroTrees(source,{maxBytes:256000,maxTokens:32000,maxDepth:64}),captured=captureSourceModuleViews({source,sourcePath}),owners=[];for(const view of captured.views){const module={file:sourcePath,path:view.modulePath,source,sourceView:view,compilationProfile:view.compilationProfile};for(const item of originalModuleViewItems(view,source))owners.push({module,item});}owners.sort((left,right)=>(left.item.end-left.item.start)-(right.item.end-right.item.start));const selected=[];
   function visit(nodes,depth=0){if(depth>64)fail('complete generated attribute delimiter bound');for(let index=0;index<nodes.length;index++){tick();const node=nodes[index];if(node.kind==='token'&&node.text==='#'){const group=nodes[++index];if(group?.delimiter!=='[')fail('generated raw identifiers or non-outer attributes need an independent source rule');const name=group.children[0]?.text,span={start:node.span.start,end:group.span.end},owner=owners.find(row=>row.item.start<=span.start&&row.item.end>=span.end);if(!owner)fail('generated attribute lacks its complete actual generated item');const actual=scope.at(owner.module,owner.item,{name,span});if(!actual)fail('every surviving generated attribute needs its original passive builtin source closure');selected.push({...actual,sourceDomain:'generated-expansion',originalCallerOwnerResolved:false});continue;}if(node.kind==='group')visit(node.children,depth+1);}}
   visit(trees);const result={attributes:selected,sourceAuthority:false,semanticAuthority:false,namespaceAuthority:false};records.push(result);return result;
  },
 };
 try{const result=operation(validator);if(types.isPromise(result)||result&&typeof result==='object'&&types.isProxy(result))fail('source operation must finish synchronously');if(result&&typeof result==='object'){const then=Object.getOwnPropertyDescriptor(result,'then');if(then&&(!Object.hasOwn(then,'value')||typeof then.value==='function'))fail('source operation cannot return an own thenable/accessor');}return result;}
 finally{try{scope.finish();}finally{active=false;scope=null;records.length=0;}}
}

import {createModuleMacroUseBuiltinCallerAttributeScope} from './registered-builtin-caller-attribute-source.mjs';

export function withModuleMacroUseAttributeValidation(operation){
 if(typeof operation!=='function'||types.isProxy(operation)||types.isAsyncFunction(operation))fail('one complete synchronous source operation required');let active=true,scope=createOriginalPassiveBuiltinCallerAttributeScope(),moduleScope=createModuleMacroUseBuiltinCallerAttributeScope(),cells=0;const records=[];
 const tick=()=>{if(!active)fail('original source operation is closed');if(++cells>200000)fail('complete source attribute operation cell bound');};
 const validator={
  header(module,item){
   tick();const condition=itemConfiguration(item.tokens,module.compilationProfile);if(condition.status!=='active')return {closed:false,attributes:[]};const selected=[];if(condition.attributes.filter(row=>row.name==='macro_use').length>1)return {closed:false,attributes:[]};
   for(const attribute of condition.attributes){tick();const actual=attribute.name==='macro_use'?moduleScope.at(module,item,attribute):scope.at(module,item,attribute);if(!actual)return {closed:false,attributes:[]};selected.push(actual);}return {closed:true,attributes:selected,macroUse:selected.some(row=>row.name==='macro_use'),sourceAuthority:false,semanticAuthority:false};
  },
  generated(source,{sourcePath}={}){
   tick();if(typeof source!=='string')fail('complete actual generated source required');if(!source.includes('#'))return {attributes:[],sourceAuthority:false,semanticAuthority:false};
   const trees=originalMacroTrees(source,{maxBytes:256000,maxTokens:32000,maxDepth:64}),captured=captureSourceModuleViews({source,sourcePath}),owners=[];for(const view of captured.views){const module={file:sourcePath,path:view.modulePath,source,sourceView:view,compilationProfile:view.compilationProfile};for(const item of originalModuleViewItems(view,source))owners.push({module,item});}owners.sort((left,right)=>(left.item.end-left.item.start)-(right.item.end-right.item.start));const selected=[];
   function visit(nodes,depth=0){if(depth>64)fail('complete generated attribute delimiter bound');for(let index=0;index<nodes.length;index++){tick();const node=nodes[index];if(node.kind==='token'&&node.text==='#'){const group=nodes[++index];if(group?.delimiter!=='[')fail('generated raw identifiers or non-outer attributes need an independent source rule');const name=group.children[0]?.text,span={start:node.span.start,end:group.span.end},owner=owners.find(row=>row.item.start<=span.start&&row.item.end>=span.end);if(!owner)fail('generated attribute lacks its complete actual generated item');const actual=scope.at(owner.module,owner.item,{name,span});if(!actual)fail('every surviving generated attribute needs its original passive builtin source closure');selected.push({...actual,sourceDomain:'generated-expansion',originalCallerOwnerResolved:false});continue;}if(node.kind==='group')visit(node.children,depth+1);}}
   visit(trees);const result={attributes:selected,sourceAuthority:false,semanticAuthority:false,namespaceAuthority:false};records.push(result);return result;
  },
 };
 try{const result=operation(validator);if(types.isPromise(result)||result&&typeof result==='object'&&types.isProxy(result))fail('source operation must finish synchronously');if(result&&typeof result==='object'){const then=Object.getOwnPropertyDescriptor(result,'then');if(then&&(!Object.hasOwn(then,'value')||typeof then.value==='function'))fail('source operation cannot return an own thenable/accessor');}return result;}
 finally{try{try{scope.finish();}finally{moduleScope.finish();}}finally{active=false;scope=null;moduleScope=null;records.length=0;}}
}

import {createOriginalInnerLintCallerAttributeScope} from './registered-builtin-caller-attribute-source.mjs';

export function withInnerLintModuleMacroUseAttributeValidation(operation){
 if(typeof operation!=='function'||types.isProxy(operation)||types.isAsyncFunction(operation))fail('one complete synchronous source operation required');let active=true,scope=createOriginalPassiveBuiltinCallerAttributeScope(),moduleScope=createModuleMacroUseBuiltinCallerAttributeScope(),innerScope=createOriginalInnerLintCallerAttributeScope(),cells=0;const records=[];
 const tick=()=>{if(!active)fail('original source operation is closed');if(++cells>200000)fail('complete source attribute operation cell bound');};
 const validator={
  inner(module,item){tick();return innerScope.at(module,item);},
  header(module,item){
   tick();if(item.tokens[0]?.text==='#'&&item.tokens[1]?.text==='!'){const row=innerScope.at(module,item);return row?{closed:true,attributes:row.attributes,inner:true,sourceAuthority:false,semanticAuthority:false}:{closed:false,attributes:[]};}const condition=itemConfiguration(item.tokens,module.compilationProfile);if(condition.status!=='active')return {closed:false,attributes:[]};const selected=[];if(condition.attributes.filter(row=>row.name==='macro_use').length>1)return {closed:false,attributes:[]};
   for(const attribute of condition.attributes){tick();const actual=attribute.name==='macro_use'?moduleScope.at(module,item,attribute):scope.at(module,item,attribute);if(!actual)return {closed:false,attributes:[]};selected.push(actual);}return {closed:true,attributes:selected,macroUse:selected.some(row=>row.name==='macro_use'),sourceAuthority:false,semanticAuthority:false};
  },
  generated(source,{sourcePath}={}){
   tick();if(typeof source!=='string')fail('complete actual generated source required');if(!source.includes('#'))return {attributes:[],sourceAuthority:false,semanticAuthority:false};
   const trees=originalMacroTrees(source,{maxBytes:256000,maxTokens:32000,maxDepth:64}),captured=captureSourceModuleViews({source,sourcePath}),owners=[];for(const view of captured.views){const module={file:sourcePath,path:view.modulePath,source,sourceView:view,compilationProfile:view.compilationProfile};for(const item of originalModuleViewItems(view,source))owners.push({module,item});}owners.sort((left,right)=>(left.item.end-left.item.start)-(right.item.end-right.item.start));const selected=[];
   function visit(nodes,depth=0){if(depth>64)fail('complete generated attribute delimiter bound');for(let index=0;index<nodes.length;index++){tick();const node=nodes[index];if(node.kind==='token'&&node.text==='#'){const group=nodes[++index];if(group?.delimiter!=='[')fail('generated raw identifiers or non-outer attributes need an independent source rule');const name=group.children[0]?.text,span={start:node.span.start,end:group.span.end},owner=owners.find(row=>row.item.start<=span.start&&row.item.end>=span.end);if(!owner)fail('generated attribute lacks its complete actual generated item');const actual=scope.at(owner.module,owner.item,{name,span});if(!actual)fail('every surviving generated attribute needs its original passive builtin source closure');selected.push({...actual,sourceDomain:'generated-expansion',originalCallerOwnerResolved:false});continue;}if(node.kind==='group')visit(node.children,depth+1);}}
   visit(trees);const result={attributes:selected,sourceAuthority:false,semanticAuthority:false,namespaceAuthority:false};records.push(result);return result;
  },
 };
 try{const result=operation(validator);if(types.isPromise(result)||result&&typeof result==='object'&&types.isProxy(result))fail('source operation must finish synchronously');if(result&&typeof result==='object'){const then=Object.getOwnPropertyDescriptor(result,'then');if(then&&(!Object.hasOwn(then,'value')||typeof then.value==='function'))fail('source operation cannot return an own thenable/accessor');}return result;}
 finally{try{try{scope.finish();}finally{try{moduleScope.finish();}finally{innerScope.finish();}}}finally{active=false;scope=null;moduleScope=null;innerScope=null;records.length=0;}}
}

import {createOriginalLiteralDocumentationSourceScope} from './registered-builtin-caller-attribute-source.mjs';

export function withLiteralDocInnerLintModuleMacroUseAttributeValidation(operation){
 if(typeof operation!=='function'||types.isProxy(operation)||types.isAsyncFunction(operation))fail('one complete synchronous source operation required');let active=true,scope=createOriginalPassiveBuiltinCallerAttributeScope(),moduleScope=createModuleMacroUseBuiltinCallerAttributeScope(),innerScope=createOriginalInnerLintCallerAttributeScope(),docScope=createOriginalLiteralDocumentationSourceScope(),cells=0;const records=[];
 const tick=()=>{if(!active)fail('original source operation is closed');if(++cells>200000)fail('complete source attribute operation cell bound');};
 const validator={
  inner(module,item){tick();return innerScope.at(module,item)??docScope.innerItem(module,item);},
  header(module,item){
   tick();if(item.tokens[0]?.text==='#'&&item.tokens[1]?.text==='!'){const row=innerScope.at(module,item)??docScope.innerItem(module,item);return row?{closed:true,attributes:row.attributes,inner:true,sourceAuthority:false,semanticAuthority:false}:{closed:false,attributes:[]};}const condition=itemConfiguration(item.tokens,module.compilationProfile);if(condition.status!=='active')return {closed:false,attributes:[]};const selected=[];if(condition.attributes.filter(row=>row.name==='macro_use').length>1)return {closed:false,attributes:[]};
   for(const attribute of condition.attributes){tick();const actual=attribute.name==='doc'?docScope.attribute(module,item,attribute):attribute.name==='macro_use'?moduleScope.at(module,item,attribute):scope.at(module,item,attribute);if(!actual)return {closed:false,attributes:[]};selected.push(actual);}return {closed:true,attributes:selected,macroUse:selected.some(row=>row.name==='macro_use'),sourceAuthority:false,semanticAuthority:false};
  },
  generated(source,{sourcePath}={}){
   tick();if(typeof source!=='string')fail('complete actual generated source required');if(!source.includes('#'))return {attributes:[],sourceAuthority:false,semanticAuthority:false};
   const trees=originalMacroTrees(source,{maxBytes:256000,maxTokens:32000,maxDepth:64}),captured=captureSourceModuleViews({source,sourcePath}),owners=[];for(const view of captured.views){const module={file:sourcePath,path:view.modulePath,source,sourceView:view,compilationProfile:view.compilationProfile};for(const item of originalModuleViewItems(view,source))owners.push({module,item});}owners.sort((left,right)=>(left.item.end-left.item.start)-(right.item.end-right.item.start));const selected=[];
   function visit(nodes,depth=0){if(depth>64)fail('complete generated attribute delimiter bound');for(let index=0;index<nodes.length;index++){tick();const node=nodes[index];if(node.kind==='token'&&node.text==='#'){const group=nodes[++index];if(group?.delimiter!=='[')fail('generated raw identifiers or non-outer attributes need an independent source rule');const name=group.children[0]?.text,span={start:node.span.start,end:group.span.end},owner=owners.find(row=>row.item.start<=span.start&&row.item.end>=span.end);if(!owner)fail('generated attribute lacks its complete actual generated item');const actual=name==='doc'?docScope.attribute(owner.module,owner.item,{name,span}):scope.at(owner.module,owner.item,{name,span});if(!actual)fail('every surviving generated attribute needs its original passive builtin source closure');selected.push({...actual,sourceDomain:'generated-expansion',originalCallerOwnerResolved:false});continue;}if(node.kind==='group')visit(node.children,depth+1);}}
   visit(trees);const result={attributes:selected,sourceAuthority:false,semanticAuthority:false,namespaceAuthority:false};records.push(result);return result;
  },
 };
 try{const result=operation(validator);if(types.isPromise(result)||result&&typeof result==='object'&&types.isProxy(result))fail('source operation must finish synchronously');if(result&&typeof result==='object'){const then=Object.getOwnPropertyDescriptor(result,'then');if(then&&(!Object.hasOwn(then,'value')||typeof then.value==='function'))fail('source operation cannot return an own thenable/accessor');}return result;}
 finally{try{try{scope.finish();}finally{try{moduleScope.finish();}finally{try{innerScope.finish();}finally{docScope.finish();}}}}finally{active=false;scope=null;moduleScope=null;innerScope=null;docScope=null;records.length=0;}}
}

import {proposeGeneratedConditionalSource} from './generated-conditional-source.mjs';

export function withConfiguredLiteralDocMacroAttributeValidation(operation){
 return withOriginalConditionalSourceOperation(()=>{
 if(typeof operation!=='function'||types.isProxy(operation)||types.isAsyncFunction(operation))fail('one complete synchronous source operation required');let active=true,scope=createOriginalPassiveBuiltinCallerAttributeScope(),moduleScope=createModuleMacroUseBuiltinCallerAttributeScope(),innerScope=createOriginalInnerLintCallerAttributeScope(),docScope=createOriginalLiteralDocumentationSourceScope(),cells=0;const records=[];
 const tick=()=>{if(!active)fail('original source operation is closed');if(++cells>200000)fail('complete source attribute operation cell bound');};
 const validator={
  inner(module,item){tick();return innerScope.at(module,item)??docScope.innerItem(module,item);},
  header(module,item){
   tick();if(item.tokens[0]?.text==='#'&&item.tokens[1]?.text==='!'){const row=innerScope.at(module,item)??docScope.innerItem(module,item);return row?{closed:true,attributes:row.attributes,inner:true,sourceAuthority:false,semanticAuthority:false}:{closed:false,attributes:[]};}const condition=itemConfiguration(item.tokens,module.compilationProfile);if(condition.status!=='active')return {closed:false,attributes:[]};const selected=[];if(condition.attributes.filter(row=>row.name==='macro_use').length>1)return {closed:false,attributes:[]};
   for(const attribute of condition.attributes){tick();const actual=attribute.name==='doc'?docScope.attribute(module,item,attribute):attribute.name==='macro_use'?moduleScope.at(module,item,attribute):scope.at(module,item,attribute);if(!actual)return {closed:false,attributes:[]};selected.push(actual);}return {closed:true,attributes:selected,macroUse:selected.some(row=>row.name==='macro_use'),sourceAuthority:false,semanticAuthority:false};
  },
  generated(source,{sourcePath,compilationProfile=null}={}){
   tick();if(typeof source!=='string')fail('complete actual generated source required');const originalGeneratedSource=source,sourceNormalization=source.includes('#')&&source.includes('cfg')?proposeGeneratedConditionalSource(source,{sourcePath,compilationProfile}):null;if(sourceNormalization)source=sourceNormalization.after;if(!source.includes('#'))return {attributes:[],source,originalGeneratedSource,sourceNormalization,sourceAuthority:false,semanticAuthority:false};
   const trees=originalMacroTrees(source,{maxBytes:256000,maxTokens:32000,maxDepth:64}),captured=captureSourceModuleViews({source,sourcePath}),owners=[];for(const view of captured.views){const module={file:sourcePath,path:view.modulePath,source,sourceView:view,compilationProfile:view.compilationProfile};for(const item of originalModuleViewItems(view,source))owners.push({module,item});}owners.sort((left,right)=>(left.item.end-left.item.start)-(right.item.end-right.item.start));const selected=[];
   function visit(nodes,depth=0){if(depth>64)fail('complete generated attribute delimiter bound');for(let index=0;index<nodes.length;index++){tick();const node=nodes[index];if(node.kind==='token'&&node.text==='#'){const group=nodes[++index];if(group?.delimiter!=='[')fail('generated raw identifiers or non-outer attributes need an independent source rule');const name=group.children[0]?.text,span={start:node.span.start,end:group.span.end},owner=owners.find(row=>row.item.start<=span.start&&row.item.end>=span.end);if(!owner)fail('generated attribute lacks its complete actual generated item');const actual=name==='doc'?docScope.attribute(owner.module,owner.item,{name,span}):scope.at(owner.module,owner.item,{name,span});if(!actual)fail('every surviving generated attribute needs its original passive builtin source closure');selected.push({...actual,sourceDomain:'generated-expansion',originalCallerOwnerResolved:false});continue;}if(node.kind==='group')visit(node.children,depth+1);}}
   visit(trees);const result={attributes:selected,source,originalGeneratedSource,sourceNormalization,sourceAuthority:false,semanticAuthority:false,namespaceAuthority:false};records.push(result);return result;
  },
 };
 try{const result=operation(validator);if(types.isPromise(result)||result&&typeof result==='object'&&types.isProxy(result))fail('source operation must finish synchronously');if(result&&typeof result==='object'){const then=Object.getOwnPropertyDescriptor(result,'then');if(then&&(!Object.hasOwn(then,'value')||typeof then.value==='function'))fail('source operation cannot return an own thenable/accessor');}return result;}
 finally{try{try{scope.finish();}finally{try{moduleScope.finish();}finally{try{innerScope.finish();}finally{docScope.finish();}}}}finally{active=false;scope=null;moduleScope=null;innerScope=null;docScope=null;records.length=0;}}
 });
}

import {withOriginalConditionalSourceOperation} from './conditional-source-operation.mjs';

import {createOriginalCommonBuiltinCallerAttributeScope} from './registered-builtin-caller-attribute-source.mjs';
import {proposeCommonBuiltinGeneratedConditionalSource} from './common-builtin-generated-conditional-source.mjs';

export function withCommonBuiltinMacroAttributeValidation(operation){
 return withOriginalConditionalSourceOperation(()=>{
 if(typeof operation!=='function'||types.isProxy(operation)||types.isAsyncFunction(operation))fail('one complete synchronous source operation required');let active=true,scope=createOriginalCommonBuiltinCallerAttributeScope(),moduleScope=createModuleMacroUseBuiltinCallerAttributeScope(),innerScope=createOriginalInnerLintCallerAttributeScope(),docScope=createOriginalLiteralDocumentationSourceScope(),cells=0;const records=[];
 const tick=()=>{if(!active)fail('original source operation is closed');if(++cells>200000)fail('complete source attribute operation cell bound');};
 const validator={
  inner(module,item){tick();return innerScope.at(module,item)??docScope.innerItem(module,item);},
  header(module,item){
   tick();if(item.tokens[0]?.text==='#'&&item.tokens[1]?.text==='!'){const row=innerScope.at(module,item)??docScope.innerItem(module,item);return row?{closed:true,attributes:row.attributes,inner:true,sourceAuthority:false,semanticAuthority:false}:{closed:false,attributes:[]};}const condition=itemConfiguration(item.tokens,module.compilationProfile);if(condition.status!=='active')return {closed:false,attributes:[]};const selected=[];if(condition.attributes.filter(row=>row.name==='macro_use').length>1)return {closed:false,attributes:[]};
   for(const attribute of condition.attributes){tick();const actual=attribute.name==='doc'?docScope.attribute(module,item,attribute):attribute.name==='macro_use'?moduleScope.at(module,item,attribute):scope.at(module,item,attribute);if(!actual)return {closed:false,attributes:[]};selected.push(actual);}return {closed:true,attributes:selected,macroUse:selected.some(row=>row.name==='macro_use'),sourceAuthority:false,semanticAuthority:false};
  },
  generated(source,{sourcePath,compilationProfile=null}={}){
   tick();if(typeof source!=='string')fail('complete actual generated source required');const originalGeneratedSource=source,sourceNormalization=source.includes('#')&&source.includes('cfg')?proposeCommonBuiltinGeneratedConditionalSource(source,{sourcePath,compilationProfile}):null;if(sourceNormalization)source=sourceNormalization.after;if(!source.includes('#'))return {attributes:[],source,originalGeneratedSource,sourceNormalization,sourceAuthority:false,semanticAuthority:false};
   const trees=originalMacroTrees(source,{maxBytes:256000,maxTokens:32000,maxDepth:64}),captured=captureSourceModuleViews({source,sourcePath}),owners=[];for(const view of captured.views){const module={file:sourcePath,path:view.modulePath,source,sourceView:view,compilationProfile:view.compilationProfile};for(const item of originalModuleViewItems(view,source))owners.push({module,item});}owners.sort((left,right)=>(left.item.end-left.item.start)-(right.item.end-right.item.start));const selected=[];
   function visit(nodes,depth=0){if(depth>64)fail('complete generated attribute delimiter bound');for(let index=0;index<nodes.length;index++){tick();const node=nodes[index];if(node.kind==='token'&&node.text==='#'){const group=nodes[++index];if(group?.delimiter!=='[')fail('generated raw identifiers or non-outer attributes need an independent source rule');const name=group.children[0]?.text,span={start:node.span.start,end:group.span.end},owner=owners.find(row=>row.item.start<=span.start&&row.item.end>=span.end);if(!owner)fail('generated attribute lacks its complete actual generated item');const actual=name==='doc'?docScope.attribute(owner.module,owner.item,{name,span}):scope.at(owner.module,owner.item,{name,span});if(!actual)fail('every surviving generated attribute needs its original passive builtin source closure');selected.push({...actual,sourceDomain:'generated-expansion',originalCallerOwnerResolved:false});continue;}if(node.kind==='group')visit(node.children,depth+1);}}
   visit(trees);const result={attributes:selected,source,originalGeneratedSource,sourceNormalization,sourceAuthority:false,semanticAuthority:false,namespaceAuthority:false};records.push(result);return result;
  },
 };
 try{const result=operation(validator);if(types.isPromise(result)||result&&typeof result==='object'&&types.isProxy(result))fail('source operation must finish synchronously');if(result&&typeof result==='object'){const then=Object.getOwnPropertyDescriptor(result,'then');if(then&&(!Object.hasOwn(then,'value')||typeof then.value==='function'))fail('source operation cannot return an own thenable/accessor');}return result;}
 finally{try{try{scope.finish();}finally{try{moduleScope.finish();}finally{try{innerScope.finish();}finally{docScope.finish();}}}}finally{active=false;scope=null;moduleScope=null;innerScope=null;docScope=null;records.length=0;}}
 });
}

import {createOriginalStructuredDocumentationSourceScope} from './registered-builtin-caller-attribute-source.mjs';
import {proposeStructuredDocumentationGeneratedConditionalSource} from './structured-documentation-generated-conditional-source.mjs';

export function withStructuredDocumentationMacroAttributeValidation(operation){
 return withOriginalConditionalSourceOperation(()=>{
 if(typeof operation!=='function'||types.isProxy(operation)||types.isAsyncFunction(operation))fail('one complete synchronous source operation required');let active=true,scope=createOriginalCommonBuiltinCallerAttributeScope(),moduleScope=createModuleMacroUseBuiltinCallerAttributeScope(),innerScope=createOriginalInnerLintCallerAttributeScope(),docScope=createOriginalStructuredDocumentationSourceScope(),cells=0;const records=[];
 const tick=()=>{if(!active)fail('original source operation is closed');if(++cells>200000)fail('complete source attribute operation cell bound');};
 const validator={
  inner(module,item){tick();return innerScope.at(module,item)??docScope.innerItem(module,item);},
  header(module,item){
   tick();if(item.tokens[0]?.text==='#'&&item.tokens[1]?.text==='!'){const row=innerScope.at(module,item)??docScope.innerItem(module,item);return row?{closed:true,attributes:row.attributes,inner:true,sourceAuthority:false,semanticAuthority:false}:{closed:false,attributes:[]};}const condition=itemConfiguration(item.tokens,module.compilationProfile);if(condition.status!=='active')return {closed:false,attributes:[]};const selected=[];if(condition.attributes.filter(row=>row.name==='macro_use').length>1)return {closed:false,attributes:[]};
   for(const attribute of condition.attributes){tick();const actual=attribute.name==='doc'?docScope.attribute(module,item,attribute):attribute.name==='macro_use'?moduleScope.at(module,item,attribute):scope.at(module,item,attribute);if(!actual)return {closed:false,attributes:[]};selected.push(actual);}return {closed:true,attributes:selected,macroUse:selected.some(row=>row.name==='macro_use'),sourceAuthority:false,semanticAuthority:false};
  },
  generated(source,{sourcePath,compilationProfile=null}={}){
   tick();if(typeof source!=='string')fail('complete actual generated source required');const originalGeneratedSource=source,sourceNormalization=source.includes('#')&&source.includes('cfg')?proposeStructuredDocumentationGeneratedConditionalSource(source,{sourcePath,compilationProfile}):null;if(sourceNormalization)source=sourceNormalization.after;if(!source.includes('#'))return {attributes:[],source,originalGeneratedSource,sourceNormalization,sourceAuthority:false,semanticAuthority:false};
   const trees=originalMacroTrees(source,{maxBytes:256000,maxTokens:32000,maxDepth:64}),captured=captureSourceModuleViews({source,sourcePath}),owners=[];for(const view of captured.views){const module={file:sourcePath,path:view.modulePath,source,sourceView:view,compilationProfile:view.compilationProfile};for(const item of originalModuleViewItems(view,source))owners.push({module,item});}owners.sort((left,right)=>(left.item.end-left.item.start)-(right.item.end-right.item.start));const selected=[];
   function visit(nodes,depth=0){if(depth>64)fail('complete generated attribute delimiter bound');for(let index=0;index<nodes.length;index++){tick();const node=nodes[index];if(node.kind==='token'&&node.text==='#'){const group=nodes[++index];if(group?.delimiter!=='[')fail('generated raw identifiers or non-outer attributes need an independent source rule');const name=group.children[0]?.text,span={start:node.span.start,end:group.span.end},owner=owners.find(row=>row.item.start<=span.start&&row.item.end>=span.end);if(!owner)fail('generated attribute lacks its complete actual generated item');const actual=name==='doc'?docScope.attribute(owner.module,owner.item,{name,span}):scope.at(owner.module,owner.item,{name,span});if(!actual)fail('every surviving generated attribute needs its original passive builtin source closure');selected.push({...actual,sourceDomain:'generated-expansion',originalCallerOwnerResolved:false});continue;}if(node.kind==='group')visit(node.children,depth+1);}}
   visit(trees);const result={attributes:selected,source,originalGeneratedSource,sourceNormalization,sourceAuthority:false,semanticAuthority:false,namespaceAuthority:false};records.push(result);return result;
  },
 };
 try{const result=operation(validator);if(types.isPromise(result)||result&&typeof result==='object'&&types.isProxy(result))fail('source operation must finish synchronously');if(result&&typeof result==='object'){const then=Object.getOwnPropertyDescriptor(result,'then');if(then&&(!Object.hasOwn(then,'value')||typeof then.value==='function'))fail('source operation cannot return an own thenable/accessor');}return result;}
 finally{try{try{scope.finish();}finally{try{moduleScope.finish();}finally{try{innerScope.finish();}finally{docScope.finish();}}}}finally{active=false;scope=null;moduleScope=null;innerScope=null;docScope=null;records.length=0;}}
 });
}
