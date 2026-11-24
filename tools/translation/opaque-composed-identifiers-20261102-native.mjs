// Disjoint complete original-span composition DATA, never a source issuer.
import {proposeOpaqueNativeBindingFunctionsData} from './opaque-binding-functions-20261102-native.mjs';
import {proposeOpaqueNativeCalleeData} from './opaque-body-callee-20261102-native.mjs';
import {proposeWholeNativeSourceCandidates} from './opaque-native-source-candidates-20261101.mjs';
import {copyMetadata} from './extensions/source-links.mjs';
import {accountPrimitiveVectorIteratorBulkData as account} from './primitive-vector-iterator-bulk-20261101-accounting.mjs';
const fail=message=>{throw TypeError('Composed identifier native DATA: '+message);};
export function proposeOpaqueComposedIdentifierNativeData(capture,input){
 account(input);const groups=copyMetadata(input);if(!groups||Object.keys(groups).sort().join(',')!=='binding,callee'||!Array.isArray(groups.binding)||!Array.isArray(groups.callee)||groups.binding.length+groups.callee.length<1||groups.binding.length+groups.callee.length>256)fail('closed bounded original family selections required');
 const families=[];if(groups.binding.length)families.push(['binding',proposeOpaqueNativeBindingFunctionsData(capture,groups.binding)]);if(groups.callee.length)families.push(['callee',proposeOpaqueNativeCalleeData(capture,groups.callee)]);
 const nativeEdits=[],selections=[];for(const[family,proposal]of families){for(const row of proposal.nativeEdits){if(nativeEdits.length===4096)fail('combined original4096 native edit bound');nativeEdits.push({...row});}for(const selection of proposal.selections)selections.push({...selection,editFamily:family});}
 nativeEdits.sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:a.span[0]-b.span[0]);const bySource=new Map();let previous=null;
 for(const row of nativeEdits){if(previous&&previous.path===row.path&&row.span[0]<previous.span[1])fail('family edits overlap or ambiguously claim the same original token');previous=row;if(!bySource.has(row.path))bySource.set(row.path,[]);bySource.get(row.path).push({span:row.span,expected:row.expected,replacement:row.replacement});}
 const rustEdits=[];for(const[path,edits]of bySource){const before=capture.originalSources.get(path);if(typeof before!=='string')fail('complete physical original source required');const proposal=proposeWholeNativeSourceCandidates(before,edits);rustEdits.push({path,before,after:proposal.after.source,sourceCandidate:proposal});}
 const answer={nativeEdits,rustEdits,selections,changedFamilies:families.map(([name])=>name),sourceAuthority:false,semanticAuthority:false};account(answer);return answer;
}
