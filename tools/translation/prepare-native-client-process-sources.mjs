import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy,withNativeSubstitutionOperation,nativeSubstitutionCopyHasChanges} from './prepare-native-substitution-copy.mjs';
import {prepareNativeClientProfileSources} from './prepare-native-client-profile-sources.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareNativeClientProcessSources({root=ROOT}={}){
 return withNativeSubstitutionOperation(()=>{const inputs=readPinnedNativeSourceProvenanceInputs(root,{path:'tools/translation/source-profiles/native-client-process/native-inputs.json',pin:'3a6b1e3cf48492e79e4d787cf0274477138c970a0a04096b64261ec3b53bedf1'}),plan=prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/native-client-process/complete-originals-and-rules.json.gz',pin:'5876440d6d0c52e16781179a10d9ed2dcb9d687f7aa7013f25280759a3172e0b',id:'router:native-client-process-complete-source-substitutions-v1',laterPlans:[prepareNativeClientProfileSources({root})]});for(const row of inputs)assertNativeSourceProvenanceCurrent(root,row);return {...plan,nativeInputs:inputs,rustExecuted:false};});
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const plan=prepareNativeClientProcessSources();if(args[0]==='--write')writeNativeSubstitutionCopy(plan,{root:ROOT});if(args[0]==='--check'&&nativeSubstitutionCopyHasChanges(plan))throw new TypeError('Native client process source differs');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),receivingExecuted:false}));
}

import {readPinnedNativeSourceProvenanceInputs,assertNativeSourceProvenanceCurrent} from './native-source-history.mjs';
