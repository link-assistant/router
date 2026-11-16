import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy,withNativeSubstitutionOperation,nativeSubstitutionCopyHasChanges} from './prepare-native-substitution-copy.mjs';
import {prepareResourceIntegerDomainSources} from './prepare-resource-integer-domain-sources.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareReversePrimitiveDisplaySources({root=ROOT}={}){
 return withNativeSubstitutionOperation(()=>prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/reverse-primitive-display-source/complete-originals-and-rules.json.gz',pin:'25154638787578f70169f94b8355af1e0fad9d25b54d900e367e7b6924dee700',id:'router:reverse-primitive-display-source-complete-source-substitutions-v1',laterPlans:[prepareResourceIntegerDomainSources({root})]}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const plan=prepareReversePrimitiveDisplaySources();if(args[0]==='--write')writeNativeSubstitutionCopy(plan,{root:ROOT});if(args[0]==='--check'&&nativeSubstitutionCopyHasChanges(plan))throw new TypeError('Reverse primitive display source differs');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),receivingExecuted:false}));
}
