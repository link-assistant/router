import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy,withNativeSubstitutionOperation} from './prepare-native-substitution-copy.mjs';
import {prepareArchitectureX86LookupSources} from './prepare-architecture-x86-lookup-sources.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareTextualMacroLookupSources({root=ROOT}={}){
 return withNativeSubstitutionOperation(()=>prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/textual-macro-lookup/complete-originals-and-rules.json.gz',pin:'97b12bd45f49d690889e57b702562d402dd3726c3a54d1a0cfb99e91315ce247',id:'router:textual-macro-lookup-complete-source-substitutions-v1',laterPlans:[prepareArchitectureX86LookupSources({root})]}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const plan=prepareTextualMacroLookupSources();if(args[0]==='--write')writeNativeSubstitutionCopy(plan,{root:ROOT});if(args[0]==='--check'&&plan.files.some(row=>row.current!==row.currentAfter))throw new TypeError('Textual macro lookup source copy differs');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),receivingExecuted:false}));
}
