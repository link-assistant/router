// Fresh complete receiving native source operation. No retained owner verdict.
import {types} from 'node:util';
import {resolveModuleGraph} from './project.mjs';
import {PRODUCTION_PROFILE} from './cfg-profile.mjs';
import {captureOriginalCargoEdition} from './cargo-edition-context.mjs';
import {loadDeriveDependencyProof} from './derive-dependencies.mjs';
import {HostRustParser} from './extensions/host-contracts.mjs';
import {tokenizeRust} from './extensions/lexical.mjs';
import {createMatchesMacroContext,configureMatchesMacroParser} from './matches-macro-context.mjs';
import {withBorrowedStandardMapNativeSourceABI,requireBorrowedStandardMapNativeSourceABI} from './borrowed-standard-map-20261103-native-abi.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta} from './concrete-syntax-meta.mjs';
import {withCompleteSourceClosingFence,requireSynchronousSourceCallback} from './complete-source-closing-fence.mjs';
import {withSourceInputValidation,withSourceFailureOperation} from './source-failure-operations.mjs';
import {createRulePipeline} from './rule-pipeline.mjs';
const each=Map.prototype.forEach,get=Map.prototype.get,apply=Reflect.apply;
const fail=message=>{throw TypeError('Reverse standard-map native source: '+message);};
/** Separate complete-tree domain; the original 512-file map API is unchanged. */
export function withBorrowedStandardMapReverseNativeSources(files,run){
 requireSynchronousSourceCallback(run);
 return withSourceFailureOperation(()=>{
  const retained=withSourceInputValidation(()=>{
   if(!files||types.isProxy(files))fail('genuine source Map required');const rows=[];let bytes=0;
   apply(each,files,[(source,path)=>{
    if(typeof path!=='string')fail('ordinary complete source path required');
    if(!path.endsWith('.rs')&&path!=='Cargo.toml'&&path!=='Cargo.lock')return;
    if(path.startsWith('/')||path.includes('\\')||path.split('/').some(part=>!part||part==='.'||part==='..')||typeof source!=='string'||rows.length>=4096||(bytes+=Buffer.byteLength(source))>16777216)fail('complete native source tree exceeds explicit domain');
    rows.push([path,source]);
   }]);
   for(const path of ['src/lib.rs','src/borrowed_standard_map_20261102.rs','Cargo.toml','Cargo.lock'])if(!rows.some(row=>row[0]===path))fail('complete actual root, kernel and Cargo inputs required');return rows;
  });
  const current=()=>withSourceInputValidation(()=>{
   let at=0;apply(each,files,[(source,path)=>{if(typeof path!=='string')fail('source path changed');if(!path.endsWith('.rs')&&path!=='Cargo.toml'&&path!=='Cargo.lock')return;const row=retained[at++];if(!row||path!==row[0]||source!==row[1])fail('complete original native source sequence changed');}]);if(at!==retained.length)fail('complete original native source census changed');
  });
  const source=path=>{current();const value=apply(get,files,[path]);if(typeof value!=='string')fail('actual complete source missing');return value;};
  return withCompleteSourceClosingFence(()=>createRulePipeline([
   {phase:'language',rules:[{id:'language:complete-receiving-native-tree-CST-and-original-namespace',apply:()=>withSourceInputValidation(()=>{
    for(const [path,text]of retained)if(path.endsWith('.rs')){const concrete=transportConcreteSyntaxSource(text,{language:'Rust'});if(concrete.source!==text||transportConcreteSyntaxMeta(concrete.meta).source!==text)fail('complete native source CST changed');}
    const graph=resolveModuleGraph({entry:'src/lib.rs',paths:retained.filter(([path])=>path.endsWith('.rs')).map(([path])=>path),readSource:source,compilationProfile:PRODUCTION_PROFILE});if(graph.diagnostics.length)fail('complete original module graph unresolved');
    const deriveDependencies=loadDeriveDependencyProof({manifest:source('Cargo.toml'),lock:source('Cargo.lock')}),cargoEditionContext=captureOriginalCargoEdition(source('Cargo.toml'));
    const context=createMatchesMacroContext({modules:graph.modules,deriveDependencies,cargoEditionContext,compilationProfile:PRODUCTION_PROFILE}),parser=new HostRustParser(tokenizeRust(source('src/lib.rs')));parser.compilationProfile=PRODUCTION_PROFILE;configureMatchesMacroParser(parser,context,{file:'src/lib.rs'});current();return parser;
   })}]},
   {phase:'repository',rules:[{id:'repository:actual-borrowed-standard-map-source-ABI-lifetime',apply:parser=>withBorrowedStandardMapNativeSourceABI(parser,receipt=>{
    requireBorrowedStandardMapNativeSourceABI(receipt,{parser});current();return withCompleteSourceClosingFence(()=>run(),[()=>requireBorrowedStandardMapNativeSourceABI(receipt,{parser}),current]);
   })}]},
  ]).run(null).value,[current,()=>{retained.length=0;}]);
 });
}
