// Complete current private source copies. Rule/CST records remain DATA only.
import {prepareCurrentVectorCopySources} from '../prepare-current-vector-copy-sources.mjs';
const TARGETS=new Set(['tools/translation/js-to-rust/owned-vector-candidate-source.mjs','tools/translation/js-to-rust/owned-vector-candidate-operations.mjs','tools/translation/js-to-rust/owned-vector-candidate-document.mjs']);
export function prepareCurrentOwnedVectorCandidateSources(options={}){
 const complete=prepareCurrentVectorCopySources(options),files=complete.files.filter(row=>TARGETS.has(row.path));
 if(files.length!==3)throw new TypeError('Current vector source requires all three complete private module copies');
 return {...complete,schema:'owned-vector-current-private-source-candidate-v1',inputs:complete.nativeInputs,files:files.map(row=>({...row,after:row.currentAfter,sequence:{languageRules:row.stages.filter(stage=>stage.phase==='language'),repositoryRules:row.stages.filter(stage=>stage.phase==='repository')}})),compilerFiles:nativeSourceHistoryFiles(complete),defaultAPIsUnchanged:true,productionSelected:false,runtimeParity:false,rustExecuted:false};
}

import {nativeSourceHistoryFiles} from '../native-source-descendants.mjs';
