// Fixed whole-source successor DATA. The caller independently captures/closes
// actual source inputs; no parser, binding, type or executable permission here.
import {capturePhysicalLanguageProducerSourceSuccessor20261104} from './physical-language-output-layout-20261104-history.mjs';
import {createHash} from 'node:crypto';
import {createRulePipeline} from './rule-pipeline.mjs';
import {countedLiteralSubstitutionRule} from './counted-literal-substitution-20261102.mjs';
import {transportConcreteSourceEquations} from './concrete-source-equations.mjs';
import {transportConcreteSyntaxMeta} from './concrete-syntax-meta.mjs';
const BASE='tools/translation/source-profiles/protected-flat-writer-20261102/';
const RECIPE_PIN='dacbac04e88b69d0481b33a9e8f1fcf69b585a3cfcda8f3cc4890ccb2c32ff33'; // Immutable source DATA, never semantic authority.
const PATHS=Object.freeze([
 'tools/translation/forward-output-ownership-20261101-flat-source-install.mjs',
 'tools/translation/forward-output-ownership-20261101-source-history.mjs',
]);
const fail=message=>{throw TypeError('Protected flat writer source succession: '+message);};
export function captureProtectedFlatWriterSourceSuccessor(capture,path,before){
 if(!PATHS.includes(path))return capturePhysicalLanguageProducerSourceSuccessor20261104(capture,path,before);
 if(typeof capture!=='function'||typeof before!=='string')fail('complete source-capture operation and predecessor required');
 const raw=capture(BASE+'equations.json').source;
 if(typeof raw!=='string'||Buffer.byteLength(raw)>1048576)fail('bounded complete source equation document required');
 if(createHash('sha256').update(raw).digest('hex')!==RECIPE_PIN)fail('fixed complete source equation bytes differ');
 const profile=JSON.parse(raw);
 if(profile?.schema!=='router-protected-flat-writer-equations-v1'||!Array.isArray(profile.files)||profile.files.length!==2||profile.files.some((row,index)=>row?.path!==PATHS[index]))fail('exact fixed two-module source cohort required');
 const row=profile.files[PATHS.indexOf(path)];
 if(row.before!==before||typeof row.after!=='string'||!Array.isArray(row.sequences)||row.sequences.length!==2||row.sequences[0].phase!=='language'||row.sequences[1].phase!=='repository')fail('complete original predecessor and two ordered phases required');
 const phases=row.sequences.map(sequence=>{if(!Array.isArray(sequence.rows)||sequence.rows.length>8)fail('bounded complete fixed substitutions required');return {phase:sequence.phase,rules:sequence.rows.map(rule=>countedLiteralSubstitutionRule(rule.id,rule.before,rule.after,rule.count,'complete protected flat source differs'))};});
 const language=createRulePipeline([phases[0],{phase:'repository',rules:[]}]).run(before).value,run=createRulePipeline(phases).run(before);
 if(run.value!==row.after)fail('complete authored flat writer successor differs');
 const equation=transportConcreteSourceEquations([{before,after:row.after,language:'JavaScript'}])[0];
 const stages=transportConcreteSourceEquations([{before,after:language,language:'JavaScript'},{before:language,after:row.after,language:'JavaScript'}]).map((value,index)=>({...value,phase:index?'repository':'language'}));
 if(equation.inverse!==before||transportConcreteSyntaxMeta(equation.beforeMeta).source!==before||transportConcreteSyntaxMeta(equation.afterMeta).source!==row.after)fail('whole flat writer CST/inverse differs');
 if(capture(path).source!==row.after)fail('actual flat writer/source-history module is not the complete authored successor');
 return {id:'protected-flat-writer-20261102',path,before,after:row.after,language,inverse:before,equation,stages,ruleTrace:run.trace,sourceAuthority:false,semanticAuthority:false};
}
