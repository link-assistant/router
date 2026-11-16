// Source DATA only. Keep the complete immutable original native render beside
// every configured proposal; these rows do not authenticate a macro owner.
import {proposeCommonBuiltinActiveConditionalSources as proposeActiveConditionalTrackedTextualSources,proposeCommonBuiltinConfiguredTrackedSources as proposeLiteralDocInnerLintConfiguredTrackedTextualSources} from './common-builtin-tracked-source.mjs';
import {originalMacroTrees} from './macro-token-trees.mjs';
import {transportConcreteSourceEquations} from './concrete-source-equations.mjs';
import {compilationProfile} from './cfg-profile.mjs';
import {createRulePipeline} from './rule-pipeline.mjs';
const need=(value,message)=>{if(!value)throw new TypeError('Generated conditional source: '+message);};
export function proposeCommonBuiltinGeneratedConditionalSource(source,{sourcePath,compilationProfile:input=null}={}){
 need(typeof source==='string'&&Buffer.byteLength(source)<=256000&&!/\p{Surrogate}/u.test(source),'complete bounded well-formed original generated source required');const profile=compilationProfile(input),profileText=JSON.stringify(profile);
 // This scan independently retains the original generated-inner refusal even
 // when a later source rule could otherwise remove that exact attribute.
 let cells=0;function inner(nodes,depth=0){need(depth<=64,'original generated delimiter bound');for(let index=0;index<nodes.length;index++){need(++cells<=32000,'original generated tree-cell bound');const node=nodes[index];if(node.kind==='token'&&node.text==='#'&&nodes[index+1]?.text==='!')need(false,'generated inner attributes require an independent enclosing producer rule');if(node.kind==='group')inner(node.children,depth+1);}}
 inner(originalMacroTrees(source,{maxBytes:256000,maxTokens:32000,maxDepth:64}));let active,configured,after=source,retainedRawBytes=Buffer.byteLength(source);
 const current=()=>need(JSON.stringify(compilationProfile(input))===profileText,'original explicit generated compilation profile changed');
 const run=createRulePipeline([
  {phase:'language',rules:[
   {id:'rust:source-select-original-generated-active-conditional-attributes',apply:()=>{
    current();active=proposeActiveConditionalTrackedTextualSources({entry:sourcePath,paths:[sourcePath],readSource:()=>source,compilationProfile:profile});need(active.refusals.length===0&&active.files.length===1,'every original generated active conditional producer must close');const row=active.files[0];need(row.before===source&&row.history.inverse===source,'complete original generated active conditional join required');after=row.after;retainedRawBytes+=Buffer.byteLength(after);need(retainedRawBytes<=8388608,'complete generated original and active source bound');return after;
   }},
   {id:'rust:source-select-original-generated-inactive-items-and-remaining-config-spans',apply:()=>{
    current();const before=after;configured=proposeLiteralDocInnerLintConfiguredTrackedTextualSources({entry:sourcePath,paths:[sourcePath],readSource:()=>before,compilationProfile:profile});need(configured.refusals.length===0&&configured.files.length===1,'every remaining original generated conditional producer must close');const row=configured.files[0];need(row.before===before&&row.history.inverse===before,'complete original generated configured join required');after=row.after;retainedRawBytes+=Buffer.byteLength(after);need(retainedRawBytes<=8388608&&Buffer.byteLength(after)<=256000,'complete original active and configured generated source bounds');return after;
   }},
  ]},
  {phase:'repository',rules:[{id:'router:retain-native-generated-active-and-configured-source-domains-separately',apply:()=>{
   current();const history=transportConcreteSourceEquations([{before:source,after,language:'Rust'}])[0];need(history.inverse===source,'complete original native generated source inverse required');return {schema:'common-builtin-generated-conditional-source-proposal-v1',sourcePath,before:source,after,active,configured,history,retainedRawBytes,observedSourceCells:cells+active.observedSourceCells+configured.observedSourceCells,compilationProfile:profile,compilerDiagnosticTracePreserved:false,originalSourceEquivalenceQualified:false,sourceAuthority:false,semanticAuthority:false,namespaceAuthority:false,runtimeAuthority:false,crossInvocationCache:false,receivingExecuted:false};
  }}]},
 ]).run(null);current();return {...run.value,ruleTrace:run.trace};
}
