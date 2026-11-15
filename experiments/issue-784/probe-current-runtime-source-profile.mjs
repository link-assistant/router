// Complete current producer, with every original source/CST/binding check.
import {prepareOwnedRuntimeImportEdges} from '../../tools/translation/prepare-owned-runtime-import-current.mjs';
const start=performance.now(),plan=prepareOwnedRuntimeImportEdges();
console.log(JSON.stringify({schema:'complete-runtime-source-producer-profile-v1',
 milliseconds:performance.now()-start,files:plan.files.map(row=>({path:row.path,beforeSha256:row.beforeSha256,afterSha256:row.afterSha256})),
 fullNativeParserRunsEveryTime:plan.fullNativeParserRunsEveryTime,
 originalTestsAndDeadlinesUnchanged:plan.originalTestsAndDeadlinesUnchanged,
 semanticAuthority:plan.semanticAuthority,performanceQualified:plan.performanceQualified,runtimeParity:false}));
