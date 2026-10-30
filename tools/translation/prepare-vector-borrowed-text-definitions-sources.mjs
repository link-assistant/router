import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy,withNativeSubstitutionOperation,nativeSubstitutionCopyHasChanges} from './prepare-native-substitution-copy.mjs';
import {prepareVectorLiteralAliasesSources} from './prepare-vector-literal-aliases-sources.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareVectorBorrowedTextDefinitionsSources({root=ROOT}={}){
 return withNativeSubstitutionOperation(()=>prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/vector-borrowed-text-definitions/complete-originals-and-rules.json.gz',pin:'c241e1333c48ab444b7ff6fe0bfc9fe6e3e76dd23d20f6873cbf05141876dbd0',id:'router:vector-borrowed-text-definitions-complete-source-substitutions-v1',laterPlans:[prepareVectorLiteralAliasesSources({root})]}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const plan=prepareVectorBorrowedTextDefinitionsSources();if(args[0]==='--write')writeNativeSubstitutionCopy(plan,{root:ROOT});if(args[0]==='--check'&&nativeSubstitutionCopyHasChanges(plan))throw new TypeError('Vector borrowed text definition source differs');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),receivingExecuted:false}));
}
