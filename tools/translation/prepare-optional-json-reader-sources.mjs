import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy,withNativeSubstitutionOperation} from './prepare-native-substitution-copy.mjs';
import {prepareOptionalJsonCatalogueSources} from './prepare-optional-json-catalogue-sources.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareOptionalJsonReaderSources({root=ROOT}={}){
 return withNativeSubstitutionOperation(()=>prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/optional-json-readers/complete-originals-and-rules.json.gz',pin:'57246a94201df7369f09d8863e7cd7c8dd8a726f7a97dba1de3e1715c3cec9d1',id:'router:optional-json-readers-complete-source-substitutions-v1',laterPlans:[prepareOptionalJsonCatalogueSources({root})]}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const plan=prepareOptionalJsonReaderSources();if(args[0]==='--write')writeNativeSubstitutionCopy(plan,{root:ROOT});if(args[0]==='--check'&&plan.files.some(row=>row.current!==row.currentAfter))throw new TypeError('Optional JSON readers source copy differs');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),receivingExecuted:false}));
}
