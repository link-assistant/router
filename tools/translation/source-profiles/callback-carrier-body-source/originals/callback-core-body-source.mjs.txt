// Complete bounded callback-body source proposals only. Every child keeps its
// actual complete source/CST/inverse; the real whole caller is checked separately.
import {proposeCallbackTextBodySource} from './callback-text-body-source.mjs';
import {proposeCallbackIntegerBodySource} from './callback-integer-body-source.mjs';
import {applyLayeredCoreAdoptionSource} from './layered-core-adoption-source.mjs';
export function proposeCallbackCoreBodySource(body,scope){
 if(typeof body!=='string'||body.length>65536||!body.includes('.')||!(scope instanceof Map)||scope.size>64)return null;let current=body,stable=false;const stages=[];
 for(let round=0;round<4;round++){
  let changed=false;for(const [name,propose]of [['text',proposeCallbackTextBodySource],['integer',proposeCallbackIntegerBodySource]]){
   const before=current,proposal=propose(before,scope);if(!proposal)continue;if(proposal.before.source!==before||typeof proposal.after.source!=='string'||proposal.after.source.length>65536)throw new TypeError('Complete bounded callback core child source differs');if(proposal.after.source===before)continue;
   current=proposal.after.source;changed=true;stages.push({round,name,proposal,sourceAuthority:false,semanticAuthority:false,executableAdmission:false});
  }if(!changed){stable=true;break;}
 }if(!stable)throw new TypeError('Complete callback core unchanged round required within four rounds');if(!stages.length)return null;
 const proposal=applyLayeredCoreAdoptionSource(body,[{span:[0,body.length],expected:body,replacement:current}],{languageRule:'callback-core:compose-original-text-and-integer-source-bodies',repositoryRule:'router-core:qualify-shared-callback-core-operations',bindings:[{native:'crate::translation_text_core::',neutral:'::translation_compatibility_text::'},{native:'crate::translation_integer_core::',neutral:'::translation_compatibility_integer::'}]});
 if(proposal.after.source!==current)throw new TypeError('Complete callback core composed source differs');return {...proposal,wrapper:{...stages[0].proposal.wrapper,functionOwnerProved:false,temporaryTypesAreSourceData:true},bodySourceHistories:stages,sourceStagesStable:true,sourceStagesComplete:false,functionOwnerProved:false,sourceAuthority:false,semanticAuthority:false,executableAdmission:false};
}
