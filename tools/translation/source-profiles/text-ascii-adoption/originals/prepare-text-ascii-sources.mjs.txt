import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy,withNativeSubstitutionOperation} from './prepare-native-substitution-copy.mjs';
import {prepareTextAsciiNativeSources} from './prepare-text-ascii-native-sources.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareTextAsciiSources({root=ROOT}={}){
 const nativeSourcePlan=prepareTextAsciiNativeSources({root});return withNativeSubstitutionOperation(()=>({...prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/text-ascii/complete-originals-and-rules.json.gz',pin:'6ae1666d8c28beb4c44c2e523f9a40fb9c3799ca76cd907e1f8798f4a4e9c20d',id:'router:text-ascii-complete-source-substitutions-v1'}),nativeSourcePlan}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const plan=prepareTextAsciiSources();if(args[0]==='--write')writeNativeSubstitutionCopy(plan,{root:ROOT});if(args[0]==='--check'&&(plan.files.some(row=>row.current!==row.currentAfter)||plan.nativeSourcePlan.current!==plan.nativeSourcePlan.after))throw new TypeError('Text ASCII source copy differs');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),receivingExecuted:false}));
}
