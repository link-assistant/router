import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy,withNativeSubstitutionOperation,nativeSubstitutionCopyHasChanges} from './prepare-native-substitution-copy.mjs';
import {prepareNativeFallthroughControlSources} from './prepare-native-fallthrough-control-sources.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareNativeConstantValuesSources({root=ROOT}={}){
 return withNativeSubstitutionOperation(()=>prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/native-constant-values/complete-originals-and-rules.json.gz',pin:'42331d6e6a9de660b9f00958ebbbb5c937a13544994559d7e88227749af69749',id:'router:native-constant-values-complete-source-substitutions-v1',laterPlans:[prepareNativeFallthroughControlSources({root})]}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const plan=prepareNativeConstantValuesSources();if(args[0]==='--write')writeNativeSubstitutionCopy(plan,{root:ROOT});if(args[0]==='--check'&&nativeSubstitutionCopyHasChanges(plan))throw new TypeError('Native constant values source differs');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),receivingExecuted:false}));
}
