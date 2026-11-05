import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy,withNativeSubstitutionOperation,nativeSubstitutionCopyHasChanges} from './prepare-native-substitution-copy.mjs';
import {prepareFixedConstantAdoptionSources} from './prepare-fixed-constant-adoption-sources.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareFixedTypeConstantSources({root=ROOT}={}){
 return withNativeSubstitutionOperation(()=>prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/fixed-type-constants/complete-originals-and-rules.json.gz',pin:'9225cd91fb1c7fd18ce2203bf62686c3a8012b7ab04026d85c74652a47fe921e',id:'router:fixed-type-constants-complete-source-substitutions-v1',laterPlans:[prepareFixedConstantAdoptionSources({root})]}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const plan=prepareFixedTypeConstantSources();if(args[0]==='--write')writeNativeSubstitutionCopy(plan,{root:ROOT});if(args[0]==='--check'&&nativeSubstitutionCopyHasChanges(plan))throw new TypeError('Fixed type constants source differs');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),receivingExecuted:false}));
}
