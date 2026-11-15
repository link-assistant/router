// Whole source history DATA; the original class/birth checks remain independent.
import {createRulePipeline} from './rule-pipeline.mjs';
import {exactLiteralSubstitutionRule} from './literal-substitution-rule.mjs';
import {transportConcreteNamedSourcePhases} from './concrete-source-origin-phases.mjs';
const fail=reason=>{throw TypeError('Class birth receiver history: '+reason);};
function substitute(source,edits,inverse=false){
 const phases=inverse?['repository','language']:['language','repository'];
 for(const phase of phases){
  const selected=edits.filter(row=>row.phase===phase);if(inverse)selected.reverse();
  for(const edit of selected){
   const before=inverse?edit.after:edit.before,after=inverse?edit.before:edit.after;
   if(source.split(before).length!==2)fail('complete unique receiver anchor differs');
   source=source.replace(before,()=>after);
  }
 }
 return source;
}
export function reconstructClassBirthInput({current,installed,receiver,restore,pin,expected}){
 if(current!==receiver.after)fail('complete current receiver successor required');
 if(!installed)fail('complete registered predecessor required');
 const predecessor=pin(receiver.before);
 // The installed program can precede the receiver change or already include
 // it. Both paths reconstruct the same original, independently pinned input.
 let unhooked;
 if(installed.after.sha256===predecessor.sha256&&installed.after.bytes===predecessor.bytes)
  unhooked=restore(receiver.before,installed);
 else {
  const physical=pin(current);
  if(installed.after.sha256!==physical.sha256||installed.after.bytes!==physical.bytes)
   fail('registered source has an unknown successor');
  unhooked=substitute(restore(current,installed),receiver.sequence,true);
 }
 const originalPin=pin(unhooked);
 if(originalPin.sha256!==expected.sha256||originalPin.bytes!==expected.bytes)
  fail('complete original class input differs');
 const rules=phase=>receiver.sequence.filter(row=>row.phase===phase).map(row=>
  exactLiteralSubstitutionRule(row.id,row.before,row.after,'complete class receiver source differs'));
 const language=createRulePipeline([{phase:'language',rules:rules('language')},{phase:'repository',rules:[]}]).run(unhooked);
 const complete=createRulePipeline([{phase:'language',rules:rules('language')},{phase:'repository',rules:rules('repository')}]).run(unhooked);
 if(substitute(complete.value,receiver.sequence,true)!==unhooked)fail('complete receiver inverse differs');
 const [equation]=transportConcreteNamedSourcePhases([{
  before:unhooked,middle:language.value,after:complete.value,language:'JavaScript',
  rules:['class-birth:receiver-language','class-birth:receiver-repository','class-birth:receiver-language-inverse','class-birth:receiver-repository-inverse'],
 }]);
 if(equation.before!==unhooked||equation.after!==complete.value||equation.inverse!==unhooked)
  fail('complete serialized receiver history differs');
 return {original:unhooked,source:equation.after,equation,receiver,trace:complete.trace,
  sourceAuthority:false,runtimeAuthority:false};
}
