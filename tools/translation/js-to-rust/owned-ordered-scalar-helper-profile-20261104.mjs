// Install only with both source-reader/document successors. SOURCE UNRUN.
import * as coreSource from './owned-core-source.mjs';
import * as vectorSource from './owned-vector-candidate-source.mjs';
import * as coreOperations from './owned-core-operations.mjs';
import * as vectorOperations from './owned-vector-candidate-operations.mjs';
import * as coreDocument from './owned-core-ordered-scalar-helper-document-20261104.mjs';
import * as vectorDocument from './owned-vector-candidate-ordered-scalar-helper-document-20261104.mjs';
import {prepareReverseConcreteSource,parseReverseConcreteSource} from './concrete-source.mjs';
import {withOwnedNativeProjectOperation} from './owned-native-project-operation.mjs';
import {withCompleteSourceClosingFence} from '../complete-source-closing-fence.mjs';
import {createRulePipeline} from '../rule-pipeline.mjs';
const lanes=Object.freeze({core:[coreSource,coreOperations,coreDocument],vector:[vectorSource,vectorOperations,vectorDocument]});
const fail=message=>{throw TypeError('Owned Copy scalar helper profile: '+message);};
function lane(variant){if(typeof variant!=='string'||!Object.hasOwn(lanes,variant))fail('explicit core or vector lane required');return lanes[variant];}
function translate(stage,options){
 const data=options,expected=['variant','sourcePath','input',...(Object.hasOwn(data,'typescriptOutputPath')?['typescriptOutputPath']:[])];
 if(Object.keys(data).sort().join('\0')!==expected.sort().join('\0'))fail('exact source operation options required');
 const [source,operations,document]=lane(data.variant),context=source.createOwnedCoreOrderedScalarHelperSourceContext(data.input);
 return withCompleteSourceClosingFence(()=>{
  const original=source.ownedCoreSourceData(context).files.find(row=>row.path===data.sourcePath);
  if(!original||original.source!==stage.source||stage.concreteSyntax.language!==(/\.(?:mts|ts)$/u.test(data.sourcePath)?'TypeScript':'JavaScript'))fail('complete original source/path/language differs');
  const result=createRulePipeline([
   {phase:'language',rules:[
    {id:'language:check-original-imported-helper-declarations-and-whole-caller',apply:()=>{const analysis=operations.analyzeOwnedCoreModule(context,data.sourcePath);if(analysis.diagnostics.length)fail(analysis.diagnostics[0].message);return analysis;}},
    {id:'language:serialize-all-caller-helper-reexport-cst-and-reissue-from-meta',apply:analysis=>{const meta=document.serializeOwnedOrderedScalarHelperDocument20261104(analysis.program,{context});const program=document.readOwnedOrderedScalarHelperDocument20261104(meta);return {analysis,meta,program};}},
    {id:'language:emit-through-original-checked-owned-operations',apply:row=>({...row,rust:operations.emitOwnedCoreProgram(row.program,'rust'),typescript:operations.emitOwnedCoreProgram(row.program,'typescript',{outputPath:data.typescriptOutputPath})})},
   ]},
   {phase:'repository',rules:[{id:'repository:package-explicit-Boolean-helper-source-profile',apply:row=>({...row,profile:'router-owned-ordered-scalar-helper-source-20261104-v1',variant:data.variant,concreteSyntax:stage.concreteSyntax,runtimeParity:false,rustExecuted:false,productionSelected:false})}]},
  ]).run(null);return {...result.value,trace:result.trace};
 },[()=>source.requireOwnedCoreSourceCurrent(context)]);
}
export function translateOwnedOrderedScalarHelperSource20261104(text,options){
 const data=coreSource.ownedPlainData(options);return coreSource.withOwnedOrderedScalarHelperSourceOperation(()=>withOwnedNativeProjectOperation(()=>translate(prepareReverseConcreteSource(text,/\.(?:mts|ts)$/u.test(data.sourcePath)?'TypeScript':'JavaScript'),data)));
}
export function translateOwnedOrderedScalarHelperConcreteMeta20261104(text,options){
 const data=coreSource.ownedPlainData(options);return coreSource.withOwnedOrderedScalarHelperSourceOperation(()=>withOwnedNativeProjectOperation(()=>translate(parseReverseConcreteSource(text),data)));
}
export function readOwnedOrderedScalarHelperMeta20261104(text,variant){
 return coreSource.withOwnedOrderedScalarHelperSourceOperation(()=>withOwnedNativeProjectOperation(()=>lane(variant)[2].readOwnedOrderedScalarHelperDocument20261104(text)));
}
