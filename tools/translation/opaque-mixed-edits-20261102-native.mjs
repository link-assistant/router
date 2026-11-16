// Native whole-source composition DATA; no source/checker permission is issued.
import {proposeOpaqueComposedIdentifierNativeData} from './opaque-composed-identifiers-20261102-native.mjs';
import {proposeOpaqueNumericNativeCandidateData} from './opaque-numeric-candidate-data-20261102.mjs';
import {proposeWholeNativeSourceCandidates} from './opaque-native-source-candidates-20261101.mjs';
import {copyMetadata} from './extensions/source-links.mjs';
import {accountPrimitiveVectorIteratorBulkData as account} from './primitive-vector-iterator-bulk-20261101-accounting.mjs';
const fail=message=>{throw TypeError('Mixed original native edit DATA: '+message);};
export function proposeOpaqueMixedNativeData(capture,input){
 account(input);const groups=copyMetadata(input);if(!groups||Object.keys(groups).sort().join(',')!=='identifierGroups,numeric'||groups.identifierGroups===null&&groups.numeric===null)fail('closed nonempty selected family data required');
 const proposals=[];if(groups.identifierGroups!==null)proposals.push(proposeOpaqueComposedIdentifierNativeData(capture,groups.identifierGroups));if(groups.numeric!==null)proposals.push({...proposeOpaqueNumericNativeCandidateData(capture,groups.numeric),changedFamilies:['numeric']});
 const nativeEdits=[],selections=[],changedFamilies=[];for(const proposal of proposals){changedFamilies.push(...proposal.changedFamilies);for(const edit of proposal.nativeEdits){if(nativeEdits.length===4096)fail('original4096 combined native edit bound');nativeEdits.push({...edit});}for(const row of proposal.selections)selections.push({...row,editFamily:row.editFamily??'numeric'});}
 nativeEdits.sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:a.span[0]-b.span[0]);const grouped=new Map();let previous=null;
 for(const edit of nativeEdits){if(previous&&previous.path===edit.path&&edit.span[0]<previous.span[1])fail('cross-family original native spans overlap');previous=edit;if(!grouped.has(edit.path))grouped.set(edit.path,[]);grouped.get(edit.path).push({span:edit.span,expected:edit.expected,replacement:edit.replacement});}
 const rustEdits=[...grouped].map(([path,rows])=>{const before=capture.originalSources.get(path);if(typeof before!=='string')fail('complete original physical source required');const candidate=proposeWholeNativeSourceCandidates(before,rows);return {path,before,after:candidate.after.source,sourceCandidate:candidate};});
 const result={nativeEdits,rustEdits,selections,changedFamilies,sourceAuthority:false,semanticAuthority:false};account(result);return result;
}
