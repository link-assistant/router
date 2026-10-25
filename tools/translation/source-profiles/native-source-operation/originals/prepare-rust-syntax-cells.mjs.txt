import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy} from './prepare-native-substitution-copy.mjs';
import {preparePortableRustModuleInverse} from './prepare-portable-rust-module-inverse.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareRustSyntaxCells({root=ROOT}={}){
 return prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/rust-syntax-cells/complete-originals-and-rules.json.gz',pin:'fc7e2757bdf9d24bdeec799996a28ff74dbebdc3ee34b9f5c4562312938e347e',id:'router:rust-syntax-cells-source-copy-v1',laterPlans:[preparePortableRustModuleInverse({root})]});
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');
 const plan=prepareRustSyntaxCells();if(args[0]==='--write')writeNativeSubstitutionCopy(plan,{root:ROOT});
 if(args[0]==='--check'&&plan.files.some(row=>row.current!==row.currentAfter))throw new TypeError('Rust syntax cell source copy is stale');
 console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),receivingExecuted:false}));
}
