// Paired edited targets share one actual fresh whole-corpus inverse. SOURCE / UNRUN.
// No candidate/compiler/result callback and no caller-supplied admission flags.
import {copyMetadata} from './extensions/source-links.mjs';
import {accountPrimitiveVectorIteratorBulkData as account} from './primitive-vector-iterator-bulk-20261101-accounting.mjs';
import {proposeOpaqueBodyArithmeticInverse} from './opaque-body-arithmetic-20261102-inverse.mjs';
import {createRulePipeline} from './rule-pipeline.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta} from './concrete-syntax-meta.mjs';
import {withOpaqueBodyArithmeticSources as withOpaquePairedLiteralSources} from './opaque-body-arithmetic-20261102-history.mjs';
const fail=message=>{throw TypeError('Whole-corpus paired literal inverse: '+message);};

/**
 * Both submitted files are authored desired projections, not optional stale
 * peers. `language` selects the changed peer used for actual literal inference.
 * The other complete file must equal its independently emitted projection.
 */
export function proposeOpaquePairedBodyArithmeticInverse(configuration,submitted){
 account({configuration,submitted});const input=copyMetadata(configuration),pair=copyMetadata(submitted);
 if(!pair||Object.keys(pair).sort().join(',')!=='javascript,language,typescript'||!['JavaScript','TypeScript'].includes(pair.language)||typeof pair.javascript!=='string'||typeof pair.typescript!=='string')fail('closed complete paired desired targets and changed authority language required');
 return withOpaquePairedLiteralSources(()=>{
  let proposal;
  const result=createRulePipeline([
   {phase:'language',rules:[
    {id:'language:retain-both-authored-targets-through-serialized-reparsed-CST',apply:()=>{
     for(const [language,source]of [['JavaScript',pair.javascript],['TypeScript',pair.typescript]]){
      const concrete=transportConcreteSyntaxSource(source,{language});if(transportConcreteSyntaxMeta(concrete.meta).source!==source)fail('complete authored paired target CST inverse differs');
     }
     return null;
    }},
    {id:'language:one-fresh-whole-corpus-bulk-literal-inverse-for-selected-authored-peer',apply:()=>{
     proposal=proposeOpaqueBodyArithmeticInverse(input,{language:pair.language,source:pair.language==='JavaScript'?pair.javascript:pair.typescript});
     // The result is from the direct fixed compiler call above, never a
     // serialized user proposal or injected callback. The compiler emitted
     // both targets from the independently checked changed native program.
     if(proposal.javascript!==pair.javascript||proposal.typescript!==pair.typescript)fail('conflicting complete authored JS/TS projections; originals retained');
     return null;
    }},
   ]},
   {phase:'repository',rules:[{id:'repository:retain-agreed-complete-native-and-both-authored-target-inverses',apply:()=>({
    ...proposal,schema:'whole-corpus-paired-body-scalar-predicate-arithmetic-proposal-v1',
    selectedLanguage:pair.language,authoredLanguages:['JavaScript','TypeScript'],
    pairedTargetAgreement:true,inverseRuleTrace:proposal.ruleTrace,
    sourceInstalled:false,sourceAuthority:false,semanticAuthority:false,
    wholeRouterSynchronization:false,arbitraryEditedTargetsSupported:false,
   })}]},
  ]).run(null),answer={...result.value,ruleTrace:result.trace};account(answer);return answer;
 });
}
