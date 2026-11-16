// Public API routing only; all source, ownership and semantic checking remains
// in the original fresh issuing implementations. A stored plan grants no access.
export {planUnitSynchronization as planSourceUnitSynchronization,applyUnitSynchronization as applySourceUnitSynchronization} from './synchronize-units.mjs';
export {planUnitSynchronization as planOwnedProjectUnitSynchronization,applyUnitSynchronization as applyOwnedProjectUnitSynchronization} from './synchronize-owned-project-units.mjs';
export {proposeForwardStringSynchronization} from './forward-string-synchronization.mjs';
export {planForwardStringUnitSynchronization,applyForwardStringUnitSynchronization} from './forward-string-unit-synchronization.mjs';
export {proposeBulkForwardStringSynchronization} from './bulk-forward-string-synchronization.mjs';
export {planBulkForwardStringUnitSynchronization,applyBulkForwardStringUnitSynchronization} from './bulk-forward-string-unit-synchronization.mjs';
export {proposeForwardLiteralSynchronization} from './forward-literal-synchronization.mjs';
export {planForwardLiteralUnitSynchronization,applyForwardLiteralUnitSynchronization} from './forward-literal-unit-synchronization.mjs';
export {proposeForwardExpressionSynchronization} from './forward-literal-synchronization.mjs';
export {proposeForwardReturnExpressionSynchronization} from './forward-return-expression-synchronization.mjs';
export {planForwardReturnExpressionUnitSynchronization,applyForwardReturnExpressionUnitSynchronization} from './forward-return-expression-unit-synchronization.mjs';
export {planForwardProjectUnitSynchronization,applyForwardProjectUnitSynchronization} from './forward-project-unit-synchronization.mjs';
export {proposeForwardScalarBodySynchronization} from './forward-scalar-body-synchronization.mjs';
export {proposeForwardControlBodySynchronization} from './forward-control-body-synchronization.mjs';
export {proposeForwardImperativeBodySynchronization} from './forward-imperative-body-synchronization.mjs';
export {proposeForwardRangeBodySynchronization} from './forward-range-body-synchronization.mjs';
export {proposeForwardFloatingBodySynchronization} from './forward-floating-body-synchronization.mjs';
export {proposeForwardStandardFloatingBodySynchronization} from './forward-standard-floating-body-synchronization.mjs';
export {proposeForwardStandardNumericBodySynchronization} from './forward-standard-numeric-body-synchronization.mjs';
export {proposeForwardTextPredicateSynchronization} from './forward-text-predicate-synchronization.mjs';
export {proposeForwardCompositeSynchronization} from './forward-composite-synchronization.mjs';
export {createOwnedCancellationContext,ownedCancellationRuntimeSources,translateOwnedCancellationJavaScript,translateOwnedCancellationTypeScript,translateOwnedCancellationConcreteSyntaxMeta,emitOwnedCancellationRust,prepareOwnedCancellationRuntime,evaluateOwnedCancellation,evaluateOwnedCancellationBatch,readOwnedCancellationMeta} from './js-to-rust/owned-cancellation.mjs';
export {translateOwnedCancellationRust} from './js-to-rust/owned-cancellation-rust.mjs';
export {OWNED_CANCELLATION_NATIVE_INPUTS,ownedCancellationUnitRuntimeSources,ownedCancellationUnitContext,translateOwnedCancellationUnit} from './owned-cancellation-unit.mjs';
export {translateLocalDeclarativeProject} from './local-declarative-project.mjs';
export {translateAsyncControlCallerJavaScript,translateAsyncControlCallerTypeScript,translateAsyncControlCallerConcreteSyntaxMeta,readAsyncControlCallerMeta} from './js-to-rust/async-control-callers.mjs';
export {translateAsyncControlCallerRust} from './js-to-rust/async-control-rust.mjs';
export {ASYNC_CONTROL_NATIVE_INPUTS,asyncControlUnitRuntimeSources,asyncControlUnitContext,translateAsyncControlUnit} from './async-control-unit.mjs';
export {httpDeadlineRuntimeAssets,httpDeadlineRuntimeSources} from './http-deadline-runtime-sources.mjs';
export {HTTP_RESOURCE_NATIVE_INPUTS,httpResourceUnitRuntimeSources,httpResourceUnitContext,translateHttpResourceUnit} from './http-resource-unit.mjs';
export {translateHttpResourceCallerJavaScript,translateHttpResourceCallerTypeScript,translateHttpResourceCallerConcreteSyntaxMeta,readHttpResourceCallerMeta} from './js-to-rust/http-resource-callers.mjs';
export {translateHttpResourceCallerRust} from './js-to-rust/http-resource-rust.mjs';
export {httpDeadlineResultRuntimeAssets,httpDeadlineResultRuntimeSources} from './http-deadline-result-runtime-sources.mjs';

