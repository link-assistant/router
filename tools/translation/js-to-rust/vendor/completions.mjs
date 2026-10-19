// Completion is control flow, not a value-domain narrowing or an Error proof.
// The ordinary checker must independently validate every return/throw value.
export function terminatesCompletion(body) {
  const last=body.at(-1);
  return last?.kind==='return'||last?.kind==='throw'
    ||last?.kind==='if'&&last.else!==null&&terminatesCompletion(last.then)&&terminatesCompletion(last.else);
}

export function containsThrow(body) {
  return body.some(statement=>statement.kind==='throw'
    ||statement.then&&containsThrow(statement.then)
    ||statement.else&&containsThrow(statement.else)
    ||statement.body&&containsThrow(statement.body));
}

// Keep the qualification separate from both public input domains and the
// existing callback/capture/call qualifications. It cannot issue authority.
export const SOURCE_CONSTRUCTOR_CONDITIONS=Object.freeze({
  schema:'conditional-original-error-construction-v1',
  unchangedSourceConstructorRequired:true,
  unchangedErrorIntrinsicRequired:true,
  unchangedArrayIncludesIntrinsicRequired:true,
  unchangedConstructorAndInheritedPrototypesRequired:true,
  originalConstructorLookupStabilityProved:false,
  outsideModulePrototypeClosureProved:false,
  originalSignatureFullDomainPreserved:false,
  rustErrorIdentityPreserved:false,
  hostDiagnosticLocationsPreserved:false,
  runtimeParity:false,
});
