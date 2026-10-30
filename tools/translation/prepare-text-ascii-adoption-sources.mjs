import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy,withNativeSubstitutionOperation} from './prepare-native-substitution-copy.mjs';
import {prepareArchitectureX86MetadataSources} from './prepare-architecture-x86-metadata-sources.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareTextAsciiAdoptionSources({root=ROOT}={}){
 return withNativeSubstitutionOperation(()=>prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/text-ascii-adoption/complete-originals-and-rules.json.gz',pin:'dfdf3ad225caf3f15baed50450bc261f3d6ef816c1bdf895e6ff94afd4958213',id:'router:text-ascii-adoption-complete-source-substitutions-v1',laterPlans:[prepareArchitectureX86MetadataSources({root})]}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const plan=prepareTextAsciiAdoptionSources();if(args[0]==='--write')writeNativeSubstitutionCopy(plan,{root:ROOT});if(args[0]==='--check'&&plan.files.some(row=>row.current!==row.currentAfter))throw new TypeError('Text ASCII adoption source copy differs');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),receivingExecuted:false}));
}
