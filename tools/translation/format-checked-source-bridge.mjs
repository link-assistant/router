// Invoke the existing checked primitive formatter with its original owner and
// lexical guards. Source compiler staging adds evidence, never broader admission.
import {createHash} from 'node:crypto';
import {translateSource} from './translate.mjs';
import {freezeMacroTree} from './macro-token-trees.mjs';
import {isPinnedFormatSourceStages,formatSourceStageInput} from './format-source-profiles.mjs';
import {planOriginalFormatArgumentSyntax} from './format-argument-source-plan.mjs';
import {compileFormatCallbackDataflow,compileFormatCallbackForwarder,applyFormatCallbackForwarder,compileBuiltinRegistrationDataflow,selectBuiltinRegistrationDataflow} from './format-builtin-dataflow.mjs';
const states=new WeakMap(),hash=source=>createHash('sha256').update(source).digest('hex');
function formatNodes(root) {
  const found=[];let cells=0;
  function visit(node) {
    if(!node||typeof node!=='object')return;if(++cells>100000)throw new RangeError('Checked formatting evidence cell budget');
    if(node.formatProvenance)found.push(node);
    for(const [key,value] of Object.entries(node))if(!['type','span','formatProvenance'].includes(key))if(Array.isArray(value))value.forEach(visit);else visit(value);
  }
  visit(root);return found;
}
export function compileRegisteredFormatCallbackStage(proof,{registrationPath,callbackSourcePath,registeredName}) {
  if(!isPinnedFormatSourceStages(proof))throw new TypeError('Original builtin stage requires private pinned source proof');
  const registration=compileBuiltinRegistrationDataflow(proof,registrationPath),row=selectBuiltinRegistrationDataflow(registration,registeredName);
  if(!row.callbackPath||row.callbackPath.some(part=>part==='.')||row.callbackPath.length<3)throw new TypeError('Original registered callback path remains unsupported');
  const callback=compileFormatCallbackDataflow(proof,callbackSourcePath,row.callbackPath.at(-1)),forwarder=compileFormatCallbackForwarder(callback);
  // The callback's module owner is deliberately not inferred from its filename.
  const forwarded=applyFormatCallbackForwarder(forwarder,forwarder.parameters.map((name,index)=>({kind:'original-callback-input',name,index}))),target=compileFormatCallbackDataflow(proof,callbackSourcePath,forwarded.callPath.at(-1));
  const stage=freezeMacroTree({schema:'source-format-builtin-callback-stage-v1',registration,row,callback,forwarder,forwarded,target,callbackModuleOwnerResolved:false,sourceSemanticClosureVerified:false,builtinBuilderOwnerResolved:false,traitSelectionVerified:false,allocatorEffectsVerified:false,ioEffectsVerified:false,namespaceAuthority:false,runtimeParity:false});states.set(stage,{proof});return stage;
}
export function translateCheckedPrimitiveFormatSource(source,{path='input.rs',proof,builtinStages=[]}={}) {
  if(typeof source!=='string'||Buffer.byteLength(source)>1000000)throw new TypeError('Original formatting bridge source exceeds budget');
  if(!isPinnedFormatSourceStages(proof))throw new TypeError('Checked format source bridge requires private original source inputs');
  if(!Array.isArray(builtinStages)||builtinStages.some(stage=>states.get(stage)?.proof!==proof||stage.schema!=='source-format-builtin-callback-stage-v1'))throw new TypeError('Unsealed or differently pinned builtin source stage');
  // No caller-supplied source scopes, macro evidence, checked IR or owner flags.
  const translated=translateSource(source,path),records=[];
  for(const item of translated.ir.items)if(item.status==='executable'&&item.semantic?.checkedIR)for(const node of formatNodes(item.semantic.checkedIR)) {
    const evidence=node.formatProvenance,macro=evidence.sourceMacroSpan,template=evidence.sourceTemplateSpan;
    if(!macro||!template||![macro.start,macro.end,template.start,template.end].every(Number.isSafeInteger)||macro.start<item.span.start||macro.end>item.span.end||template.start<macro.start||template.end>macro.end)throw new TypeError('Checked original formatting source spans are incoherent');
    if(evidence.profile!=='checked-primitive-format-v1'||node.type?.kind!=='string')throw new TypeError('Existing formatter did not provide its checked owned String boundary');
    const invocation=source.slice(macro.start,macro.end),plan=planOriginalFormatArgumentSyntax(invocation);
    if(!plan.template||invocation.slice(plan.template.span.start,plan.template.span.end)!==source.slice(template.start,template.end)||plan.arguments.length!==evidence.explicitArgumentCount)throw new TypeError('Existing formatter source evidence differs from original invocation');
    records.push({itemName:item.name,itemSpan:item.span,itemSha256:item.sha256,macroSpan:macro,macroSha256:hash(invocation),templateSpan:template,plan,checkedFormatterProfile:evidence.profile,checkedExplicitArgumentCount:evidence.explicitArgumentCount,checkedPrimitiveValueLowering:true,standaloneArgumentsLowered:false,originalBuiltinExecutionVerified:false});
  }
  const diagnostics=[...proof.diagnostics];
  // Every available input remains pinned; missing registration cannot become a
  // spelling-based owner shortcut. This unit grants no fmt::Arguments ABI.
  for(const input of proof.availableInputs)formatSourceStageInput(proof,input.sourcePath);
  const report=freezeMacroTree({schema:'checked-primitive-original-format-bridge-v1',sourcePath:path,sourceSha256:hash(source),records,diagnostics,compilerDataflowStages:builtinStages,listedCompilerStageInputsAvailable:proof.allSourceInputsVerified&&builtinStages.length>0,carriedItems:translated.ir.items.filter(item=>item.status==='carried').map(item=>({name:item.name,span:item.span,diagnostic:item.diagnostic})),ordinaryTranslatorGuardsRetained:true,additionalDeclarationsAdmitted:0,standaloneArgumentsLowered:false,builtinBuilderOwnerResolved:false,sourceSemanticClosureVerified:false,traitSelectionVerified:false,allocatorEffectsVerified:false,ioEffectsVerified:false,namespaceAuthority:false,runtimeParity:false});
  const result={...translated,formatSourceBridge:report};states.set(result,{source,proof,report});return result;
}
export const isCheckedPrimitiveFormatSourceBridge=result=>states.has(result);
