// Complete fixture DATA only. This does not issue a caller or native proof.
import {primitiveOperatorRuntimeSources} from '../../primitive-operator-runtime-sources.mjs';
export function withCompletePrimitiveRuntimeSources(rows,runtimeRoot='runtime',declarationRoot=runtimeRoot){
 const sources=[...primitiveOperatorRuntimeSources(runtimeRoot,declarationRoot)];if(runtimeRoot!==declarationRoot)for(const row of [...sources])sources.push({path:(row.path.endsWith('.d.mts')?runtimeRoot:declarationRoot)+'/'+row.path.split('/').at(-1),source:row.source});const files=new Map();for(const row of [...rows,...sources]){if(files.has(row.path)&&files.get(row.path).source!==row.source)throw new TypeError('Conflicting complete primitive runtime fixture source');files.set(row.path,row);}return [...files.values()];
}
