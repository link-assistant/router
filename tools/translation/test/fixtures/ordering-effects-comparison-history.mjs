// Complete historical receiving DATA; no semantic or executable permission.
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {ownershipCompiler} from '../../js-to-rust/vendor/module-syntax.mjs';
import {deriveStructOrderingSourceHistory} from '../../struct-ordering-source-history.mjs';
import {transportConcreteSourcePhases} from '../../concrete-phased-equations.mjs';

const path='tools/translation/test/derive-output-effects.test.mjs';
const url=new URL('../../../../'+path,import.meta.url);
export function orderingEffectsComparisonHistory(){
 const current=readFileSync(url,'utf8');
 const history=deriveStructOrderingSourceHistory(ownershipCompiler(),{path,source:current});
 const [equation]=transportConcreteSourcePhases([{before:history.before,
  middle:history.before,after:current,language:'JavaScript'}]);
 if(equation.inverse!==history.before||readFileSync(url,'utf8')!==current)
  throw TypeError('Ordering effects comparison: complete source changed');
 return {path,current,historical:history.before,history,equation,
  sourceAuthority:false,runtimeAuthority:false,productionExecutableGain:0};
}

// Keep the original physical read and all its errors before viewing this one
// exact predecessor. Buffer reads and unrelated paths retain native behavior.
export function readOrderingEffectsComparisonSource(...args){
 const source=readFileSync(...args),target=args[0];
 if(typeof source!=='string'||!(target===fileURLToPath(url)||
    target instanceof URL&&target.href===url.href))return source;
 const row=orderingEffectsComparisonHistory();
 if(source!==row.current)throw TypeError('Ordering effects comparison: physical source changed');
 return row.historical;
}
