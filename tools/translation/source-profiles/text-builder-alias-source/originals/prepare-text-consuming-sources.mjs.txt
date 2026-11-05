import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy,withNativeSubstitutionOperation,nativeSubstitutionCopyHasChanges} from './prepare-native-substitution-copy.mjs';
import {prepareTextConsumingNativeSources} from './prepare-text-consuming-native-sources.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareTextConsumingSources({root=ROOT}={}){
 const nativeSourcePlan=prepareTextConsumingNativeSources({root});return withNativeSubstitutionOperation(()=>({...prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/text-consuming-source/complete-originals-and-rules.json.gz',pin:'ac981970cfe2713f0bfafff5fbbd00f2ce40b5c010e06f5fa919910b86943beb',id:'router:text-consuming-source-complete-source-substitutions-v1'}),nativeSourcePlan}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const plan=prepareTextConsumingSources();if(args[0]==='--write')writeNativeSubstitutionCopy(plan,{root:ROOT});if(args[0]==='--check'&&(nativeSubstitutionCopyHasChanges(plan)||plan.nativeSourcePlan.current!==plan.nativeSourcePlan.after))throw new TypeError('Text consuming source differs');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),receivingExecuted:false}));
}
