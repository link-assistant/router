// Output annotation only. No marker/shape can issue source or lifetime authority.
const NAME='ml_LiteralArgumentsCoreStatic';
export function literalArgumentsCoreTypeScript(type,declarations,nativeScalarModule){
 if(type?.kind!=='data'||!(declarations instanceof Map))return null;const entry=declarations.get(type.name);
 if(entry?.k!=='data'||entry.generated!=='router-host-contract'||entry.hostTypePath?.length!==1||entry.hostTypePath[0]!==NAME||entry.ctors?.length!==1||entry.ctors[0].name!==NAME||entry.ctors[0].fields.length!==0)return null;
 if(nativeScalarModule!==null&&nativeScalarModule!==undefined&&typeof nativeScalarModule!=='string')throw new TypeError('Actual source-relative scalar runtime path required');
 const runtime=nativeScalarModule===null||nativeScalarModule===undefined?'./literal-arguments-core-20261101-runtime.mjs':nativeScalarModule.replace(/primitive-operator-runtime\.mjs$/u,'literal-arguments-core-20261101-runtime.mjs');
 if(typeof runtime!=='string'||!runtime.endsWith('literal-arguments-core-20261101-runtime.mjs'))throw new TypeError('Literal carrier requires its actual source-relative runtime module');
 return 'import('+JSON.stringify(runtime)+').LiteralArguments';
}
