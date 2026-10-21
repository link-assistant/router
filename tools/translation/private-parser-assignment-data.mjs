// Explicit candidate entrypoint only. The original executor stays unchanged;
// its complete API is also retained by the separately generated candidate.
export * from './private-parser-assignment-data-candidate.mjs';
export {lexAssignmentPrivateConcreteSource as lexPrivateConcreteSource,
 originalAssignmentPrivateParserSourceInputs as originalPrivateParserSourceInputs,
 lexAssignmentPrivateConcreteSources as lexPrivateConcreteSources} from './private-parser-assignment-data-candidate.mjs';
