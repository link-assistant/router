// Fixed receiving sample preparation from fresh compiler DATA; no admission.
import {ownershipCompiler} from './js-to-rust/vendor/module-syntax.mjs';
import {assertReverseConcreteSourceHost} from './js-to-rust/concrete-source.mjs';
import {sourceItems} from './rust-structure.mjs';
const fail=message=>{throw TypeError('Actual whole-corpus predicate receiving sample: '+message);};
const swaps=Object.freeze({'===':'!==','!==':'===','<':'<=','<=':'<','>':'>=','>=':'>','&&':'||','||':'&&'});
function target(source,language,origins){
 assertReverseConcreteSourceHost();if(typeof source!=='string'||Buffer.byteLength(source)>8388608)fail('complete bounded actual target required');const ts=ownershipCompiler(),file=ts.createSourceFile(language==='JavaScript'?'sample.mjs':'sample.mts',source,ts.ScriptTarget.Latest,true,language==='JavaScript'?ts.ScriptKind.JS:ts.ScriptKind.TS),wanted=new Set(origins.map(row=>row.targetFunction+'\0'+row.value)),groups=new Map();if(file.parseDiagnostics.length)fail('actual emitted native grammar required');let nodes=0;
 function visit(node,owner,depth){if(++nodes>200000||depth>256)fail('original target traversal bound');if(ts.isFunctionDeclaration(node))owner=node.name?.text??null;if(owner&&ts.isBinaryExpression(node)){const token=node.operatorToken,text=source.slice(token.getStart(file),token.end),key=owner+'\0'+text;if(wanted.has(key)){if(!groups.has(key))groups.set(key,[]);groups.get(key).push({start:token.getStart(file),end:token.end});}}ts.forEachChild(node,child=>visit(child,owner,depth+1));}visit(file,null,0);assertReverseConcreteSourceHost();return groups;
}
export function prepareOpaqueBodyPredicateReceivingSample(capture){
 const origins=capture.constantIndexOrigins.bodyLiterals.filter(row=>['equality','comparison','logic'].includes(row.kind)),counts=new Map();for(const row of origins){const key=row.targetFunction+'\0'+row.value;counts.set(key,(counts.get(key)??0)+1);}const js=target(capture.javascript,'JavaScript',origins),ts=target(capture.typescript,'TypeScript',origins);
 const oldNames=new Map(),newNames=new Map();function ownerCount(table,path,source,leaf){if(!table.has(path)){const names=new Map();for(const item of sourceItems(source))if(item.term==='fn')names.set(item.name,(names.get(item.name)??0)+1);table.set(path,names);}return table.get(path).get(leaf)??0;}
 for(const row of origins){const key=row.targetFunction+'\0'+row.value,left=js.get(key),right=ts.get(key),original=capture.originalSources.get(row.source),adopted=capture.adoptedSources.get(row.source),leaf=row.qualifiedName.split('.').at(-1);if(counts.get(key)!==1||!left?.length||left.length!==right?.length||typeof original!=='string'||typeof adopted!=='string'||ownerCount(oldNames,row.source,original,leaf)!==1||ownerCount(newNames,row.source,adopted,leaf)!==1)continue;
  const replacement=swaps[row.value];if(!replacement)continue;const edit=(source,rows)=>{let result=source;for(const span of [...rows].sort((a,b)=>b.start-a.start))result=result.slice(0,span.start)+replacement+result.slice(span.end);return result;};
  return {javascript:edit(capture.javascript,left),typescript:edit(capture.typescript,right),sample:{source:row.source,qualifiedName:row.qualifiedName,before:row.value,after:replacement,targetOccurrences:left.length,sourceAuthority:false,semanticAuthority:false}};
 }fail('one actual checked predicate with a unique physical owner and paired emitted tokens required; no skipped sample or synthetic permit');
}
