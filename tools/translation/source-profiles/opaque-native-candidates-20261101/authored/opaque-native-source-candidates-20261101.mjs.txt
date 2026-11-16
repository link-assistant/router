// General language source splices. No namespace/type/ownership permission.
import {copyMetadata} from './extensions/source-links.mjs';
import {accountPrimitiveVectorIteratorBulkData as accountData} from './primitive-vector-iterator-bulk-20261101-accounting.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta,serializeConcreteSyntaxMeta,applyConcreteSyntaxSubstitutions} from './concrete-syntax-meta.mjs';
const fail=message=>{throw TypeError('Whole native source candidates: '+message);};
export function proposeWholeNativeSourceCandidates(source,edits){
 accountData(edits);const captured=copyMetadata(edits);if(!Array.isArray(captured)||captured.length>4096)fail('bounded complete candidate edit array required');
 const before=transportConcreteSyntaxSource(source,{language:'Rust'});captured.sort((a,b)=>a.span?.[0]-b.span?.[0]);let stop=0;
 for(const row of captured){if(!row||Object.keys(row).sort().join(',')!=='expected,replacement,span'||!Array.isArray(row.span)||row.span.length!==2||row.span.some(value=>!Number.isSafeInteger(value))||row.span[0]<stop||row.span[1]<=row.span[0]||row.span[1]>source.length||typeof row.expected!=='string'||typeof row.replacement!=='string'||/\p{Surrogate}/u.test(row.expected)||/\p{Surrogate}/u.test(row.replacement)||source.slice(...row.span)!==row.expected)fail('whole exact nonoverlapping native source preimages required');stop=row.span[1];}
 const changed=applyConcreteSyntaxSubstitutions(before.document,{languageRules:[{id:'language:complete-native-source-candidate-splices',edits:captured}],repositoryRules:[{id:'repository:retain-actual-native-module-layout-and-unselected-source',edits:[]}]}),after=transportConcreteSyntaxMeta(serializeConcreteSyntaxMeta(changed.value)),mapping=[];let delta=0;
 for(const row of captured){mapping.push({...row,afterSpan:[row.span[0]+delta,row.span[0]+delta+row.replacement.length]});delta+=row.replacement.length-(row.span[1]-row.span[0]);}
 let inverse=after.source;for(const row of [...mapping].reverse()){if(inverse.slice(...row.afterSpan)!==row.replacement)fail('complete changed source inverse slot differs');inverse=inverse.slice(0,row.afterSpan[0])+row.expected+inverse.slice(row.afterSpan[1]);}
 if(inverse!==source||transportConcreteSyntaxMeta(before.meta).source!==source)fail('whole original source/CST inverse differs');
 return {before:{source,meta:before.meta},after:{source:after.source,meta:after.meta},edits:captured,mapping,inverse,trace:changed.trace,sourceAuthority:false,semanticAuthority:false,nativeGrammarChecked:false,executableAdmission:false};
}
