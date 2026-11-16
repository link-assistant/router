import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy,withNativeSubstitutionOperation,nativeSubstitutionCopyHasChanges} from './prepare-native-substitution-copy.mjs';
import {prepareLocalConstantTypeSources} from './prepare-local-constant-type-sources.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareRemoteClientHealthSources({root=ROOT}={}){
 return withNativeSubstitutionOperation(()=>prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/remote-client-health/complete-originals-and-rules.json.gz',pin:'fede1e457f7eaa14da2f027aafd1a7e80f9c3c2acd2f0f53f0cd2dc911d1b3f8',id:'router:remote-client-health-complete-source-substitutions-v1',laterPlans:[prepareLocalConstantTypeSources({root})]}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const plan=prepareRemoteClientHealthSources();if(args[0]==='--write')writeNativeSubstitutionCopy(plan,{root:ROOT});if(args[0]==='--check'&&nativeSubstitutionCopyHasChanges(plan))throw new TypeError('Remote client health source differs');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),receivingExecuted:false}));
}
