import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy,withNativeSubstitutionOperation} from './prepare-native-substitution-copy.mjs';
import {prepareJsonFilteredFieldNativeSource,prepareJsonFilteredFieldSources} from './prepare-json-filtered-field-sources.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareRustTryTokenSources({root=ROOT}={}){
 return withNativeSubstitutionOperation(()=>prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/rust-try-token-source/complete-originals-and-rules.json.gz',pin:'d129d726d3bfcb85488321b2e08f322fadb0142c3a011ba9d77477db6dec88eb',id:'router:rust-try-token-source-complete-source-substitutions-v1',laterPlans:[prepareJsonFilteredFieldNativeSource({root}),prepareJsonFilteredFieldSources({root})]}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const plan=prepareRustTryTokenSources();if(args[0]==='--write')writeNativeSubstitutionCopy(plan,{root:ROOT});if(args[0]==='--check'&&plan.files.some(row=>row.current!==row.currentAfter))throw new TypeError('Rust Try token source copy differs');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),receivingExecuted:false}));
}
