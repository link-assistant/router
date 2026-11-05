import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy,withNativeSubstitutionOperation} from './prepare-native-substitution-copy.mjs';
import {prepareTextSha256NativeSources} from './prepare-text-sha256-native-sources.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareTextSha256Sources({root=ROOT}={}){
 const nativeSourcePlan=prepareTextSha256NativeSources({root});return withNativeSubstitutionOperation(()=>({...prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/text-sha256/complete-originals-and-rules.json.gz',pin:'93378e9541c677fda2239ad2e3cf628075c9ab540bb280fe10046840e90d92e7',id:'router:text-sha256-complete-source-substitutions-v1'}),nativeSourcePlan}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const plan=prepareTextSha256Sources();if(args[0]==='--write')writeNativeSubstitutionCopy(plan,{root:ROOT});if(args[0]==='--check'&&(plan.files.some(row=>row.current!==row.currentAfter)||plan.nativeSourcePlan.current!==plan.nativeSourcePlan.after))throw new TypeError('Text SHA256 source copy differs');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),receivingExecuted:false}));
}
