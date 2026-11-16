// Shows the workflow audit used by the native profile CI gate accepts the merged
// workflows and still refuses a workflow whose Rust job loses its admission guard.
import {auditManualDevelopment,readWorkflowSources} from '../../scripts/check-manual-development-workflows.mjs';
const sources=readWorkflowSources('.github/workflows');
console.log('current errors:',auditManualDevelopment(sources).length);
const name=Object.keys(sources).find(n=>n==='release.yml');
const mutated={...sources,[name]:sources[name].replace("    if: needs.javascript.outputs.rust_allowed == 'true' && (needs.javascript.result == 'success')","    if: needs.javascript.result == 'success'")};
console.log('mutated changed:',mutated[name]!==sources[name],'errors:',auditManualDevelopment(mutated).slice(0,2));