export {translateHttpResourceShadowCallerRust} from './js-to-rust/http-resource-shadow-rust.mjs';

export {proposeSourceBackedCoreAdoptionSequence as proposeSourceBoundCoreAdoptionSequence,reviewSourceBackedCoreAdoptionSequence as reviewSourceBoundCoreAdoptionSequence} from './source-bound-core-adoption-sequence.mjs';
export {proposePhysicalCoreAdoptionSequence as proposeSourceBoundPhysicalCoreAdoptionSequence,reviewPhysicalCoreAdoptionSequence as reviewSourceBoundPhysicalCoreAdoptionSequence} from './source-bound-physical-core-adoption-sequence.mjs';

export {SOURCE_BOUND_OWNED_CORE_STAGES,proposeSourceBoundOwnedCoreStage,proposeSourceBoundOwnedCoreStages} from './source-bound-owned-core-bulk.mjs';

export {proposeSourceBoundOwnedCorePackets} from './propose-core-adoption-corpus.mjs';

export {reviewSourceBoundOwnedCorePackets} from './source-bound-owned-packet-readback.mjs';

export {planSourceBoundOwnedCorePacketAdoption,applySourceBoundOwnedCorePacketAdoption} from './source-bound-owned-packet-adoption.mjs';

export {proposeTrackedLocalDeclarativeSources} from './tracked-local-declarative-source.mjs';
export {translateTrackedLocalDeclarativeProject} from './tracked-local-declarative-project.mjs';

export {proposeModuleMacroUseTrackedLocalDeclarativeSources} from './tracked-local-declarative-source.mjs';
export {translateModuleMacroUseTrackedLocalDeclarativeProject} from './module-macro-use-tracked-local-declarative-project.mjs';

export {proposeConfiguredTrackedTextualSources} from './tracked-local-declarative-source.mjs';
export {translateConfiguredTrackedLocalDeclarativeProject} from './configured-tracked-local-declarative-project.mjs';

export {proposeInnerLintModuleMacroUseTrackedLocalDeclarativeSources,proposeInnerLintConfiguredTrackedTextualSources} from './tracked-local-declarative-source.mjs';
export {translateInnerLintConfiguredTrackedLocalDeclarativeProject} from './inner-lint-configured-tracked-local-declarative-project.mjs';

export {createOriginalLiteralDocumentationSourceScope} from './registered-builtin-caller-attribute-source.mjs';

export {proposeLiteralDocInnerLintModuleMacroUseTrackedLocalDeclarativeSources,proposeLiteralDocInnerLintConfiguredTrackedTextualSources} from './tracked-local-declarative-source.mjs';
export {translateLiteralDocInnerLintConfiguredTrackedLocalDeclarativeProject} from './literal-doc-inner-lint-configured-tracked-local-declarative-project.mjs';

export {proposeLineDocumentationTrackedTextualSources} from './tracked-local-declarative-source.mjs';
export {translateLineDocConfiguredTrackedLocalDeclarativeProject} from './line-doc-configured-tracked-local-declarative-project.mjs';

export {createOriginalCommentDocumentationSourceScope} from './registered-builtin-caller-attribute-source.mjs';
export {proposeCommentDocumentationTrackedTextualSources} from './tracked-local-declarative-source.mjs';
export {translateCommentDocConfiguredTrackedLocalDeclarativeProject} from './comment-doc-configured-tracked-local-declarative-project.mjs';

export {proposeActiveConditionalTrackedTextualSources} from './tracked-local-declarative-source.mjs';
export {translateActiveConditionalCommentDocTrackedLocalDeclarativeProject} from './active-conditional-comment-doc-tracked-local-declarative-project.mjs';

export {proposeGeneratedConditionalSource} from './generated-conditional-source.mjs';
export {proposeConfiguredGeneratedTrackedLocalDeclarativeSources} from './tracked-local-declarative-source.mjs';
export {translateConfiguredGeneratedTrackedLocalDeclarativeProject} from './configured-generated-tracked-local-declarative-project.mjs';

