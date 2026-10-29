import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy,withNativeSubstitutionOperation,nativeSubstitutionCopyHasChanges} from './prepare-native-substitution-copy.mjs';
import {prepareNativeEmptyModulesSources} from './prepare-native-empty-modules-sources.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareNativeFallthroughControlSources({root=ROOT}={}){
 return withNativeSubstitutionOperation(()=>prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/native-fallthrough-control/complete-originals-and-rules.json.gz',pin:'ae81cacd8c88a45c277f13e5582ae0e486617e4ffef04d7b4ba1f38d79838d94',id:'router:native-fallthrough-control-complete-source-substitutions-v1',laterPlans:[prepareNativeEmptyModulesSources({root})]}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const plan=prepareNativeFallthroughControlSources();if(args[0]==='--write')writeNativeSubstitutionCopy(plan,{root:ROOT});if(args[0]==='--check'&&nativeSubstitutionCopyHasChanges(plan))throw new TypeError('Native fallthrough control source differs');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),receivingExecuted:false}));
}
