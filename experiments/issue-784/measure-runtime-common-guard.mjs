import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import * as guards from '../../tools/translation/original-json-intrinsics.mjs';
const before=()=>guards.originalPrivateParserIngressUnchanged()&&guards.originalNamespaceTraversalIntrinsicsUnchanged()&&guards.originalDataFreezeIntrinsicsUnchanged()&&guards.originalStaticSourceIntrinsicsUnchanged();
const candidate=()=>guards.originalPrivateParserCommonIntrinsicsUnchanged();
const rows=[];
for(const [label,run]of [['candidate',candidate],['before',before],['before',before],['candidate',candidate]]){
 const start=performance.now();for(let at=0;at<1000;at++)assert.equal(run(),true);
 rows.push({label,iterations:1000,milliseconds:performance.now()-start});
}
console.log(JSON.stringify({rows,diagnosticOnly:true,retainedVerdicts:false,originalDeadlinesQualified:false}));
