import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy,withNativeSubstitutionOperation} from './prepare-native-substitution-copy.mjs';
import {prepareTextOptionFallbackNativeSources} from './prepare-text-option-fallback-native-sources.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareTextOptionFallbackSources({root=ROOT}={}){
 const nativeSourcePlan=prepareTextOptionFallbackNativeSources({root});return withNativeSubstitutionOperation(()=>({...prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/text-option-fallbacks/complete-originals-and-rules.json.gz',pin:'ca7027a42663e01c7a3f69a3296c562e00c1048a519a720d34f91e543eda0ce1',id:'router:text-option-fallbacks-complete-source-substitutions-v1'}),nativeSourcePlan}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const plan=prepareTextOptionFallbackSources();if(args[0]==='--write')writeNativeSubstitutionCopy(plan,{root:ROOT});if(args[0]==='--check'&&(plan.files.some(row=>row.current!==row.currentAfter)||plan.nativeSourcePlan.current!==plan.nativeSourcePlan.after))throw new TypeError('Text option fallbacks source copy differs');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),receivingExecuted:false}));
}
