import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy,withNativeSubstitutionOperation} from './prepare-native-substitution-copy.mjs';
import {prepareJsonCloneChainSources} from './prepare-json-clone-chain-sources.mjs';
import {prepareTextOwnedCopyNativeSources} from './prepare-text-owned-copy-native-sources.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareTextOwnedCopySources({root=ROOT}={}){
 const nativeSourcePlan=prepareTextOwnedCopyNativeSources({root});return withNativeSubstitutionOperation(()=>({...prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/text-owned-copy/complete-originals-and-rules.json.gz',pin:'dba14d2de4b8109880d6f61b1072657e8c429a360c33e79054a54434f6c063f9',id:'router:text-owned-copy-complete-source-substitutions-v1',laterPlans:[prepareJsonCloneChainSources({root})]}),nativeSourcePlan}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const plan=prepareTextOwnedCopySources();if(args[0]==='--write')writeNativeSubstitutionCopy(plan,{root:ROOT});if(args[0]==='--check'&&(plan.files.some(row=>row.current!==row.currentAfter)||plan.nativeSourcePlan.current!==plan.nativeSourcePlan.after))throw new TypeError('Text owned copy source copy differs');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),receivingExecuted:false}));
}