export {withOriginalConditionalSourceOperation} from './conditional-source-operation.mjs';

export {createOriginalCommonBuiltinCallerAttributeScope,withOriginalCommonBuiltinCallerSources} from './registered-builtin-caller-attribute-source.mjs';
export {proposeCommonBuiltinActiveConditionalSources,proposeCommonBuiltinCommentTrackedSources,proposeCommonBuiltinConfiguredTrackedSources,proposeCommonBuiltinGeneratedTrackedLocalDeclarativeSources} from './common-builtin-tracked-source.mjs';
export {translateCommonBuiltinTrackedLocalDeclarativeProject} from './common-builtin-tracked-local-declarative-project.mjs';

export {proposeOriginalArchitectureTypeMacroSources} from './architecture-type-macro-sources.mjs';

export {createOriginalStructuredDocumentationSourceScope,withOriginalStructuredDocumentationSourceScope} from './registered-builtin-caller-attribute-source.mjs';
export {proposeStructuredDocumentationActiveConditionalSources,proposeStructuredDocumentationCommentTrackedSources,proposeStructuredDocumentationConfiguredTrackedSources,proposeStructuredDocumentationGeneratedTrackedLocalDeclarativeSources} from './structured-documentation-tracked-source.mjs';
export {translateStructuredDocumentationTrackedLocalDeclarativeProject} from './structured-documentation-tracked-local-declarative-project.mjs';

export {originalNamespaceFunctionInvocationPositions} from './original-namespace-parser.mjs';

export {withOriginalNamespaceParserSourceOperation} from './namespace-parser-source.mjs';

export {proposeOriginalArchitectureTypeOutputSources} from './architecture-type-output-sources.mjs';

export {captureOriginalTextualMacroLookupSource,originalTextualMacroLookupSourceFacts} from './textual-macro-lookup-source.mjs';

export {proposeOriginalX86TypeMacroLookupSources} from './architecture-x86-lookup-sources.mjs';

export {translateArchitectureMetadataTrackedLocalDeclarativeProject} from './architecture-metadata-tracked-local-declarative-project.mjs';

export {captureOriginalNamespaceAttributeExpression,originalNamespaceAttributeExpressionFacts,originalNamespaceAttributeExpressionSourceGuard} from './original-namespace-parser.mjs';

export {documentationArgumentMayExportMacros,captureOriginalDocExpressionSourceEffects} from './original-doc-expression-effects.mjs';

export {captureOriginalAttributeExpressionConfinementSource,originalAttributeExpressionConfinementSourceFacts,captureOriginalAttributeExpressionConfinementFrame} from './attribute-expression-confinement-source.mjs';

export {translateExpressionDocumentationTrackedLocalDeclarativeProject} from './expression-documentation-tracked-local-declarative-project.mjs';
export {captureOriginalNamespaceDocumentationExpression} from './original-namespace-parser.mjs';

export {proposeOriginalX86MetadataTypeMacroSources} from './architecture-x86-metadata-sources.mjs';

export {originalNamespaceAttributeExpressionInvocationPositions,originalNamespaceAttributeExpressionPositionFacts,captureOriginalNamespaceAttributeInvocationInput,originalNamespaceAttributeInvocationInputFacts,captureOriginalNamespaceAttributeInvocationExpression,originalNamespaceAttributeInvocationExpressionFacts} from './original-namespace-parser.mjs';

export {proposeOriginalAttributeConcatLiteralSource} from './derive-clap-concat.mjs';

export {originalFreshPrimitiveNamespaceSourcesWithDocumentation} from './extensions/primitive-namespace-sources.mjs';

export {captureOriginalIncludeStrNativeSource,originalIncludeStrNativeSourceFacts,captureOriginalIncludeStrNativeFrame} from './include-str-native-source.mjs';

export {proposeOriginalArchitectureDocIncludeSource} from './derive-clap-concat.mjs';

export {captureOriginalMacroFileTokenContext,originalMacroFileTokenContextFacts} from './original-file-context-source.mjs';

export {proposeOriginalArchitectureDocIncludeWithFileTokenSource} from './derive-clap-concat.mjs';

