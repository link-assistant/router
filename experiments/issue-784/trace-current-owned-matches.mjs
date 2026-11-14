// Finite allocation diagnostic using the original complete public producer calls.
// This is not a receiving test, performance qualification or executable proof.
import {prepareCurrentCoreMatchesSources} from '../../tools/translation/prepare-core-matches-sources.mjs';
import {composePrimitiveIdentityBoundary} from '../../tools/translation/prepare-primitive-identity-boundary.mjs';
import {composeCoreAscii} from '../../tools/translation/prepare-core-ascii-sources.mjs';
import {composeCoreAsciiReverse} from '../../tools/translation/prepare-core-ascii-reverse-sources.mjs';
import {composeCoreAsciiAssets} from '../../tools/translation/prepare-current-core-ascii-assets.mjs';
import {composeCoreAsciiBaseAssets} from '../../tools/translation/prepare-current-core-ascii-base-assets.mjs';
import {composeCurrentCoreUnitMatches} from '../../tools/translation/prepare-current-core-unit-unicode.mjs';
import {composeOwnedCorePrivateAnalysisRetention} from '../../tools/translation/prepare-owned-core-private-analysis-retention.mjs';
import {composeOwnedRuntimeImportEdges} from '../../tools/translation/prepare-owned-runtime-import-current.mjs';

let prior;
function step(name, operation) {
  console.log(JSON.stringify({stage:name,event:'start',elapsedMs:performance.now(),memory:process.memoryUsage()}));
  const result=operation();
  console.log(JSON.stringify({stage:name,event:'end',elapsedMs:performance.now(),memory:process.memoryUsage()}));
  return result;
}
const birth=step('birth',()=>prepareCurrentCoreMatchesSources());
prior=Object.fromEntries(birth.files.map(row=>[row.path,row]));
const layers=[birth];
for(const [name,compose]of [
  ['primitive-identity',composePrimitiveIdentityBoundary],
  ['ascii',composeCoreAscii],
  ['ascii-reverse',composeCoreAsciiReverse],
  ['ascii-assets',composeCoreAsciiAssets],
  ['ascii-base-assets',composeCoreAsciiBaseAssets],
  ['unit-and-unicode',composeCurrentCoreUnitMatches],
  ['private-analysis-retention',composeOwnedCorePrivateAnalysisRetention],
  ['runtime-import',composeOwnedRuntimeImportEdges],
]){
  const result=step(name,()=>compose(prior));
  layers.push(...result.layers);prior=result.sources;
}
console.log(JSON.stringify({diagnosticOnly:true,wholeLayers:layers.length,files:Object.keys(prior).length,
  runtimeParity:false,receivingPassed:false}));
