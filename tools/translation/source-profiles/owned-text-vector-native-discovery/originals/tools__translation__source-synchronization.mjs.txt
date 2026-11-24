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

export {SOURCE_BOUND_CORE_FIXED_POINT_LIMITS,proposeSourceBoundOwnedCoreFixedPointStages,collectSourceBoundOwnedCoreFixedPoint} from './source-bound-owned-core-fixed-point.mjs';

export {proposeSourceBoundCoreFixedPointPackets} from './propose-core-adoption-corpus.mjs';
export {reviewSourceBoundCoreFixedPointPackets} from './source-bound-fixed-point-packet-readback.mjs';
export {planSourceBoundCoreFixedPointPacketAdoption,applySourceBoundCoreFixedPointPacketAdoption} from './source-bound-fixed-point-packet-adoption.mjs';

export {proposeForwardOwnedFormatBodySynchronization} from './forward-owned-format-body-synchronization.mjs';

export {proposeForwardOwnedCompositeSynchronization} from './forward-owned-composite-synchronization.mjs';

export {originalNamespaceAttributeHeaderSites} from './original-namespace-parser.mjs';
export {captureGeneratedItemHeaderSources,proposeGeneratedDeclarationSourceUnit} from './generated-item-header-source.mjs';

export {withSharedOriginalParsedBuiltinCallerSources} from './registered-builtin-caller-attribute-source.mjs';

export {captureGeneratedHeaderExpressionSources} from './generated-header-expression-source.mjs';

export {readTextBuilderBorrowedOperandSource} from './text-builder-operand-source.mjs';

export {proposeTextBuilderBorrowedOperandSource} from './text-builder-operand-source.mjs';

export {forwardConditionalSourceStatements,forwardConditionalComparisonSource} from './forward-conditional-source.mjs';

export {readClosedMatchArmSourceBounds} from './match-arm-source.mjs';

export {readReturnSourceOperandBounds} from './return-operand-source.mjs';

export {isTextTargetSourceContext,readTextTargetSourceContext,readCarrierTextConstructorTargetSource} from './carrier-text-target-source.mjs';

export {readTextBuilderAppendStatementSource} from './text-builder-append-statement-source.mjs';

export {collectClosedMatchPatternSource} from './match-arm-source.mjs';

export {FIXED_TYPE_CORE_NATIVE_SOURCE,FIXED_TYPE_CORE_ALIASES,readFixedTypeCoreSourceRole} from './fixed-type-core-source.mjs';

export {proposeCoreFixedTypesCorpus} from './migrate-core-fixed-types.mjs';

export {proposeOwnedVectorModuleReinput} from './js-to-rust/owned-vector-module-reinput.mjs';

export {proposeOwnedVectorNativeSynchronization} from './js-to-rust/owned-vector-native-synchronization.mjs';

export {prepareOwnedVectorJavaScriptPair} from './js-to-rust/owned-vector-javascript-pair.mjs';

export {planOwnedVectorUnitSynchronization,applyOwnedVectorUnitSynchronization} from './owned-vector-unit-synchronization.mjs';

export {proposeOwnedNativeBulkDiscovery} from './js-to-rust/owned-native-bulk-discovery.mjs';

export {proposeOwnedNativeBulkSynchronization} from './js-to-rust/owned-native-bulk-composition.mjs';
export {planOwnedNativeBulkUnitSynchronization,applyOwnedNativeBulkUnitSynchronization} from './owned-native-bulk-unit-synchronization.mjs';

export {proposeOwnedVectorBulkModuleSynchronization} from './js-to-rust/owned-vector-bulk-module-synchronization.mjs';

export {planOwnedVectorBulkUnitSynchronization,applyOwnedVectorBulkUnitSynchronization} from './owned-vector-bulk-unit-synchronization.mjs';

export {proposeOwnedNativeBulkModuleRefresh} from './js-to-rust/owned-native-bulk-module-refresh.mjs';

export {ownedBulkRuntimeSources} from './js-to-rust/owned-vector-candidate-source.mjs';

export {proposeOwnedPrimitiveVectorFunctionInsertion} from './js-to-rust/owned-primitive-vector-function-insertion.mjs';

export {proposeOwnedPrimitiveVectorFunctionExtension,proposeOwnedPrimitiveVectorFunctionRemoval,proposeOwnedPrimitiveVectorFunctionReconciliation,prepareOwnedPrimitiveVectorExistingHelperSource} from './js-to-rust/owned-primitive-vector-definition-lifecycle.mjs';
export {proposeOwnedPrimitiveVectorUnitAdoption} from './js-to-rust/owned-primitive-vector-unit-adoption.mjs';

export {emitOwnedPrimitiveValueDefinitionHeaders} from './js-to-rust/owned-vector-candidate-operations.mjs';

