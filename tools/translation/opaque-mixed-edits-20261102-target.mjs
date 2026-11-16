// Whole-target factoring DATA; real source/type/ownership reissue is separate.
import {ownershipCompiler} from './js-to-rust/vendor/module-syntax.mjs';
import {assertReverseConcreteSourceHost} from './js-to-rust/concrete-source.mjs';
import {opaqueNumericTargetSpansData} from './opaque-numeric-candidate-data-20261102.mjs';
import {proposeOpaqueComposedIdentifierTargetData,prepareOpaqueComposedIdentifierReceivingSample} from './opaque-composed-identifiers-20261102-target.mjs';
import {prepareOpaqueBodyNumericReceivingSample} from './opaque-body-numeric-sample-20261102.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta} from './concrete-syntax-meta.mjs';
const fail=message=>{throw TypeError('Whole mixed edit factoring DATA: '+message);};
function cells(source,language){
 assertReverseConcreteSourceHost();if(typeof source!=='string'||Buffer.byteLength(source)>8388608||!['JavaScript','TypeScript'].includes(language))fail('bounded complete target required');
 const concrete=transportConcreteSyntaxSource(source,{language});if(transportConcreteSyntaxMeta(concrete.meta).source!==source)fail('whole target CST inverse differs');
 const ts=ownershipCompiler(),file=ts.createSourceFile(language==='JavaScript'?'mixed.mjs':'mixed.mts',source,ts.ScriptTarget.Latest,true,language==='JavaScript'?ts.ScriptKind.JS:ts.ScriptKind.TS);if(file.parseDiagnostics.length)fail('native target grammar required');
 const rows=opaqueNumericTargetSpansData(source,language).map(row=>({...row,kind:'numeric:'+row.kind,lane:'numeric'}));let nodes=0;
 function visit(node,depth){if(++nodes>200000||depth>256)fail('complete target traversal bound');if(ts.isIdentifier(node))rows.push({start:node.getStart(file),end:node.end,kind:'identifier',lane:'identifier'});ts.forEachChild(node,child=>visit(child,depth+1));}visit(file,0);
 rows.sort((a,b)=>a.start-b.start||a.end-b.end);let end=0;for(const row of rows){if(row.start<end||row.end<=row.start||row.end>source.length)fail('nonoverlapping original complete token spans required');end=row.end;}assertReverseConcreteSourceHost();return {source,rows,concrete};
}
function apply(source,edits){let at=0,bytes=0;const parts=[];for(const row of [...edits].sort((a,b)=>a.start-b.start)){if(row.start<at||source.slice(row.start,row.end)!==row.before)fail('disjoint original exact token edits required');const prefix=source.slice(at,row.start);bytes+=Buffer.byteLength(prefix)+Buffer.byteLength(row.after);if(bytes>8388608)fail('complete mixed target result bound');parts.push(prefix,row.after);at=row.end;}const suffix=source.slice(at);if(bytes+Buffer.byteLength(suffix)>8388608)fail('complete mixed target result bound');parts.push(suffix);return parts.join('');}
function split(beforeSource,afterSource,language){
 const before=cells(beforeSource,language),after=cells(afterSource,language);if(before.rows.length!==after.rows.length)fail('same complete editable token skeleton required');const edits=[],identifier=[],numeric=[];let left=0,right=0;
 for(let at=0;at<before.rows.length;at++){const a=before.rows[at],b=after.rows[at];if(a.kind!==b.kind||beforeSource.slice(left,a.start)!==afterSource.slice(right,b.start))fail('nonselected syntax changed');const old=beforeSource.slice(a.start,a.end),next=afterSource.slice(b.start,b.end);if(old!==next){if(edits.length===4096)fail('original4096 total target edit bound');const row={start:a.start,end:a.end,before:old,after:next,lane:a.lane};edits.push(row);(a.lane==='identifier'?identifier:numeric).push(row);}left=a.end;right=b.end;}
 if(beforeSource.slice(left)!==afterSource.slice(right)||!edits.length)fail('nonempty exact full token edits required');if(apply(beforeSource,edits)!==afterSource)fail('full mixed target equation differs');return {edits,identifier,numeric,before,after};
}
export function proposeOpaqueMixedTargetData(beforeSource,afterSource,language){
 const data=split(beforeSource,afterSource,language),identifierSource=apply(beforeSource,data.identifier),numericSource=apply(beforeSource,data.numeric),identifier=data.identifier.length?proposeOpaqueComposedIdentifierTargetData(beforeSource,identifierSource,language):null;
 return {groups:{identifierGroups:identifier?.groups??null,numeric:data.numeric.length?{language,source:numericSource}:null},changedFamilies:[...(identifier?.changedFamilies??[]),...(data.numeric.length?['numeric']:[])],changedTokens:data.edits.length,beforeConcreteSyntax:data.before.concrete.meta,afterConcreteSyntax:data.after.concrete.meta,sourceAuthority:false,semanticAuthority:false};
}
export function prepareOpaqueMixedReceivingSample(capture){
 const identifiers=prepareOpaqueComposedIdentifierReceivingSample(capture),numeric=prepareOpaqueBodyNumericReceivingSample(capture,{family:'arithmetic',variant:'both'});
 const compose=(before,first,second,language)=>{const a=split(before,first,language),b=split(before,second,language),edits=[...a.edits,...b.edits];if(edits.length>4096)fail('combined original token edit bound');return apply(before,edits);};
 const javascript=compose(capture.javascript,identifiers.javascript,numeric.javascript,'JavaScript'),typescript=compose(capture.typescript,identifiers.typescript,numeric.typescript,'TypeScript');
 for(const[language,before,after]of [['JavaScript',capture.javascript,javascript],['TypeScript',capture.typescript,typescript]])if(proposeOpaqueMixedTargetData(before,after,language).changedFamilies.length!==3)fail('all three actual source edit families required');
 return {javascript,typescript,sample:{identifier:identifiers.sample,numeric:numeric.sample,changedFamilies:['binding','callee','numeric'],sourceAuthority:false,semanticAuthority:false}};
}