export {captureOriginalNamespaceAttributeHeader,originalNamespaceAttributeHeaderFacts} from './original-namespace-parser.mjs';

export {withOriginalNamespaceAttributeHeaderSourceOperation} from './original-namespace-parser.mjs';

export {createOriginalParsedBuiltinCallerAttributeScope,withOriginalParsedBuiltinCallerSources,originalParsedBuiltinCallerAttributeFacts} from './registered-builtin-caller-attribute-source.mjs';
export {translateParsedBuiltinHeaderTrackedLocalDeclarativeProject} from './parsed-builtin-header-tracked-local-declarative-project.mjs';

export {createOriginalParsedModuleMacroUseCallerScope,createOriginalParsedInnerLintCallerScope,createOriginalParsedDocumentationCallerScope,originalParsedMetadataBuiltinCallerFacts} from './registered-builtin-caller-attribute-source.mjs';

export {originalNamespaceFunctionNestedAttributeSelectors,captureOriginalNamespaceFunctionNestedAttributeHeader,originalNamespaceFunctionNestedAttributeHeaderFacts} from './original-namespace-parser.mjs';

export {captureOriginalNamespaceDataItem,originalNamespaceDataItemFacts,originalNamespaceDataAttributeSelectors,captureOriginalNamespaceDataAttributeHeader,originalNamespaceDataAttributeHeaderFacts} from './original-namespace-parser.mjs';

export {originalNormalUngatedBuiltinAttributeRegistrations} from './derive-ancestor-attribute-scope.mjs';
export {originalNormalUngatedBuiltinLookupSources} from './registered-builtin-caller-attribute-source.mjs';

export {captureOriginalNormalUngatedItemBuiltinCaller,captureOriginalNormalUngatedFunctionNestedBuiltinCaller,captureOriginalNormalUngatedDataBuiltinCaller,originalNormalUngatedParsedBuiltinCallerFacts} from './registered-builtin-caller-attribute-source.mjs';

export {captureOriginalNamespaceHeaderExpression,originalNamespaceHeaderExpressionFacts,originalNamespaceHeaderExpressionInvocationPositions,originalNamespaceHeaderExpressionPositionFacts,captureOriginalNamespaceHeaderInvocationInput,originalNamespaceHeaderInvocationInputFacts,captureOriginalNamespaceHeaderInvocationExpression,originalNamespaceHeaderInvocationExpressionFacts} from './original-namespace-parser.mjs';

export {proposeOriginalHeaderConcatLiteralSource,proposeOriginalArchitectureHeaderDocIncludeSource,proposeOriginalArchitectureHeaderDocIncludeWithFileTokenSource} from './derive-clap-concat.mjs';

export {captureOriginalExpressionBlockScopeSource,originalExpressionBlockScopeSourceFacts,captureOriginalExpressionBlockScopeFrame,assertOriginalExpressionBlockScopeInputsCurrent} from './expression-block-scope-source.mjs';
export {proposeOriginalHeaderExpressionBlockScopes} from './expression-block-scope-model.mjs';

export {expandCanonicalJsonClone} from './canonical-json-clone-normalization.mjs';

export {captureOriginalBlockLocalItemSource,originalBlockLocalItemSourceFacts,captureOriginalBlockLocalItemFrame,assertOriginalBlockLocalItemInputsCurrent} from './block-local-item-source.mjs';

export {expandCanonicalJsonReaderDefault} from './canonical-json-reader-default-normalization.mjs';

// Explicit source-proposal DATA APIs; none installs or admits application code.
export {proposeCoreJsonReadersCorpus,iterateCoreJsonReadersCorpusPackets} from './migrate-core-json-readers.mjs';
export {expandCanonicalJsonOptionTerminal,expandCanonicalJsonReaderClosure,expandCanonicalJsonOptionPredicate,expandCanonicalJsonOptionFilter} from './canonical-json-option-terminal-normalization.mjs';
export {JSON_VALUE_PREDICATES,canonicalJsonPredicateMember} from './json-value-predicates.mjs';

export {primitiveOperatorRuntimeSources} from './primitive-operator-runtime-sources.mjs';
export {sourceUnitPrimitiveOperators} from './primitive-source-unit-options.mjs';

export {OWNED_PROJECT_NATIVE_INPUTS,ownedProjectUnitRuntimeSources,translateOwnedProjectUnit} from './owned-project-unit.mjs';
