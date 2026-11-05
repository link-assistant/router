// Complete target factoring DATA. No syntax classifier can admit a caller.
import {ownershipCompiler} from './js-to-rust/vendor/module-syntax.mjs';
import {assertReverseConcreteSourceHost} from './js-to-rust/concrete-source.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta} from './concrete-syntax-meta.mjs';
import {proposeOpaqueTargetBindingRenameData,prepareOpaqueBindingRenameReceivingSample} from './opaque-body-binding-rename-20261102-target.mjs';
import {proposeOpaqueTargetCalleeData,prepareOpaqueCalleeReceivingSample} from './opaque-body-callee-20261102-target.mjs';
const fail=message=>{throw TypeError('Composed identifier target DATA: '+message);};
function parse(source,language){
 assertReverseConcreteSourceHost();if(typeof source!=='string'||Buffer.byteLength(source)>8388608||!['JavaScript','TypeScript'].includes(language))fail('bounded complete JS or TS source required');
 const concrete=transportConcreteSyntaxSource(source,{language});if(transportConcreteSyntaxMeta(concrete.meta).source!==source)fail('complete source CST inverse differs');
 const ts=ownershipCompiler(),file=ts.createSourceFile(language==='JavaScript'?'composed.mjs':'composed.mts',source,ts.ScriptTarget.Latest,true,language==='JavaScript'?ts.ScriptKind.JS:ts.ScriptKind.TS);if(file.parseDiagnostics.length)fail('actual complete native target grammar required');
 const identifiers=[],functions=new Set();let cells=0;
 function visit(node,depth){if(++cells>200000||depth>256)fail('complete native target traversal bound');if(ts.isFunctionDeclaration(node)&&node.parent===file){if(!node.name||functions.has(node.name.text))fail('unique top-level function names required');functions.add(node.name.text);}
  if(ts.isIdentifier(node))identifiers.push({start:node.getStart(file),end:node.end,text:node.text,directCallee:ts.isCallExpression(node.parent)&&node.parent.expression===node});
  ts.forEachChild(node,child=>visit(child,depth+1));
 }visit(file,0);assertReverseConcreteSourceHost();return {source,identifiers,functions,concrete};
}
function apply(source,edits){let end=0,bytes=0;const parts=[];for(const edit of [...edits].sort((a,b)=>a.start-b.start)){if(edit.start<end||source.slice(edit.start,edit.end)!==edit.before)fail('disjoint original exact identifier spans required');const prefix=source.slice(end,edit.start);bytes+=Buffer.byteLength(prefix)+Buffer.byteLength(edit.after);if(bytes>8388608)fail('complete target result bound');parts.push(prefix,edit.after);end=edit.end;}const suffix=source.slice(end);if(bytes+Buffer.byteLength(suffix)>8388608)fail('complete target result bound');parts.push(suffix);return parts.join('');}
function split(beforeSource,afterSource,language){
 const before=parse(beforeSource,language),after=parse(afterSource,language);if(before.identifiers.length!==after.identifiers.length)fail('same entire identifier skeleton required');
 const edits=[],lanes={binding:[],callee:[]};let left=0,right=0;
 for(let at=0;at<before.identifiers.length;at++){
  const a=before.identifiers[at],b=after.identifiers[at];if(beforeSource.slice(left,a.start)!==afterSource.slice(right,b.start)||a.directCallee!==b.directCallee)fail('non-identifier source or call structure changed');
  if(a.text!==b.text){if(edits.length===4096)fail('original complete4096 edit bound');const lane=a.directCallee&&before.functions.has(a.text)&&before.functions.has(b.text)?'callee':'binding',row={start:a.start,end:a.end,before:a.text,after:b.text,lane};edits.push(row);lanes[lane].push(row);}left=a.end;right=b.end;
 }
 if(beforeSource.slice(left)!==afterSource.slice(right)||!edits.length)fail('nonempty exact whole identifier edit required');
 return {before,after,edits,lanes};
}
export function proposeOpaqueComposedIdentifierTargetData(beforeSource,afterSource,language){
 const factored=split(beforeSource,afterSource,language),bindings=apply(beforeSource,factored.lanes.binding),callees=apply(beforeSource,factored.lanes.callee);
 // These are the original complete family validators, not replacement checks.
 const binding=factored.lanes.binding.length?proposeOpaqueTargetBindingRenameData(beforeSource,bindings,language):null,callee=factored.lanes.callee.length?proposeOpaqueTargetCalleeData(beforeSource,callees,language):null;
 if(apply(beforeSource,factored.edits)!==afterSource)fail('complete composed target reconstruction differs');
 return {groups:{binding:binding?.groups??[],callee:callee?.groups??[]},changedIdentifiers:factored.edits.length,changedFamilies:[...(binding?['binding']:[]),...(callee?['callee']:[])],beforeConcreteSyntax:factored.before.concrete.meta,afterConcreteSyntax:factored.after.concrete.meta,sourceAuthority:false,semanticAuthority:false};
}
function mergeSamples(source,first,second,language){
 const left=split(source,first,language),right=split(source,second,language),edits=[...left.edits,...right.edits];if(edits.length>4096)fail('combined original edit bound');return apply(source,edits);
}
export function prepareOpaqueComposedIdentifierReceivingSample(capture){
 // Fixed actual-source samplers; no callback, synthetic body or skipped sample.
 const binding=prepareOpaqueBindingRenameReceivingSample(capture),callee=prepareOpaqueCalleeReceivingSample(capture),javascript=mergeSamples(capture.javascript,binding.javascript,callee.javascript,'JavaScript'),typescript=mergeSamples(capture.typescript,binding.typescript,callee.typescript,'TypeScript');
 for(const[language,before,after]of [['JavaScript',capture.javascript,javascript],['TypeScript',capture.typescript,typescript]]){const data=proposeOpaqueComposedIdentifierTargetData(before,after,language);if(data.changedFamilies.length!==2)fail('both real original edit families required');}
 return {javascript,typescript,sample:{binding:binding.sample,callee:callee.sample,changedFamilies:['binding','callee'],sourceAuthority:false,semanticAuthority:false}};
}
