import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy,withNativeSubstitutionOperation,nativeSubstitutionCopyHasChanges} from './prepare-native-substitution-copy.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareNativeClientLaunchPlanSources({root=ROOT}={}){
 return withNativeSubstitutionOperation(()=>{const inputs=readPinnedNativeSourceProvenanceInputs(root,{path:'tools/translation/source-profiles/native-client-launch-plan/native-inputs.json',pin:'06b48230d670c484397ec7feb372144ee6d1193cfff7e60097ae789ba8e8365a'}),plan=prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/native-client-launch-plan/complete-originals-and-rules.json.gz',pin:'bdb6d3ddcc8b105effe82a9ecab9597c6e9a8c3030bc0c0df401cfbbd043e6a1',id:'router:native-client-launch-plan-complete-source-substitutions-v1'});for(const row of inputs)assertNativeSourceProvenanceCurrent(root,row);return {...plan,nativeInputs:inputs,rustExecuted:false};});
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const plan=prepareNativeClientLaunchPlanSources();if(args[0]==='--write')writeNativeSubstitutionCopy(plan,{root:ROOT});if(args[0]==='--check'&&nativeSubstitutionCopyHasChanges(plan))throw new TypeError('Native client launch plan source differs');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),receivingExecuted:false}));
}

import {readPinnedNativeSourceProvenanceInputs,assertNativeSourceProvenanceCurrent} from './native-source-history.mjs';
