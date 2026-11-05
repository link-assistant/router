// Complete named source substitutions DATA. No automatic source installation.
import {fileURLToPath} from 'node:url';
import {createReconcileSourceCapture,boundedReconcileWireBytes,requireReconcile as need} from './paired-sync-reconcile-20261101-support.mjs';
import {transportConcreteSourceEquations} from './concrete-source-equations.mjs';
import {createRulePipeline} from './rule-pipeline.mjs';
import {countedLiteralSubstitutionRule} from './counted-literal-substitution-20261102.mjs';
import {copyMetadata} from './extensions/source-links.mjs';
import {accountPrimitiveVectorIteratorBulkData as account} from './primitive-vector-iterator-bulk-20261101-accounting.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const BASE='tools/translation/source-profiles/protected-cst-cli-writers-20261102/';
const NAMES=Object.freeze(['batched-whole-owner-proof-byte-source-candidate','cst-batched-whole-owner-core-producer','cst-batched-whole-owner-corpus-producer','cst-batched-whole-owner-derive-producer','cst-batched-whole-owner-resolver-producer','private-concrete-substitution-batch-historical-producer','private-parser-assignment-data-historical-producer']);
function equation(name,before,after){
 const run=createRulePipeline([{phase:'language',rules:[]},{phase:'repository',rules:[countedLiteralSubstitutionRule('router:protect-actual-cst-source-cli-write',before,after,1,'complete original CST producer source differs')]}]).run(before);
 need(run.value===after,'whole protected CST CLI source differs');
 const history=transportConcreteSourceEquations([{before,after,language:'JavaScript'}])[0];need(history.inverse===before,'complete CST CLI source inverse differs');
 return {path:'tools/translation/'+name+'.mjs',before,after,currentAfter:after,inverse:before,history,trace:run.trace,sourceAuthority:false,semanticAuthority:false,verification:'UNRUN'};
}
function operate(root,operation){const capture=createReconcileSourceCapture(root);let result,failed=false,primary;
 try{result=operation(capture);boundedReconcileWireBytes(result);}catch(error){failed=true;primary=error;}
 try{capture.close();}catch(error){if(!failed){failed=true;primary=error;}}if(failed)throw primary;return result;
}
function pair(capture,name){const before=capture.capture(BASE+name+'.before.txt').source,after=capture.capture(BASE+name+'.after.txt').source;need(typeof before==='string'&&typeof after==='string','complete fixed source images required');return {before,after};}
export function proposeProtectedCstCliSources(input,{root=ROOT}={}){account(input);input=copyMetadata(input);return operate(root,capture=>{
 need(Array.isArray(input)&&input.length===NAMES.length,'all seven actual original CST CLI inputs required');
 const files=NAMES.map((name,at)=>{const source=pair(capture,name),row=input[at];need(row?.path==='tools/translation/'+name+'.mjs'&&row.source===source.before,'exact original CST producer path and source required');return equation(name,source.before,source.after);});
 return {schema:'protected-cst-cli-writers-source-proposal-20261102-v1',files,sourceInstalled:false,sourceAuthority:false,semanticAuthority:false,verification:'UNRUN'};
});}
export function knownProtectedCstCliSuccessor({root=ROOT,path,before}={}){
 const name=NAMES.find(name=>path==='tools/translation/'+name+'.mjs');if(!name)return null;
 return operate(root,capture=>{const source=pair(capture,name);need(capture.capture(path).source===source.after,'actual current protected CST CLI differs');return before===source.before?equation(name,source.before,source.after):null;});
}

// A finite historical producer may prepare this exact later CLI equation before
// installation. This does not grant physical/source/native mutation authority.
export function prepareProtectedCstCliSuccessor({root=ROOT,path,before}={}){
 const name=NAMES.find(name=>path==='tools/translation/'+name+'.mjs');if(!name)return null;
 return operate(root,capture=>{const source=pair(capture,name);return before===source.before?{...equation(name,source.before,source.after),current:capture.capture(path).source}:null;});
}