export {checkedPrimitiveScalarVectorLocals,originalPrimitiveScalarVectorLocalDomain} from './js-to-rust/owned-primitive-scalar-vector-locals.mjs';

export {withFreshStandardCopyInputs} from './fresh-standard-copy-inputs.mjs';
export {withCurrentStandardCopySourceOperation,currentPrimitiveCopySource,currentSharedReferenceCopyIdentity} from './current-standard-copy-source.mjs';

export {observeNativeSourceCallControl} from './js-to-rust/owned-native-source-call-control.mjs';

export {proposeOwnedPrimitiveEffectFunctionInsertion} from './js-to-rust/owned-primitive-effect-function-insertion.mjs';
export {proposeOwnedPrimitiveEffectFunctionExtension,proposeOwnedPrimitiveEffectFunctionRemoval,proposeOwnedPrimitiveEffectFunctionReconciliation,prepareOwnedPrimitiveEffectExistingHelperSource} from './js-to-rust/owned-primitive-effect-definition-lifecycle.mjs';
export {proposeOwnedPrimitiveEffectUnitAdoption} from './js-to-rust/owned-primitive-effect-unit-adoption.mjs';
export {receivingPrimitiveValueDefinitionFamily} from './js-to-rust/owned-unit-definition-routing.mjs';

export {parseOriginalEmptyWrittenAttribute,captureOriginalEmptyWrittenAttribute,originalEmptyWrittenAttributeFacts,originalEmptyWrittenAttributeProgramSources} from './empty-written-attribute-grammar.mjs';
export {captureReparsedEmptyAttributeHeaderSources} from './reparsed-item-header-grammar.mjs';
export {proposeOriginalX86ReparsedAttributeGrammarSources} from './architecture-reparsed-attribute-grammar.mjs';

export {proposeOwnedWideSliceInputBoundaries} from './js-to-rust/owned-wide-slice-input-proposals.mjs';

export {parseOriginalWrittenAttribute,captureOriginalWrittenAttribute,originalWrittenAttributeFacts,originalWrittenAttributeProgramSources} from './written-attribute-grammar.mjs';
export {captureReparsedDelimitedAttributeHeaderSources} from './reparsed-delimited-item-header-grammar.mjs';
export {proposeOriginalX86WrittenAttributeGrammarSources} from './architecture-written-attribute-grammar.mjs';

export {PRIMITIVE_SEQUENCE_CONTRACTS,PRIMITIVE_SEQUENCE_RULE_SEQUENCES,primitiveSequenceContract} from './primitive-sequence-contracts.mjs';

export {proposePrimitiveSequenceRootSource} from './primitive-sequence-root-source.mjs';
export {observePrimitiveSequenceCoreSources} from './primitive-sequence-source-bindings.mjs';

export {withOriginalPrimitiveSequenceSourceOperation,observeCurrentPrimitiveSequenceCoreSources,requireCurrentPrimitiveSequenceOperationSource} from './current-primitive-sequence-source.mjs';

export {primitiveSequenceRuntimeSources} from './primitive-sequence-runtime-sources.mjs';

export {proposeOwnedPrimitiveSliceEmptyCalls} from './js-to-rust/owned-primitive-slice-empty-proposals.mjs';

export {proposeOwnedPrimitiveSlicePresenceCalls} from './js-to-rust/owned-primitive-slice-presence-proposals.mjs';

export {PRIMITIVE_OWNED_VECTOR_CONTRACTS,PRIMITIVE_OWNED_VECTOR_RULE_SEQUENCES} from './primitive-owned-vector-contracts.mjs';

export {proposePrimitiveOwnedVectorRootSource} from './primitive-owned-vector-root-source.mjs';

export {observeCurrentPrimitiveOwnedVectorCoreSources,requireCurrentPrimitiveOwnedVectorOperationSource,withOriginalPrimitiveOwnedVectorSourceOperation} from './current-primitive-owned-vector-source.mjs';

export {primitiveOwnedVectorRuntimeSources} from './primitive-owned-vector-runtime-sources.mjs';

export {proposeOwnedPrimitiveVectorCalls} from './js-to-rust/owned-primitive-vector-proposals.mjs';

export {proposeOwnedPrimitiveVectorLiteralCalls} from './js-to-rust/owned-primitive-vector-literal-proposals.mjs';

export {primitiveVectorLiteralRuntimeSources} from './primitive-vector-literal-runtime-sources.mjs';
export {withOriginalPrimitiveVectorLiteralSourceOperation,requireCurrentPrimitiveVectorLiteralOperationSource,requireCurrentPrimitiveVectorLiteralOriginalOperationSource} from './current-primitive-vector-literal-source.mjs';

export {proposePrimitiveVectorLiteralCalls} from './js-to-rust/primitive-vector-literal-proposals.mjs';
export {composeConcreteSourceEditTemplates} from './concrete-source-edit-templates.mjs';

