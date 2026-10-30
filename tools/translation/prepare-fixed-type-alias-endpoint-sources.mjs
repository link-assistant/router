import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy,withNativeSubstitutionOperation,nativeSubstitutionCopyHasChanges} from './prepare-native-substitution-copy.mjs';
import {prepareBase64ResultInputSources} from './prepare-base64-result-input-sources.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareFixedTypeAliasEndpointSources({root=ROOT}={}){
 return withNativeSubstitutionOperation(()=>prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/fixed-type-alias-endpoint/complete-originals-and-rules.json.gz',pin:'2e44342fbfd5239f431b330a6f53aa6058946fbad7c54d5482565364e0ce1ba1',id:'router:fixed-type-alias-endpoint-complete-source-substitutions-v1',laterPlans:[prepareBase64ResultInputSources({root})]}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const plan=prepareFixedTypeAliasEndpointSources();if(args[0]==='--write')writeNativeSubstitutionCopy(plan,{root:ROOT});if(args[0]==='--check'&&nativeSubstitutionCopyHasChanges(plan))throw new TypeError('Fixed type alias endpoint source differs');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),receivingExecuted:false}));
}
