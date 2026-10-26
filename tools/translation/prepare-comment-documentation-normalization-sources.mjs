import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy,withNativeSubstitutionOperation} from './prepare-native-substitution-copy.mjs';
import {prepareActiveConditionalNormalizationSources} from './prepare-active-conditional-normalization-sources.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareCommentDocumentationNormalizationSources({root=ROOT}={}){
 return withNativeSubstitutionOperation(()=>prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/comment-documentation-normalization/complete-originals-and-rules.json.gz',pin:'1ef42de42de8d9435728c64271a3c295ddcd6e5dca97c9390023d65be1424321',id:'router:comment-documentation-normalization-complete-source-substitutions-v1',laterPlans:[prepareActiveConditionalNormalizationSources({root})]}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const plan=prepareCommentDocumentationNormalizationSources();if(args[0]==='--write')writeNativeSubstitutionCopy(plan,{root:ROOT});if(args[0]==='--check'&&[...plan.files,...plan.descendantFiles].some(row=>row.current!==row.currentAfter))throw new TypeError('Comment documentation normalization source copy differs');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),receivingExecuted:false}));
}