export {withOriginalPrimitiveSequenceSourceOperation as withFailureAwarePrimitiveSequenceSourceOperation,requireCurrentPrimitiveSequenceOperationSource as requireFailureAwarePrimitiveSequenceOperationSource} from './failure-aware-primitive-sequence-source.mjs';

export {withOriginalPrimitiveOwnedVectorSourceOperation as withFailureAwarePrimitiveOwnedVectorSourceOperation,requireCurrentPrimitiveOwnedVectorOperationSource as requireFailureAwarePrimitiveOwnedVectorOperationSource} from './failure-aware-primitive-owned-vector-source.mjs';

export {withOriginalPrimitiveVectorLiteralSourceOperation as withFailureAwarePrimitiveVectorLiteralSourceOperation,requireCurrentPrimitiveVectorLiteralOperationSource as requireFailureAwarePrimitiveVectorLiteralOperationSource} from './failure-aware-primitive-vector-literal-source.mjs';

export {proposeNativeJsonLiteralPathSearch,proposeNativeJsonLiteralPathSearches} from './native-json-literal-path-search-proposals.mjs';

export {proposeNativeJsonOptionalPathReader,proposeNativeJsonOptionalPathReaders} from './native-json-optional-path-reader-proposals.mjs';

export {proposeNativeJsonOptionalPathReaderDiscovery} from './native-json-optional-path-reader-discovery.mjs';

export {withNativeSubstitutionOperation as withFailureAwareNativeSubstitutionOperation,prepareNativeSubstitutionCopy as prepareFailureAwareNativeSubstitutionCopy} from './failure-aware-native-substitution-copy.mjs';
export {withMixedNativeSubstitutionOperation as withFailureAwareMixedNativeSubstitutionOperation,prepareMixedNativeSubstitutionCopy as prepareFailureAwareMixedNativeSubstitutionCopy} from './failure-aware-mixed-native-substitution-copy.mjs';

export {OWNED_TEXT_VECTOR_CONTRACTS,OWNED_TEXT_VECTOR_RULE_SEQUENCES} from './owned-text-vector-contracts.mjs';
export {withFreshOwnedTextVectorInputs} from './fresh-owned-text-vector-inputs.mjs';
export {ownedTextVectorRuntimeSources} from './owned-text-vector-runtime-sources.mjs';

export {withOriginalOwnedTextVectorSourceOperation,observeCurrentOwnedTextVectorCoreSources,requireCurrentOwnedTextVectorOperationSource,requireCurrentOwnedTextVectorOriginalOperationSource} from './current-owned-text-vector-source.mjs';
export {proposeOwnedTextVectorRootSource} from './owned-text-vector-root-source.mjs';

// Separate explicit private issuers; original cloning profiles remain unchanged.
export * as ownedTextVectorOutcome from './js-to-rust/owned-text-vector-outcome.mjs';
export * as ownedTextVectorCancellation from './js-to-rust/owned-text-vector-cancellation.mjs';
export {translateOwnedOutcomeRust as translateOwnedTextVectorOutcomeRust} from './js-to-rust/owned-text-vector-outcome-rust.mjs';
export {translateOwnedCancellationRust as translateOwnedTextVectorCancellationRust} from './js-to-rust/owned-text-vector-cancellation-rust.mjs';

export {parseForwardOwnedTextVector,checkForwardOwnedTextVector,emitForwardOwnedTextVector,ownedTextVectorForwardRuntimeAssets} from './owned-text-vector-forward-domain.mjs';
export {translateProjectOwnedTextVectors,translateProjectWithFlatEnclosingSemanticMetaOwnedTextVectors} from './owned-text-vector-project.mjs';

export {ownedTextVectorLiteralRuntimeSources} from './owned-text-vector-literal-runtime-sources.mjs';
export {withFreshOwnedTextVectorLiteralInputs} from './fresh-owned-text-vector-literal-inputs.mjs';
export {withOriginalOwnedTextVectorLiteralSourceOperation,requireCurrentOwnedTextVectorLiteralOperationSource,requireCurrentOwnedTextVectorLiteralOriginalOperationSource} from './current-owned-text-vector-literal-source.mjs';

export {proposeOwnedTextVectorCalls,proposeOwnedTextVectorSyntax} from './js-to-rust/owned-text-vector-proposals.mjs';
export {proposeOwnedTextVectorDiscovery} from './js-to-rust/owned-text-vector-discovery.mjs';
export {proposeOwnedTextVectorPairedCalls} from './js-to-rust/owned-text-vector-paired-proposals.mjs';

export {proposeNativeOwnedTextVector,proposeNativeOwnedTextVectors} from './native-owned-text-vector-proposals.mjs';
