// One fixed eight-file preparation, with no test or deadline qualification.
// Run with a bounded Node heap and --cpu-prof-interval=10000.
import {prepareCoreUnitMatches} from '../../tools/translation/prepare-core-unit-matches.mjs';
const started=performance.now();
const result=prepareCoreUnitMatches();
console.log(JSON.stringify({diagnosticOnly:true,producer:'prepareCoreUnitMatches',
  elapsedMs:performance.now()-started,completeFiles:result.files.length,
  typescriptVersion:result.typescriptVersion,memory:process.memoryUsage(),
  semanticAuthority:false,receivingPassed:false}));
