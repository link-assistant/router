import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy,withNativeSubstitutionOperation,nativeSubstitutionCopyHasChanges} from './prepare-native-substitution-copy.mjs';
import {prepareNativeConstantValuesSources} from './prepare-native-constant-values-sources.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function preparePrimitiveVectorGuardsSources({root=ROOT}={}){
 return withNativeSubstitutionOperation(()=>prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/primitive-vector-guards/complete-originals-and-rules.json.gz',pin:'41a61606b8bd470bf3544a5a3ed4c4be38b75de9bc2ae30c408b61faca7db3e2',id:'router:primitive-vector-guards-complete-source-substitutions-v1',laterPlans:[prepareNativeConstantValuesSources({root})]}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const plan=preparePrimitiveVectorGuardsSources();if(args[0]==='--write')writeNativeSubstitutionCopy(plan,{root:ROOT});if(args[0]==='--check'&&nativeSubstitutionCopyHasChanges(plan))throw new TypeError('Primitive vector guards source differs');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),receivingExecuted:false}));
}
