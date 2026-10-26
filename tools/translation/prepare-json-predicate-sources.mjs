import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy,withNativeSubstitutionOperation} from './prepare-native-substitution-copy.mjs';
import {prepareJsonCollectionChainSources} from './prepare-json-collection-chain-sources.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareJsonPredicateSources({root=ROOT}={}){
 return withNativeSubstitutionOperation(()=>prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/json-predicates/complete-originals-and-rules.json.gz',pin:'51c490d921957199d70f5dab3591861523ff76e0f2b602b1057ec2f83fb6b911',id:'router:json-predicates-complete-source-substitutions-v1',laterPlans:[prepareJsonCollectionChainSources({root})]}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const plan=prepareJsonPredicateSources();if(args[0]==='--write')writeNativeSubstitutionCopy(plan,{root:ROOT});if(args[0]==='--check'&&plan.files.some(row=>row.current!==row.currentAfter))throw new TypeError('JSON predicates source copy differs');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),receivingExecuted:false}));
}
