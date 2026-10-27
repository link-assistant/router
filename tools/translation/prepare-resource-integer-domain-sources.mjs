import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy,withNativeSubstitutionOperation,nativeSubstitutionCopyHasChanges} from './prepare-native-substitution-copy.mjs';
import {prepareResourceContainerDomainSources} from './prepare-resource-container-domain-sources.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareResourceIntegerDomainSources({root=ROOT}={}){
 return withNativeSubstitutionOperation(()=>prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/resource-integer-domains-source/complete-originals-and-rules.json.gz',pin:'7a2ea8c926357d84b8baea77cf2298b7d77bdb8dfcd4ba20c9fb14c5589b64e2',id:'router:resource-integer-domains-source-complete-source-substitutions-v1',laterPlans:[prepareResourceContainerDomainSources({root})]}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const plan=prepareResourceIntegerDomainSources();if(args[0]==='--write')writeNativeSubstitutionCopy(plan,{root:ROOT});if(args[0]==='--check'&&nativeSubstitutionCopyHasChanges(plan))throw new TypeError('Resource integer domain source differs');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),receivingExecuted:false}));
}
