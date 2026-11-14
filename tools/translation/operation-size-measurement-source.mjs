// Source DATA only. Measurements never authorize a source or owner join.
import {ownershipCompiler} from './js-to-rust/vendor/module-syntax.mjs';
import {transportConcreteNamedSourcePhases} from './concrete-sequential-phases.mjs';

const fail=message=>{throw new TypeError('Operation size measurement source: '+message);};
const RULES=[
 {id:'javascript:operation-local-positive-size-records',
  before:' function createPrivateFrozenJsonComposer(){\n',
  after:'// Positive scalar sizes only, weakly keyed inside this one operation.\n'
   +'// Fresh whole-graph eligibility and every logical debit remain mandatory.\n'
   +'let sharedMeasurements=qualified?new weakConstructor():null,sharedMeasurementRecords=0;\n'
   +' function createPrivateFrozenJsonComposer(){\n'},
 {id:'javascript:retain-fresh-per-call-measurement-budgets',
  before:'  const sharedMeasurements=new weakConstructor();let sharedMeasurementRecords=0,measurementDeepest=0;',
  after:'  let measurementDeepest=0;'},
 {id:'javascript:retire-size-records-before-original-callbacks',
  before:' function operationClearBytes(){\n  if(!qualified||storage===null)return;\n',
  after:' function operationClearBytes(){\n  if(!qualified||storage===null)return;\n'
   +'  sharedMeasurements=new weakConstructor();sharedMeasurementRecords=0;\n'},
];
function replace(source,before,after){
 const at=source.indexOf(before);
 if(at<0||source.indexOf(before,at+1)>=0)fail('one exact complete source selection required');
 return source.slice(0,at)+after+source.slice(at+before.length);
}
function native(path,source){
 const ts=ownershipCompiler();if(ts.version!=='5.9.3')fail('installed TypeScript5.9.3 required');
 const file=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
 if(file.parseDiagnostics.length)fail('complete native grammar differs');
 const frames=file.statements.filter(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='createOperationByteFrame');
 if(frames.length!==1)fail('one complete lexical operation frame required');
 return ts;
}
export function deriveOperationSizeMeasurementSource(source,path){
 native(path,source);let after=source;
 for(const row of RULES)after=replace(after,row.before,row.after);
 native(path,after);let inverse=after;
 for(const row of [...RULES].reverse())inverse=replace(inverse,row.after,row.before);
 if(inverse!==source)fail('complete ordered source inverse differs');
 const [equation]=transportConcreteNamedSourcePhases([{before:source,middle:after,after,language:'JavaScript',rules:[
  'javascript:operation-local-positive-scalar-size-measurements','router:retain-complete-operation-imports',
  'javascript:restore-complete-call-local-size-measurements','router:restore-complete-operation-imports']}]);
 if(equation.before!==source||equation.middle!==after||equation.after!==after||equation.inverse!==source)
  fail('complete serialized/reparsed CST source equation differs');
 return {path,before:source,after,inverse,languageRules:RULES.map(row=>({...row})),repositoryRules:[],equation,
  maximumRecords:1024,minimumCells:64,weakScalarRecordsOnly:true,
  originalLogicalBudgetsUnchanged:true,newAcrossOperationCache:false,
  sourceAuthority:false,runtimeAuthority:false,performanceQualified:false};
}
export function restoreOperationSizeMeasurementSource(source,path){
 let before=source;
 for(const row of [...RULES].reverse())before=replace(before,row.after,row.before);
 const history=deriveOperationSizeMeasurementSource(before,path);
 if(history.after!==source)fail('complete current operation successor differs');
 return history;
}
