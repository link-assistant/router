import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy,withNativeSubstitutionOperation,nativeSubstitutionCopyHasChanges} from './prepare-native-substitution-copy.mjs';
import {prepareNativeClientLaunchSources} from './prepare-native-client-launch-sources.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareNativeRunCredentialSources({root=ROOT}={}){
 return withNativeSubstitutionOperation(()=>{const inputs=readPinnedNativeSourceProvenanceInputs(root,{path:'tools/translation/source-profiles/native-run-credential/native-inputs.json',pin:'5a25333a03b4a9de12e78d97d3609a954a115feeb55fc513f2c2ff835d626ec5'}),plan=prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/native-run-credential/complete-originals-and-rules.json.gz',pin:'6253343893ee9400024dd8bafe400d0ab8e49ef55b56f275ece8d6942d096f0e',id:'router:native-run-credential-complete-source-substitutions-v1',laterPlans:[prepareNativeClientLaunchSources({root})]});for(const row of inputs)assertNativeSourceProvenanceCurrent(root,row);return {...plan,nativeInputs:inputs,rustExecuted:false};});
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const plan=prepareNativeRunCredentialSources();if(args[0]==='--write')writeNativeSubstitutionCopy(plan,{root:ROOT});if(args[0]==='--check'&&nativeSubstitutionCopyHasChanges(plan))throw new TypeError('Native run credential source differs');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),receivingExecuted:false}));
}

import {readPinnedNativeSourceProvenanceInputs,assertNativeSourceProvenanceCurrent} from './native-source-history.mjs';
