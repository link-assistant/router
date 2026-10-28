import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy,withNativeSubstitutionOperation,nativeSubstitutionCopyHasChanges} from './prepare-native-substitution-copy.mjs';
import {prepareRemoteClientHealthSources} from './prepare-remote-client-health-sources.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareFixedCastTypeSources({root=ROOT}={}){
 return withNativeSubstitutionOperation(()=>prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/fixed-cast-type/complete-originals-and-rules.json.gz',pin:'d6ee9fd3a99b18294c5310bbcc1cf7f65d7ba4b9e1e0ab9328e9e28dc25ae5a4',id:'router:fixed-cast-type-complete-source-substitutions-v1',laterPlans:[prepareRemoteClientHealthSources({root})]}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const plan=prepareFixedCastTypeSources();if(args[0]==='--write')writeNativeSubstitutionCopy(plan,{root:ROOT});if(args[0]==='--check'&&nativeSubstitutionCopyHasChanges(plan))throw new TypeError('Fixed cast type source differs');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),receivingExecuted:false}));
}
