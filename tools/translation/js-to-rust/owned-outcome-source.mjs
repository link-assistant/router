import {originalNamespaceTraversalIntrinsicsUnchanged,originalPrivateParserIngressUnchanged,originalDataFreezeIntrinsicsUnchanged,originalStaticSourceIntrinsicsUnchanged,originalCapturedFunctionSource} from '../original-json-intrinsics.mjs';
import {ownershipCompilerRuntimeNativeCurrent} from './vendor/module-syntax.mjs';
// A fresh, explicit receiving-source transaction. Public source data is input,
// never a callable permit. Private membership is reissued after meta decoding.
import {createHash} from 'node:crypto';
import {types} from 'node:util';
import {posix} from 'node:path';
import {ownershipCompiler} from './vendor/module-syntax.mjs';
import {jsonMacroDependencyProfile} from '../json-macro-inputs.mjs';
import {proveJsonMacroFeatures} from '../json-macro-features.mjs';
import {ownedOutcomeRuntimeAssets as hostRuntimeAssets} from '../owned-outcome-runtime-assets.mjs';
import {resolveModuleBindings} from '../module-bindings.mjs';
import {selectOriginalRouterCoreFacade} from '../router-core-facade-source.mjs';
import {captureSourceModuleViews,originalModuleViewItems} from '../source-module-views.mjs';
import {ROUTER_FORMATTING_FACADE_SOURCE,ROUTER_CORE_PRIMITIVES_SOURCE} from '../router-core-source-data.mjs';
import {assertReverseConcreteSourceHost} from './concrete-source.mjs';
import {ownedCorePairedTypePath,prepareOwnedCorePairedTypes} from './owned-state-paired-types.mjs';
import {ownedBase64Operation,ownedBase64Compatible,ownedBase64ReadonlyOctets,ownedBase64Result} from './owned-base64-source.mjs';
import {ROUTER_CORE_BASE64_SOURCE} from '../router-core-source-data.mjs';
import {deriveDependencyProfile} from '../derive-dependencies.mjs';
import {captureOriginalExternalTraitPackage,originalExternalTraitPackageInputs} from '../extensions/external-trait-sources.mjs';
import {transportConcreteSyntaxSource} from '../concrete-syntax-meta.mjs';
import {ownedJsonReaderOperation,ownedJsonBorrowed} from './owned-json-source.mjs';
import {ownedIterationOperation as ownedCollectionOperation,ownedIterationOnlyOperation,ownedCollectionOptionalPayload as ownedJsonOptionalPayload} from './owned-iteration-contracts.mjs';
import {ownedIntegerLiteral,narrowOwnedNumericLiteral} from './owned-numeric-literals.mjs';
import {ownedStateOperation,ownedStateCompatible,ownedStateWrittenType,requireOwnedStateSources as requireOwnedCollectionLeaf} from './owned-state-contracts.mjs';
import {ownedOutcomeOperation,ownedOutcomeType,ownedOutcomeCompatible,requireOwnedOutcomeSources} from './owned-outcome-contracts.mjs';
import {ownedJsonFieldOperation,requireOwnedJsonFieldSources} from './owned-json-fields.mjs';
import {pairedCollectionCallback} from './owned-collections-paired.mjs';
import {ownedJsonOptionalReaderOperation} from './owned-json-source.mjs';
import {ownedAsciiOperation} from './owned-ascii-source.mjs';
import {hostCoreAsciiRuntimeAssets} from '../ascii-runtime-assets.mjs';
import {hostCoreAsciiBaseRuntimeAssets} from '../ascii-base-runtime-assets.mjs';

const contexts=new WeakMap(),traversals=new WeakMap();
const fail=message=>{throw new TypeError('Owned reverse source: '+message);};
const digest=source=>createHash('sha256').update(source).digest('hex');
function runtimeParsedWithoutParents(ts,path,source){
 const file=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,false,path.endsWith('.ts')||path.endsWith('.mts')?ts.ScriptKind.TS:ts.ScriptKind.JS);
 if(file.parseDiagnostics.length)fail('native source syntax: '+path);return file;
}
// Primitive import-edge storage only. Native AST/checkers never enter a frame.
const __runtimeImportInitial=originalPrivateParserIngressUnchanged()&&originalNamespaceTraversalIntrinsicsUnchanged()&&originalDataFreezeIntrinsicsUnchanged()&&originalStaticSourceIntrinsicsUnchanged();
const __runtimeImportPins=__runtimeImportInitial?({"compiler":[{"key":"noop","enumerable":true,"configurable":false,"get":"() => noop"},{"key":"createSourceFile","enumerable":true,"configurable":false,"get":"() => createSourceFile"},{"key":"isImportDeclaration","enumerable":true,"configurable":false,"get":"() => isImportDeclaration"},{"key":"isExportDeclaration","enumerable":true,"configurable":false,"get":"() => isExportDeclaration"},{"key":"forEachChild","enumerable":true,"configurable":false,"get":"() => forEachChild"},{"key":"forEachChildRecursively","enumerable":true,"configurable":false,"get":"() => forEachChildRecursively"},{"key":"setParentRecursive","enumerable":true,"configurable":false,"get":"() => setParentRecursive"},{"key":"setParent","enumerable":true,"configurable":false,"get":"() => setParent"},{"key":"isJSDocNode","enumerable":true,"configurable":false,"get":"() => isJSDocNode"},{"key":"ScriptKind","enumerable":true,"configurable":false,"get":"() => ScriptKind"},{"key":"ScriptTarget","enumerable":true,"configurable":false,"get":"() => ScriptTarget"},{"key":"Debug","enumerable":true,"configurable":false,"get":"() => Debug"},{"key":"objectAllocator","enumerable":true,"configurable":false,"get":"() => objectAllocator"},{"key":"performance","enumerable":true,"configurable":false,"get":"() => ts_performance_exports"},{"key":"tracing","enumerable":true,"configurable":false,"get":"() => tracing"}],"ScriptKind":[{"key":"0","writable":true,"enumerable":true,"configurable":true,"primitive":{"type":"string","value":"Unknown"}},{"key":"1","writable":true,"enumerable":true,"configurable":true,"primitive":{"type":"string","value":"JS"}},{"key":"2","writable":true,"enumerable":true,"configurable":true,"primitive":{"type":"string","value":"JSX"}},{"key":"3","writable":true,"enumerable":true,"configurable":true,"primitive":{"type":"string","value":"TS"}},{"key":"4","writable":true,"enumerable":true,"configurable":true,"primitive":{"type":"string","value":"TSX"}},{"key":"5","writable":true,"enumerable":true,"configurable":true,"primitive":{"type":"string","value":"External"}},{"key":"6","writable":true,"enumerable":true,"configurable":true,"primitive":{"type":"string","value":"JSON"}},{"key":"7","writable":true,"enumerable":true,"configurable":true,"primitive":{"type":"string","value":"Deferred"}},{"key":"Unknown","writable":true,"enumerable":true,"configurable":true,"primitive":{"type":"number","value":0}},{"key":"JS","writable":true,"enumerable":true,"configurable":true,"primitive":{"type":"number","value":1}},{"key":"JSX","writable":true,"enumerable":true,"configurable":true,"primitive":{"type":"number","value":2}},{"key":"TS","writable":true,"enumerable":true,"configurable":true,"primitive":{"type":"number","value":3}},{"key":"TSX","writable":true,"enumerable":true,"configurable":true,"primitive":{"type":"number","value":4}},{"key":"External","writable":true,"enumerable":true,"configurable":true,"primitive":{"type":"number","value":5}},{"key":"JSON","writable":true,"enumerable":true,"configurable":true,"primitive":{"type":"number","value":6}},{"key":"Deferred","writable":true,"enumerable":true,"configurable":true,"primitive":{"type":"number","value":7}}],"ScriptTarget":[{"key":"0","writable":true,"enumerable":true,"configurable":true,"primitive":{"type":"string","value":"ES3"}},{"key":"1","writable":true,"enumerable":true,"configurable":true,"primitive":{"type":"string","value":"ES5"}},{"key":"2","writable":true,"enumerable":true,"configurable":true,"primitive":{"type":"string","value":"ES2015"}},{"key":"3","writable":true,"enumerable":true,"configurable":true,"primitive":{"type":"string","value":"ES2016"}},{"key":"4","writable":true,"enumerable":true,"configurable":true,"primitive":{"type":"string","value":"ES2017"}},{"key":"5","writable":true,"enumerable":true,"configurable":true,"primitive":{"type":"string","value":"ES2018"}},{"key":"6","writable":true,"enumerable":true,"configurable":true,"primitive":{"type":"string","value":"ES2019"}},{"key":"7","writable":true,"enumerable":true,"configurable":true,"primitive":{"type":"string","value":"ES2020"}},{"key":"8","writable":true,"enumerable":true,"configurable":true,"primitive":{"type":"string","value":"ES2021"}},{"key":"9","writable":true,"enumerable":true,"configurable":true,"primitive":{"type":"string","value":"ES2022"}},{"key":"10","writable":true,"enumerable":true,"configurable":true,"primitive":{"type":"string","value":"ES2023"}},{"key":"11","writable":true,"enumerable":true,"configurable":true,"primitive":{"type":"string","value":"ES2024"}},{"key":"99","writable":true,"enumerable":true,"configurable":true,"primitive":{"type":"string","value":"Latest"}},{"key":"100","writable":true,"enumerable":true,"configurable":true,"primitive":{"type":"string","value":"JSON"}},{"key":"ES3","writable":true,"enumerable":true,"configurable":true,"primitive":{"type":"number","value":0}},{"key":"ES5","writable":true,"enumerable":true,"configurable":true,"primitive":{"type":"number","value":1}},{"key":"ES2015","writable":true,"enumerable":true,"configurable":true,"primitive":{"type":"number","value":2}},{"key":"ES2016","writable":true,"enumerable":true,"configurable":true,"primitive":{"type":"number","value":3}},{"key":"ES2017","writable":true,"enumerable":true,"configurable":true,"primitive":{"type":"number","value":4}},{"key":"ES2018","writable":true,"enumerable":true,"configurable":true,"primitive":{"type":"number","value":5}},{"key":"ES2019","writable":true,"enumerable":true,"configurable":true,"primitive":{"type":"number","value":6}},{"key":"ES2020","writable":true,"enumerable":true,"configurable":true,"primitive":{"type":"number","value":7}},{"key":"ES2021","writable":true,"enumerable":true,"configurable":true,"primitive":{"type":"number","value":8}},{"key":"ES2022","writable":true,"enumerable":true,"configurable":true,"primitive":{"type":"number","value":9}},{"key":"ES2023","writable":true,"enumerable":true,"configurable":true,"primitive":{"type":"number","value":10}},{"key":"ES2024","writable":true,"enumerable":true,"configurable":true,"primitive":{"type":"number","value":11}},{"key":"ESNext","writable":true,"enumerable":true,"configurable":true,"primitive":{"type":"number","value":99}},{"key":"JSON","writable":true,"enumerable":true,"configurable":true,"primitive":{"type":"number","value":100}},{"key":"Latest","writable":true,"enumerable":true,"configurable":true,"primitive":{"type":"number","value":99}}],"Debug":[{"key":"currentLogLevel","writable":true,"enumerable":true,"configurable":true,"primitive":{"type":"number","value":2}},{"key":"isDebugging","writable":true,"enumerable":true,"configurable":true,"primitive":{"type":"boolean","value":false}},{"key":"shouldLog","writable":true,"enumerable":true,"configurable":true,"value":"function shouldLog(level) {\n    return Debug2.currentLogLevel <= level;\n  }"},{"key":"log","writable":true,"enumerable":true,"configurable":true,"value":"function log(s) {\n    logMessage(3 /* Info */, s);\n  }"},{"key":"getAssertionLevel","writable":true,"enumerable":true,"configurable":true,"value":"function getAssertionLevel() {\n    return currentAssertionLevel;\n  }"},{"key":"setAssertionLevel","writable":true,"enumerable":true,"configurable":true,"value":"function setAssertionLevel(level) {\n    const prevAssertionLevel = currentAssertionLevel;\n    currentAssertionLevel = level;\n    if (level > prevAssertionLevel) {\n      for (const key of getOwnKeys(assertionCache)) {\n        const cachedFunc = assertionCache[key];\n        if (cachedFunc !== void 0 && Debug2[key] !== cachedFunc.assertion && level >= cachedFunc.level) {\n          Debug2[key] = cachedFunc;\n          assertionCache[key] = void 0;\n        }\n      }\n    }\n  }"},{"key":"shouldAssert","writable":true,"enumerable":true,"configurable":true,"value":"function shouldAssert(level) {\n    return currentAssertionLevel >= level;\n  }"},{"key":"fail","writable":true,"enumerable":true,"configurable":true,"value":"function fail(message, stackCrawlMark) {\n    debugger;\n    const e = new Error(message ? `Debug Failure. ${message}` : \"Debug Failure.\");\n    if (Error.captureStackTrace) {\n      Error.captureStackTrace(e, stackCrawlMark || fail);\n    }\n    throw e;\n  }"},{"key":"failBadSyntaxKind","writable":true,"enumerable":true,"configurable":true,"value":"function failBadSyntaxKind(node, message, stackCrawlMark) {\n    return fail(\n      `${message || \"Unexpected node.\"}\\r\nNode ${formatSyntaxKind(node.kind)} was unexpected.`,\n      stackCrawlMark || failBadSyntaxKind\n    );\n  }"},{"key":"assert","writable":true,"enumerable":true,"configurable":true,"value":"function assert(expression, message, verboseDebugInfo, stackCrawlMark) {\n    if (!expression) {\n      message = message ? `False expression: ${message}` : \"False expression.\";\n      if (verboseDebugInfo) {\n        message += \"\\r\\nVerbose Debug Information: \" + (typeof verboseDebugInfo === \"string\" ? verboseDebugInfo : verboseDebugInfo());\n      }\n      fail(message, stackCrawlMark || assert);\n    }\n  }"},{"key":"assertEqual","writable":true,"enumerable":true,"configurable":true,"value":"function assertEqual(a, b, msg, msg2, stackCrawlMark) {\n    if (a !== b) {\n      const message = msg ? msg2 ? `${msg} ${msg2}` : msg : \"\";\n      fail(`Expected ${a} === ${b}. ${message}`, stackCrawlMark || assertEqual);\n    }\n  }"},{"key":"assertLessThan","writable":true,"enumerable":true,"configurable":true,"value":"function assertLessThan(a, b, msg, stackCrawlMark) {\n    if (a >= b) {\n      fail(`Expected ${a} < ${b}. ${msg || \"\"}`, stackCrawlMark || assertLessThan);\n    }\n  }"},{"key":"assertLessThanOrEqual","writable":true,"enumerable":true,"configurable":true,"value":"function assertLessThanOrEqual(a, b, stackCrawlMark) {\n    if (a > b) {\n      fail(`Expected ${a} <= ${b}`, stackCrawlMark || assertLessThanOrEqual);\n    }\n  }"},{"key":"assertGreaterThanOrEqual","writable":true,"enumerable":true,"configurable":true,"value":"function assertGreaterThanOrEqual(a, b, stackCrawlMark) {\n    if (a < b) {\n      fail(`Expected ${a} >= ${b}`, stackCrawlMark || assertGreaterThanOrEqual);\n    }\n  }"},{"key":"assertIsDefined","writable":true,"enumerable":true,"configurable":true,"value":"function assertIsDefined(value, message, stackCrawlMark) {\n    if (value === void 0 || value === null) {\n      fail(message, stackCrawlMark || assertIsDefined);\n    }\n  }"},{"key":"checkDefined","writable":true,"enumerable":true,"configurable":true,"value":"function checkDefined(value, message, stackCrawlMark) {\n    assertIsDefined(value, message, stackCrawlMark || checkDefined);\n    return value;\n  }"},{"key":"assertEachIsDefined","writable":true,"enumerable":true,"configurable":true,"value":"function assertEachIsDefined(value, message, stackCrawlMark) {\n    for (const v of value) {\n      assertIsDefined(v, message, stackCrawlMark || assertEachIsDefined);\n    }\n  }"},{"key":"checkEachDefined","writable":true,"enumerable":true,"configurable":true,"value":"function checkEachDefined(value, message, stackCrawlMark) {\n    assertEachIsDefined(value, message, stackCrawlMark || checkEachDefined);\n    return value;\n  }"},{"key":"assertNever","writable":true,"enumerable":true,"configurable":true,"value":"function assertNever(member, message = \"Illegal value:\", stackCrawlMark) {\n    const detail = typeof member === \"object\" && hasProperty(member, \"kind\") && hasProperty(member, \"pos\") ? \"SyntaxKind: \" + formatSyntaxKind(member.kind) : JSON.stringify(member);\n    return fail(`${message} ${detail}`, stackCrawlMark || assertNever);\n  }"},{"key":"assertEachNode","writable":true,"enumerable":true,"configurable":true,"nativeNoop":"function noop(_) {\n}","value":"function assertEachNode(nodes, test, message, stackCrawlMark) {\n    if (shouldAssertFunction(1 /* Normal */, \"assertEachNode\")) {\n      assert(\n        test === void 0 || every(nodes, test),\n        message || \"Unexpected node.\",\n        () => `Node array did not pass test '${getFunctionName(test)}'.`,\n        stackCrawlMark || assertEachNode\n      );\n    }\n  }"},{"key":"assertNode","writable":true,"enumerable":true,"configurable":true,"nativeNoop":"function noop(_) {\n}","value":"function assertNode(node, test, message, stackCrawlMark) {\n    if (shouldAssertFunction(1 /* Normal */, \"assertNode\")) {\n      assert(\n        node !== void 0 && (test === void 0 || test(node)),\n        message || \"Unexpected node.\",\n        () => `Node ${formatSyntaxKind(node == null ? void 0 : node.kind)} did not pass test '${getFunctionName(test)}'.`,\n        stackCrawlMark || assertNode\n      );\n    }\n  }"},{"key":"assertNotNode","writable":true,"enumerable":true,"configurable":true,"nativeNoop":"function noop(_) {\n}","value":"function assertNotNode(node, test, message, stackCrawlMark) {\n    if (shouldAssertFunction(1 /* Normal */, \"assertNotNode\")) {\n      assert(\n        node === void 0 || test === void 0 || !test(node),\n        message || \"Unexpected node.\",\n        () => `Node ${formatSyntaxKind(node.kind)} should not have passed test '${getFunctionName(test)}'.`,\n        stackCrawlMark || assertNotNode\n      );\n    }\n  }"},{"key":"assertOptionalNode","writable":true,"enumerable":true,"configurable":true,"nativeNoop":"function noop(_) {\n}","value":"function assertOptionalNode(node, test, message, stackCrawlMark) {\n    if (shouldAssertFunction(1 /* Normal */, \"assertOptionalNode\")) {\n      assert(\n        test === void 0 || node === void 0 || test(node),\n        message || \"Unexpected node.\",\n        () => `Node ${formatSyntaxKind(node == null ? void 0 : node.kind)} did not pass test '${getFunctionName(test)}'.`,\n        stackCrawlMark || assertOptionalNode\n      );\n    }\n  }"},{"key":"assertOptionalToken","writable":true,"enumerable":true,"configurable":true,"nativeNoop":"function noop(_) {\n}","value":"function assertOptionalToken(node, kind, message, stackCrawlMark) {\n    if (shouldAssertFunction(1 /* Normal */, \"assertOptionalToken\")) {\n      assert(\n        kind === void 0 || node === void 0 || node.kind === kind,\n        message || \"Unexpected node.\",\n        () => `Node ${formatSyntaxKind(node == null ? void 0 : node.kind)} was not a '${formatSyntaxKind(kind)}' token.`,\n        stackCrawlMark || assertOptionalToken\n      );\n    }\n  }"},{"key":"assertMissingNode","writable":true,"enumerable":true,"configurable":true,"nativeNoop":"function noop(_) {\n}","value":"function assertMissingNode(node, message, stackCrawlMark) {\n    if (shouldAssertFunction(1 /* Normal */, \"assertMissingNode\")) {\n      assert(\n        node === void 0,\n        message || \"Unexpected node.\",\n        () => `Node ${formatSyntaxKind(node.kind)} was unexpected'.`,\n        stackCrawlMark || assertMissingNode\n      );\n    }\n  }"},{"key":"type","writable":true,"enumerable":true,"configurable":true,"value":"function type(_value) {\n  }"},{"key":"getFunctionName","writable":true,"enumerable":true,"configurable":true,"value":"function getFunctionName(func) {\n    if (typeof func !== \"function\") {\n      return \"\";\n    } else if (hasProperty(func, \"name\")) {\n      return func.name;\n    } else {\n      const text = Function.prototype.toString.call(func);\n      const match = /^function\\s+([\\w$]+)\\s*\\(/.exec(text);\n      return match ? match[1] : \"\";\n    }\n  }"},{"key":"formatSymbol","writable":true,"enumerable":true,"configurable":true,"value":"function formatSymbol(symbol) {\n    return `{ name: ${unescapeLeadingUnderscores(symbol.escapedName)}; flags: ${formatSymbolFlags(symbol.flags)}; declarations: ${map(symbol.declarations, (node) => formatSyntaxKind(node.kind))} }`;\n  }"},{"key":"formatEnum","writable":true,"enumerable":true,"configurable":true,"value":"function formatEnum(value = 0, enumObject, isFlags) {\n    const members = getEnumMembers(enumObject);\n    if (value === 0) {\n      return members.length > 0 && members[0][0] === 0 ? members[0][1] : \"0\";\n    }\n    if (isFlags) {\n      const result = [];\n      let remainingFlags = value;\n      for (const [enumValue, enumName] of members) {\n        if (enumValue > value) {\n          break;\n        }\n        if (enumValue !== 0 && enumValue & value) {\n          result.push(enumName);\n          remainingFlags &= ~enumValue;\n        }\n      }\n      if (remainingFlags === 0) {\n        return result.join(\"|\");\n      }\n    } else {\n      for (const [enumValue, enumName] of members) {\n        if (enumValue === value) {\n          return enumName;\n        }\n      }\n    }\n    return value.toString();\n  }"},{"key":"formatSyntaxKind","writable":true,"enumerable":true,"configurable":true,"value":"function formatSyntaxKind(kind) {\n    return formatEnum(\n      kind,\n      SyntaxKind,\n      /*isFlags*/\n      false\n    );\n  }"},{"key":"formatSnippetKind","writable":true,"enumerable":true,"configurable":true,"value":"function formatSnippetKind(kind) {\n    return formatEnum(\n      kind,\n      SnippetKind,\n      /*isFlags*/\n      false\n    );\n  }"},{"key":"formatScriptKind","writable":true,"enumerable":true,"configurable":true,"value":"function formatScriptKind(kind) {\n    return formatEnum(\n      kind,\n      ScriptKind,\n      /*isFlags*/\n      false\n    );\n  }"},{"key":"formatNodeFlags","writable":true,"enumerable":true,"configurable":true,"value":"function formatNodeFlags(flags) {\n    return formatEnum(\n      flags,\n      NodeFlags,\n      /*isFlags*/\n      true\n    );\n  }"},{"key":"formatNodeCheckFlags","writable":true,"enumerable":true,"configurable":true,"value":"function formatNodeCheckFlags(flags) {\n    return formatEnum(\n      flags,\n      NodeCheckFlags,\n      /*isFlags*/\n      true\n    );\n  }"},{"key":"formatModifierFlags","writable":true,"enumerable":true,"configurable":true,"value":"function formatModifierFlags(flags) {\n    return formatEnum(\n      flags,\n      ModifierFlags,\n      /*isFlags*/\n      true\n    );\n  }"},{"key":"formatTransformFlags","writable":true,"enumerable":true,"configurable":true,"value":"function formatTransformFlags(flags) {\n    return formatEnum(\n      flags,\n      TransformFlags,\n      /*isFlags*/\n      true\n    );\n  }"},{"key":"formatEmitFlags","writable":true,"enumerable":true,"configurable":true,"value":"function formatEmitFlags(flags) {\n    return formatEnum(\n      flags,\n      EmitFlags,\n      /*isFlags*/\n      true\n    );\n  }"},{"key":"formatSymbolFlags","writable":true,"enumerable":true,"configurable":true,"value":"function formatSymbolFlags(flags) {\n    return formatEnum(\n      flags,\n      SymbolFlags,\n      /*isFlags*/\n      true\n    );\n  }"},{"key":"formatTypeFlags","writable":true,"enumerable":true,"configurable":true,"value":"function formatTypeFlags(flags) {\n    return formatEnum(\n      flags,\n      TypeFlags,\n      /*isFlags*/\n      true\n    );\n  }"},{"key":"formatSignatureFlags","writable":true,"enumerable":true,"configurable":true,"value":"function formatSignatureFlags(flags) {\n    return formatEnum(\n      flags,\n      SignatureFlags,\n      /*isFlags*/\n      true\n    );\n  }"},{"key":"formatObjectFlags","writable":true,"enumerable":true,"configurable":true,"value":"function formatObjectFlags(flags) {\n    return formatEnum(\n      flags,\n      ObjectFlags,\n      /*isFlags*/\n      true\n    );\n  }"},{"key":"formatFlowFlags","writable":true,"enumerable":true,"configurable":true,"value":"function formatFlowFlags(flags) {\n    return formatEnum(\n      flags,\n      FlowFlags,\n      /*isFlags*/\n      true\n    );\n  }"},{"key":"formatRelationComparisonResult","writable":true,"enumerable":true,"configurable":true,"value":"function formatRelationComparisonResult(result) {\n    return formatEnum(\n      result,\n      RelationComparisonResult,\n      /*isFlags*/\n      true\n    );\n  }"},{"key":"formatCheckMode","writable":true,"enumerable":true,"configurable":true,"value":"function formatCheckMode(mode) {\n    return formatEnum(\n      mode,\n      CheckMode,\n      /*isFlags*/\n      true\n    );\n  }"},{"key":"formatSignatureCheckMode","writable":true,"enumerable":true,"configurable":true,"value":"function formatSignatureCheckMode(mode) {\n    return formatEnum(\n      mode,\n      SignatureCheckMode,\n      /*isFlags*/\n      true\n    );\n  }"},{"key":"formatTypeFacts","writable":true,"enumerable":true,"configurable":true,"value":"function formatTypeFacts(facts) {\n    return formatEnum(\n      facts,\n      TypeFacts,\n      /*isFlags*/\n      true\n    );\n  }"},{"key":"attachFlowNodeDebugInfo","writable":true,"enumerable":true,"configurable":true,"value":"function attachFlowNodeDebugInfo(flowNode) {\n    if (isDebugInfoEnabled) {\n      if (typeof Object.setPrototypeOf === \"function\") {\n        if (!flowNodeProto) {\n          flowNodeProto = Object.create(Object.prototype);\n          attachFlowNodeDebugInfoWorker(flowNodeProto);\n        }\n        Object.setPrototypeOf(flowNode, flowNodeProto);\n      } else {\n        attachFlowNodeDebugInfoWorker(flowNode);\n      }\n    }\n    return flowNode;\n  }"},{"key":"attachNodeArrayDebugInfo","writable":true,"enumerable":true,"configurable":true,"value":"function attachNodeArrayDebugInfo(array) {\n    if (isDebugInfoEnabled) {\n      if (typeof Object.setPrototypeOf === \"function\") {\n        if (!nodeArrayProto) {\n          nodeArrayProto = Object.create(Array.prototype);\n          attachNodeArrayDebugInfoWorker(nodeArrayProto);\n        }\n        Object.setPrototypeOf(array, nodeArrayProto);\n      } else {\n        attachNodeArrayDebugInfoWorker(array);\n      }\n    }\n  }"},{"key":"enableDebugInfo","writable":true,"enumerable":true,"configurable":true,"value":"function enableDebugInfo() {\n    if (isDebugInfoEnabled) return;\n    const weakTypeTextMap = /* @__PURE__ */ new WeakMap();\n    const weakNodeTextMap = /* @__PURE__ */ new WeakMap();\n    Object.defineProperties(objectAllocator.getSymbolConstructor().prototype, {\n      // for use with vscode-js-debug's new customDescriptionGenerator in launch.json\n      __tsDebuggerDisplay: {\n        value() {\n          const symbolHeader = this.flags & 33554432 /* Transient */ ? \"TransientSymbol\" : \"Symbol\";\n          const remainingSymbolFlags = this.flags & ~33554432 /* Transient */;\n          return `${symbolHeader} '${symbolName(this)}'${remainingSymbolFlags ? ` (${formatSymbolFlags(remainingSymbolFlags)})` : \"\"}`;\n        }\n      },\n      __debugFlags: {\n        get() {\n          return formatSymbolFlags(this.flags);\n        }\n      }\n    });\n    Object.defineProperties(objectAllocator.getTypeConstructor().prototype, {\n      // for use with vscode-js-debug's new customDescriptionGenerator in launch.json\n      __tsDebuggerDisplay: {\n        value() {\n          const typeHeader = this.flags & 67359327 /* Intrinsic */ ? `IntrinsicType ${this.intrinsicName}${this.debugIntrinsicName ? ` (${this.debugIntrinsicName})` : \"\"}` : this.flags & 98304 /* Nullable */ ? \"NullableType\" : this.flags & 384 /* StringOrNumberLiteral */ ? `LiteralType ${JSON.stringify(this.value)}` : this.flags & 2048 /* BigIntLiteral */ ? `LiteralType ${this.value.negative ? \"-\" : \"\"}${this.value.base10Value}n` : this.flags & 8192 /* UniqueESSymbol */ ? \"UniqueESSymbolType\" : this.flags & 32 /* Enum */ ? \"EnumType\" : this.flags & 1048576 /* Union */ ? \"UnionType\" : this.flags & 2097152 /* Intersection */ ? \"IntersectionType\" : this.flags & 4194304 /* Index */ ? \"IndexType\" : this.flags & 8388608 /* IndexedAccess */ ? \"IndexedAccessType\" : this.flags & 16777216 /* Conditional */ ? \"ConditionalType\" : this.flags & 33554432 /* Substitution */ ? \"SubstitutionType\" : this.flags & 262144 /* TypeParameter */ ? \"TypeParameter\" : this.flags & 524288 /* Object */ ? this.objectFlags & 3 /* ClassOrInterface */ ? \"InterfaceType\" : this.objectFlags & 4 /* Reference */ ? \"TypeReference\" : this.objectFlags & 8 /* Tuple */ ? \"TupleType\" : this.objectFlags & 16 /* Anonymous */ ? \"AnonymousType\" : this.objectFlags & 32 /* Mapped */ ? \"MappedType\" : this.objectFlags & 1024 /* ReverseMapped */ ? \"ReverseMappedType\" : this.objectFlags & 256 /* EvolvingArray */ ? \"EvolvingArrayType\" : \"ObjectType\" : \"Type\";\n          const remainingObjectFlags = this.flags & 524288 /* Object */ ? this.objectFlags & ~1343 /* ObjectTypeKindMask */ : 0;\n          return `${typeHeader}${this.symbol ? ` '${symbolName(this.symbol)}'` : \"\"}${remainingObjectFlags ? ` (${formatObjectFlags(remainingObjectFlags)})` : \"\"}`;\n        }\n      },\n      __debugFlags: {\n        get() {\n          return formatTypeFlags(this.flags);\n        }\n      },\n      __debugObjectFlags: {\n        get() {\n          return this.flags & 524288 /* Object */ ? formatObjectFlags(this.objectFlags) : \"\";\n        }\n      },\n      __debugTypeToString: {\n        value() {\n          let text = weakTypeTextMap.get(this);\n          if (text === void 0) {\n            text = this.checker.typeToString(this);\n            weakTypeTextMap.set(this, text);\n          }\n          return text;\n        }\n      }\n    });\n    Object.defineProperties(objectAllocator.getSignatureConstructor().prototype, {\n      __debugFlags: {\n        get() {\n          return formatSignatureFlags(this.flags);\n        }\n      },\n      __debugSignatureToString: {\n        value() {\n          var _a;\n          return (_a = this.checker) == null ? void 0 : _a.signatureToString(this);\n        }\n      }\n    });\n    const nodeConstructors = [\n      objectAllocator.getNodeConstructor(),\n      objectAllocator.getIdentifierConstructor(),\n      objectAllocator.getTokenConstructor(),\n      objectAllocator.getSourceFileConstructor()\n    ];\n    for (const ctor of nodeConstructors) {\n      if (!hasProperty(ctor.prototype, \"__debugKind\")) {\n        Object.defineProperties(ctor.prototype, {\n          // for use with vscode-js-debug's new customDescriptionGenerator in launch.json\n          __tsDebuggerDisplay: {\n            value() {\n              const nodeHeader = isGeneratedIdentifier(this) ? \"GeneratedIdentifier\" : isIdentifier(this) ? `Identifier '${idText(this)}'` : isPrivateIdentifier(this) ? `PrivateIdentifier '${idText(this)}'` : isStringLiteral(this) ? `StringLiteral ${JSON.stringify(this.text.length < 10 ? this.text : this.text.slice(10) + \"...\")}` : isNumericLiteral(this) ? `NumericLiteral ${this.text}` : isBigIntLiteral(this) ? `BigIntLiteral ${this.text}n` : isTypeParameterDeclaration(this) ? \"TypeParameterDeclaration\" : isParameter(this) ? \"ParameterDeclaration\" : isConstructorDeclaration(this) ? \"ConstructorDeclaration\" : isGetAccessorDeclaration(this) ? \"GetAccessorDeclaration\" : isSetAccessorDeclaration(this) ? \"SetAccessorDeclaration\" : isCallSignatureDeclaration(this) ? \"CallSignatureDeclaration\" : isConstructSignatureDeclaration(this) ? \"ConstructSignatureDeclaration\" : isIndexSignatureDeclaration(this) ? \"IndexSignatureDeclaration\" : isTypePredicateNode(this) ? \"TypePredicateNode\" : isTypeReferenceNode(this) ? \"TypeReferenceNode\" : isFunctionTypeNode(this) ? \"FunctionTypeNode\" : isConstructorTypeNode(this) ? \"ConstructorTypeNode\" : isTypeQueryNode(this) ? \"TypeQueryNode\" : isTypeLiteralNode(this) ? \"TypeLiteralNode\" : isArrayTypeNode(this) ? \"ArrayTypeNode\" : isTupleTypeNode(this) ? \"TupleTypeNode\" : isOptionalTypeNode(this) ? \"OptionalTypeNode\" : isRestTypeNode(this) ? \"RestTypeNode\" : isUnionTypeNode(this) ? \"UnionTypeNode\" : isIntersectionTypeNode(this) ? \"IntersectionTypeNode\" : isConditionalTypeNode(this) ? \"ConditionalTypeNode\" : isInferTypeNode(this) ? \"InferTypeNode\" : isParenthesizedTypeNode(this) ? \"ParenthesizedTypeNode\" : isThisTypeNode(this) ? \"ThisTypeNode\" : isTypeOperatorNode(this) ? \"TypeOperatorNode\" : isIndexedAccessTypeNode(this) ? \"IndexedAccessTypeNode\" : isMappedTypeNode(this) ? \"MappedTypeNode\" : isLiteralTypeNode(this) ? \"LiteralTypeNode\" : isNamedTupleMember(this) ? \"NamedTupleMember\" : isImportTypeNode(this) ? \"ImportTypeNode\" : formatSyntaxKind(this.kind);\n              return `${nodeHeader}${this.flags ? ` (${formatNodeFlags(this.flags)})` : \"\"}`;\n            }\n          },\n          __debugKind: {\n            get() {\n              return formatSyntaxKind(this.kind);\n            }\n          },\n          __debugNodeFlags: {\n            get() {\n              return formatNodeFlags(this.flags);\n            }\n          },\n          __debugModifierFlags: {\n            get() {\n              return formatModifierFlags(getEffectiveModifierFlagsNoCache(this));\n            }\n          },\n          __debugTransformFlags: {\n            get() {\n              return formatTransformFlags(this.transformFlags);\n            }\n          },\n          __debugIsParseTreeNode: {\n            get() {\n              return isParseTreeNode(this);\n            }\n          },\n          __debugEmitFlags: {\n            get() {\n              return formatEmitFlags(getEmitFlags(this));\n            }\n          },\n          __debugGetText: {\n            value(includeTrivia) {\n              if (nodeIsSynthesized(this)) return \"\";\n              let text = weakNodeTextMap.get(this);\n              if (text === void 0) {\n                const parseNode = getParseTreeNode(this);\n                const sourceFile = parseNode && getSourceFileOfNode(parseNode);\n                text = sourceFile ? getSourceTextOfNodeFromSourceFile(sourceFile, parseNode, includeTrivia) : \"\";\n                weakNodeTextMap.set(this, text);\n              }\n              return text;\n            }\n          }\n        });\n      }\n    }\n    isDebugInfoEnabled = true;\n  }"},{"key":"formatVariance","writable":true,"enumerable":true,"configurable":true,"value":"function formatVariance(varianceFlags) {\n    const variance = varianceFlags & 7 /* VarianceMask */;\n    let result = variance === 0 /* Invariant */ ? \"in out\" : variance === 3 /* Bivariant */ ? \"[bivariant]\" : variance === 2 /* Contravariant */ ? \"in\" : variance === 1 /* Covariant */ ? \"out\" : variance === 4 /* Independent */ ? \"[independent]\" : \"\";\n    if (varianceFlags & 8 /* Unmeasurable */) {\n      result += \" (unmeasurable)\";\n    } else if (varianceFlags & 16 /* Unreliable */) {\n      result += \" (unreliable)\";\n    }\n    return result;\n  }"},{"key":"DebugTypeMapper","writable":true,"enumerable":true,"configurable":true,"value":"class DebugTypeMapper {\n    __debugToString() {\n      var _a;\n      type(this);\n      switch (this.kind) {\n        case 3 /* Function */:\n          return ((_a = this.debugInfo) == null ? void 0 : _a.call(this)) || \"(function mapper)\";\n        case 0 /* Simple */:\n          return `${this.source.__debugTypeToString()} -> ${this.target.__debugTypeToString()}`;\n        case 1 /* Array */:\n          return zipWith(\n            this.sources,\n            this.targets || map(this.sources, () => \"any\"),\n            (s, t) => `${s.__debugTypeToString()} -> ${typeof t === \"string\" ? t : t.__debugTypeToString()}`\n          ).join(\", \");\n        case 2 /* Deferred */:\n          return zipWith(\n            this.sources,\n            this.targets,\n            (s, t) => `${s.__debugTypeToString()} -> ${t().__debugTypeToString()}`\n          ).join(\", \");\n        case 5 /* Merged */:\n        case 4 /* Composite */:\n          return `m1: ${this.mapper1.__debugToString().split(\"\\n\").join(\"\\n    \")}\nm2: ${this.mapper2.__debugToString().split(\"\\n\").join(\"\\n    \")}`;\n        default:\n          return assertNever(this);\n      }\n    }\n  }"},{"key":"attachDebugPrototypeIfDebug","writable":true,"enumerable":true,"configurable":true,"value":"function attachDebugPrototypeIfDebug(mapper) {\n    if (Debug2.isDebugging) {\n      return Object.setPrototypeOf(mapper, DebugTypeMapper.prototype);\n    }\n    return mapper;\n  }"},{"key":"printControlFlowGraph","writable":true,"enumerable":true,"configurable":true,"value":"function printControlFlowGraph(flowNode) {\n    return console.log(formatControlFlowGraph(flowNode));\n  }"},{"key":"formatControlFlowGraph","writable":true,"enumerable":true,"configurable":true,"value":"function formatControlFlowGraph(flowNode) {\n    let nextDebugFlowId = -1;\n    function getDebugFlowNodeId(f) {\n      if (!f.id) {\n        f.id = nextDebugFlowId;\n        nextDebugFlowId--;\n      }\n      return f.id;\n    }\n    let BoxCharacter;\n    ((BoxCharacter2) => {\n      BoxCharacter2[\"lr\"] = \"\\u2500\";\n      BoxCharacter2[\"ud\"] = \"\\u2502\";\n      BoxCharacter2[\"dr\"] = \"\\u256D\";\n      BoxCharacter2[\"dl\"] = \"\\u256E\";\n      BoxCharacter2[\"ul\"] = \"\\u256F\";\n      BoxCharacter2[\"ur\"] = \"\\u2570\";\n      BoxCharacter2[\"udr\"] = \"\\u251C\";\n      BoxCharacter2[\"udl\"] = \"\\u2524\";\n      BoxCharacter2[\"dlr\"] = \"\\u252C\";\n      BoxCharacter2[\"ulr\"] = \"\\u2534\";\n      BoxCharacter2[\"udlr\"] = \"\\u256B\";\n    })(BoxCharacter || (BoxCharacter = {}));\n    let Connection;\n    ((Connection2) => {\n      Connection2[Connection2[\"None\"] = 0] = \"None\";\n      Connection2[Connection2[\"Up\"] = 1] = \"Up\";\n      Connection2[Connection2[\"Down\"] = 2] = \"Down\";\n      Connection2[Connection2[\"Left\"] = 4] = \"Left\";\n      Connection2[Connection2[\"Right\"] = 8] = \"Right\";\n      Connection2[Connection2[\"UpDown\"] = 3] = \"UpDown\";\n      Connection2[Connection2[\"LeftRight\"] = 12] = \"LeftRight\";\n      Connection2[Connection2[\"UpLeft\"] = 5] = \"UpLeft\";\n      Connection2[Connection2[\"UpRight\"] = 9] = \"UpRight\";\n      Connection2[Connection2[\"DownLeft\"] = 6] = \"DownLeft\";\n      Connection2[Connection2[\"DownRight\"] = 10] = \"DownRight\";\n      Connection2[Connection2[\"UpDownLeft\"] = 7] = \"UpDownLeft\";\n      Connection2[Connection2[\"UpDownRight\"] = 11] = \"UpDownRight\";\n      Connection2[Connection2[\"UpLeftRight\"] = 13] = \"UpLeftRight\";\n      Connection2[Connection2[\"DownLeftRight\"] = 14] = \"DownLeftRight\";\n      Connection2[Connection2[\"UpDownLeftRight\"] = 15] = \"UpDownLeftRight\";\n      Connection2[Connection2[\"NoChildren\"] = 16] = \"NoChildren\";\n    })(Connection || (Connection = {}));\n    const hasAntecedentFlags = 16 /* Assignment */ | 96 /* Condition */ | 128 /* SwitchClause */ | 256 /* ArrayMutation */ | 512 /* Call */ | 1024 /* ReduceLabel */;\n    const hasNodeFlags = 2 /* Start */ | 16 /* Assignment */ | 512 /* Call */ | 96 /* Condition */ | 256 /* ArrayMutation */;\n    const links = /* @__PURE__ */ Object.create(\n      /*o*/\n      null\n    );\n    const nodes = [];\n    const edges = [];\n    const root = buildGraphNode(flowNode, /* @__PURE__ */ new Set());\n    for (const node of nodes) {\n      node.text = renderFlowNode(node.flowNode, node.circular);\n      computeLevel(node);\n    }\n    const height = computeHeight(root);\n    const columnWidths = computeColumnWidths(height);\n    computeLanes(root, 0);\n    return renderGraph();\n    function isFlowSwitchClause(f) {\n      return !!(f.flags & 128 /* SwitchClause */);\n    }\n    function hasAntecedents(f) {\n      return !!(f.flags & 12 /* Label */) && !!f.antecedent;\n    }\n    function hasAntecedent(f) {\n      return !!(f.flags & hasAntecedentFlags);\n    }\n    function hasNode(f) {\n      return !!(f.flags & hasNodeFlags);\n    }\n    function getChildren(node) {\n      const children = [];\n      for (const edge of node.edges) {\n        if (edge.source === node) {\n          children.push(edge.target);\n        }\n      }\n      return children;\n    }\n    function getParents(node) {\n      const parents = [];\n      for (const edge of node.edges) {\n        if (edge.target === node) {\n          parents.push(edge.source);\n        }\n      }\n      return parents;\n    }\n    function buildGraphNode(flowNode2, seen) {\n      const id = getDebugFlowNodeId(flowNode2);\n      let graphNode = links[id];\n      if (graphNode && seen.has(flowNode2)) {\n        graphNode.circular = true;\n        graphNode = {\n          id: -1,\n          flowNode: flowNode2,\n          edges: [],\n          text: \"\",\n          lane: -1,\n          endLane: -1,\n          level: -1,\n          circular: \"circularity\"\n        };\n        nodes.push(graphNode);\n        return graphNode;\n      }\n      seen.add(flowNode2);\n      if (!graphNode) {\n        links[id] = graphNode = { id, flowNode: flowNode2, edges: [], text: \"\", lane: -1, endLane: -1, level: -1, circular: false };\n        nodes.push(graphNode);\n        if (hasAntecedents(flowNode2)) {\n          for (const antecedent of flowNode2.antecedent) {\n            buildGraphEdge(graphNode, antecedent, seen);\n          }\n        } else if (hasAntecedent(flowNode2)) {\n          buildGraphEdge(graphNode, flowNode2.antecedent, seen);\n        }\n      }\n      seen.delete(flowNode2);\n      return graphNode;\n    }\n    function buildGraphEdge(source, antecedent, seen) {\n      const target = buildGraphNode(antecedent, seen);\n      const edge = { source, target };\n      edges.push(edge);\n      source.edges.push(edge);\n      target.edges.push(edge);\n    }\n    function computeLevel(node) {\n      if (node.level !== -1) {\n        return node.level;\n      }\n      let level = 0;\n      for (const parent2 of getParents(node)) {\n        level = Math.max(level, computeLevel(parent2) + 1);\n      }\n      return node.level = level;\n    }\n    function computeHeight(node) {\n      let height2 = 0;\n      for (const child of getChildren(node)) {\n        height2 = Math.max(height2, computeHeight(child));\n      }\n      return height2 + 1;\n    }\n    function computeColumnWidths(height2) {\n      const columns = fill(Array(height2), 0);\n      for (const node of nodes) {\n        columns[node.level] = Math.max(columns[node.level], node.text.length);\n      }\n      return columns;\n    }\n    function computeLanes(node, lane) {\n      if (node.lane === -1) {\n        node.lane = lane;\n        node.endLane = lane;\n        const children = getChildren(node);\n        for (let i = 0; i < children.length; i++) {\n          if (i > 0) lane++;\n          const child = children[i];\n          computeLanes(child, lane);\n          if (child.endLane > node.endLane) {\n            lane = child.endLane;\n          }\n        }\n        node.endLane = lane;\n      }\n    }\n    function getHeader2(flags) {\n      if (flags & 2 /* Start */) return \"Start\";\n      if (flags & 4 /* BranchLabel */) return \"Branch\";\n      if (flags & 8 /* LoopLabel */) return \"Loop\";\n      if (flags & 16 /* Assignment */) return \"Assignment\";\n      if (flags & 32 /* TrueCondition */) return \"True\";\n      if (flags & 64 /* FalseCondition */) return \"False\";\n      if (flags & 128 /* SwitchClause */) return \"SwitchClause\";\n      if (flags & 256 /* ArrayMutation */) return \"ArrayMutation\";\n      if (flags & 512 /* Call */) return \"Call\";\n      if (flags & 1024 /* ReduceLabel */) return \"ReduceLabel\";\n      if (flags & 1 /* Unreachable */) return \"Unreachable\";\n      throw new Error();\n    }\n    function getNodeText(node) {\n      const sourceFile = getSourceFileOfNode(node);\n      return getSourceTextOfNodeFromSourceFile(\n        sourceFile,\n        node,\n        /*includeTrivia*/\n        false\n      );\n    }\n    function renderFlowNode(flowNode2, circular) {\n      let text = getHeader2(flowNode2.flags);\n      if (circular) {\n        text = `${text}#${getDebugFlowNodeId(flowNode2)}`;\n      }\n      if (isFlowSwitchClause(flowNode2)) {\n        const clauses = [];\n        const { switchStatement, clauseStart, clauseEnd } = flowNode2.node;\n        for (let i = clauseStart; i < clauseEnd; i++) {\n          const clause = switchStatement.caseBlock.clauses[i];\n          if (isDefaultClause(clause)) {\n            clauses.push(\"default\");\n          } else {\n            clauses.push(getNodeText(clause.expression));\n          }\n        }\n        text += ` (${clauses.join(\", \")})`;\n      } else if (hasNode(flowNode2)) {\n        if (flowNode2.node) {\n          text += ` (${getNodeText(flowNode2.node)})`;\n        }\n      }\n      return circular === \"circularity\" ? `Circular(${text})` : text;\n    }\n    function renderGraph() {\n      const columnCount = columnWidths.length;\n      const laneCount = maxBy(nodes, 0, (n) => n.lane) + 1;\n      const lanes = fill(Array(laneCount), \"\");\n      const grid = columnWidths.map(() => Array(laneCount));\n      const connectors = columnWidths.map(() => fill(Array(laneCount), 0));\n      for (const node of nodes) {\n        grid[node.level][node.lane] = node;\n        const children = getChildren(node);\n        for (let i = 0; i < children.length; i++) {\n          const child = children[i];\n          let connector = 8 /* Right */;\n          if (child.lane === node.lane) connector |= 4 /* Left */;\n          if (i > 0) connector |= 1 /* Up */;\n          if (i < children.length - 1) connector |= 2 /* Down */;\n          connectors[node.level][child.lane] |= connector;\n        }\n        if (children.length === 0) {\n          connectors[node.level][node.lane] |= 16 /* NoChildren */;\n        }\n        const parents = getParents(node);\n        for (let i = 0; i < parents.length; i++) {\n          const parent2 = parents[i];\n          let connector = 4 /* Left */;\n          if (i > 0) connector |= 1 /* Up */;\n          if (i < parents.length - 1) connector |= 2 /* Down */;\n          connectors[node.level - 1][parent2.lane] |= connector;\n        }\n      }\n      for (let column = 0; column < columnCount; column++) {\n        for (let lane = 0; lane < laneCount; lane++) {\n          const left = column > 0 ? connectors[column - 1][lane] : 0;\n          const above = lane > 0 ? connectors[column][lane - 1] : 0;\n          let connector = connectors[column][lane];\n          if (!connector) {\n            if (left & 8 /* Right */) connector |= 12 /* LeftRight */;\n            if (above & 2 /* Down */) connector |= 3 /* UpDown */;\n            connectors[column][lane] = connector;\n          }\n        }\n      }\n      for (let column = 0; column < columnCount; column++) {\n        for (let lane = 0; lane < lanes.length; lane++) {\n          const connector = connectors[column][lane];\n          const fill2 = connector & 4 /* Left */ ? \"\\u2500\" /* lr */ : \" \";\n          const node = grid[column][lane];\n          if (!node) {\n            if (column < columnCount - 1) {\n              writeLane(lane, repeat(fill2, columnWidths[column] + 1));\n            }\n          } else {\n            writeLane(lane, node.text);\n            if (column < columnCount - 1) {\n              writeLane(lane, \" \");\n              writeLane(lane, repeat(fill2, columnWidths[column] - node.text.length));\n            }\n          }\n          writeLane(lane, getBoxCharacter(connector));\n          writeLane(lane, connector & 8 /* Right */ && column < columnCount - 1 && !grid[column + 1][lane] ? \"\\u2500\" /* lr */ : \" \");\n        }\n      }\n      return `\n${lanes.join(\"\\n\")}\n`;\n      function writeLane(lane, text) {\n        lanes[lane] += text;\n      }\n    }\n    function getBoxCharacter(connector) {\n      switch (connector) {\n        case 3 /* UpDown */:\n          return \"\\u2502\" /* ud */;\n        case 12 /* LeftRight */:\n          return \"\\u2500\" /* lr */;\n        case 5 /* UpLeft */:\n          return \"\\u256F\" /* ul */;\n        case 9 /* UpRight */:\n          return \"\\u2570\" /* ur */;\n        case 6 /* DownLeft */:\n          return \"\\u256E\" /* dl */;\n        case 10 /* DownRight */:\n          return \"\\u256D\" /* dr */;\n        case 7 /* UpDownLeft */:\n          return \"\\u2524\" /* udl */;\n        case 11 /* UpDownRight */:\n          return \"\\u251C\" /* udr */;\n        case 13 /* UpLeftRight */:\n          return \"\\u2534\" /* ulr */;\n        case 14 /* DownLeftRight */:\n          return \"\\u252C\" /* dlr */;\n        case 15 /* UpDownLeftRight */:\n          return \"\\u256B\" /* udlr */;\n      }\n      return \" \";\n    }\n    function fill(array, value) {\n      if (array.fill) {\n        array.fill(value);\n      } else {\n        for (let i = 0; i < array.length; i++) {\n          array[i] = value;\n        }\n      }\n      return array;\n    }\n    function repeat(ch, length2) {\n      if (ch.repeat) {\n        return length2 > 0 ? ch.repeat(length2) : \"\";\n      }\n      let s = \"\";\n      while (s.length < length2) {\n        s += ch;\n      }\n      return s;\n    }\n  }"},{"key":"loggingHost","writable":true,"enumerable":true,"configurable":true}],"allocator":[{"key":"getNodeConstructor","writable":true,"enumerable":true,"configurable":true,"value":"() => NodeObject"},{"key":"getTokenConstructor","writable":true,"enumerable":true,"configurable":true,"value":"() => TokenObject"},{"key":"getIdentifierConstructor","writable":true,"enumerable":true,"configurable":true,"value":"() => IdentifierObject"},{"key":"getPrivateIdentifierConstructor","writable":true,"enumerable":true,"configurable":true,"value":"() => PrivateIdentifierObject"},{"key":"getSourceFileConstructor","writable":true,"enumerable":true,"configurable":true,"value":"() => SourceFileObject"},{"key":"getSymbolConstructor","writable":true,"enumerable":true,"configurable":true,"value":"() => SymbolObject"},{"key":"getTypeConstructor","writable":true,"enumerable":true,"configurable":true,"value":"() => TypeObject"},{"key":"getSignatureConstructor","writable":true,"enumerable":true,"configurable":true,"value":"() => SignatureObject"},{"key":"getSourceMapSourceConstructor","writable":true,"enumerable":true,"configurable":true,"value":"() => SourceMapSourceObject"}],"performance":[{"key":"clearMarks","enumerable":true,"configurable":false,"get":"() => clearMarks"},{"key":"clearMeasures","enumerable":true,"configurable":false,"get":"() => clearMeasures"},{"key":"createTimer","enumerable":true,"configurable":false,"get":"() => createTimer"},{"key":"createTimerIf","enumerable":true,"configurable":false,"get":"() => createTimerIf"},{"key":"disable","enumerable":true,"configurable":false,"get":"() => disable"},{"key":"enable","enumerable":true,"configurable":false,"get":"() => enable"},{"key":"forEachMark","enumerable":true,"configurable":false,"get":"() => forEachMark"},{"key":"forEachMeasure","enumerable":true,"configurable":false,"get":"() => forEachMeasure"},{"key":"getCount","enumerable":true,"configurable":false,"get":"() => getCount"},{"key":"getDuration","enumerable":true,"configurable":false,"get":"() => getDuration"},{"key":"isEnabled","enumerable":true,"configurable":false,"get":"() => isEnabled"},{"key":"mark","enumerable":true,"configurable":false,"get":"() => mark"},{"key":"measure","enumerable":true,"configurable":false,"get":"() => measure"},{"key":"nullTimer","enumerable":true,"configurable":false,"get":"() => nullTimer"}],"loggingHost":[{"key":"log","writable":true,"enumerable":true,"configurable":true,"value":"log(level, s) {\n      switch (level) {\n        case 1 /* Error */:\n          return console.error(s);\n        case 2 /* Warning */:\n          return console.warn(s);\n        case 3 /* Info */:\n          return console.log(s);\n        case 4 /* Verbose */:\n          return console.log(s);\n      }\n    }"}],"ctor:getNodeConstructor":[{"key":"length","writable":false,"enumerable":false,"configurable":true,"primitive":{"type":"number","value":3}},{"key":"name","writable":false,"enumerable":false,"configurable":true,"primitive":{"type":"string","value":"NodeObject"}},{"key":"prototype","writable":false,"enumerable":false,"configurable":false}],"prototype:getNodeConstructor:1":[{"key":"constructor","writable":true,"enumerable":false,"configurable":true,"value":"class {\n  constructor(kind, pos, end) {\n    this.pos = pos;\n    this.end = end;\n    this.kind = kind;\n    this.id = 0;\n    this.flags = 0 /* None */;\n    this.modifierFlagsCache = 0 /* None */;\n    this.transformFlags = 0 /* None */;\n    this.parent = void 0;\n    this.original = void 0;\n    this.emitNode = void 0;\n  }\n  assertHasRealPosition(message) {\n    Debug.assert(!positionIsSynthesized(this.pos) && !positionIsSynthesized(this.end), message || \"Node must have a real position for this operation\");\n  }\n  getSourceFile() {\n    return getSourceFileOfNode(this);\n  }\n  getStart(sourceFile, includeJsDocComment) {\n    this.assertHasRealPosition();\n    return getTokenPosOfNode(this, sourceFile, includeJsDocComment);\n  }\n  getFullStart() {\n    this.assertHasRealPosition();\n    return this.pos;\n  }\n  getEnd() {\n    this.assertHasRealPosition();\n    return this.end;\n  }\n  getWidth(sourceFile) {\n    this.assertHasRealPosition();\n    return this.getEnd() - this.getStart(sourceFile);\n  }\n  getFullWidth() {\n    this.assertHasRealPosition();\n    return this.end - this.pos;\n  }\n  getLeadingTriviaWidth(sourceFile) {\n    this.assertHasRealPosition();\n    return this.getStart(sourceFile) - this.pos;\n  }\n  getFullText(sourceFile) {\n    this.assertHasRealPosition();\n    return (sourceFile || this.getSourceFile()).text.substring(this.pos, this.end);\n  }\n  getText(sourceFile) {\n    this.assertHasRealPosition();\n    if (!sourceFile) {\n      sourceFile = this.getSourceFile();\n    }\n    return sourceFile.text.substring(this.getStart(sourceFile), this.getEnd());\n  }\n  getChildCount(sourceFile) {\n    return this.getChildren(sourceFile).length;\n  }\n  getChildAt(index, sourceFile) {\n    return this.getChildren(sourceFile)[index];\n  }\n  getChildren(sourceFile = getSourceFileOfNode(this)) {\n    this.assertHasRealPosition(\"Node without a real position cannot be scanned and thus has no token nodes - use forEachChild and collect the result if that's fine\");\n    return getNodeChildren(this, sourceFile) ?? setNodeChildren(this, sourceFile, createChildren(this, sourceFile));\n  }\n  getFirstToken(sourceFile) {\n    this.assertHasRealPosition();\n    const children = this.getChildren(sourceFile);\n    if (!children.length) {\n      return void 0;\n    }\n    const child = find(children, (kid) => kid.kind < 310 /* FirstJSDocNode */ || kid.kind > 352 /* LastJSDocNode */);\n    return child.kind < 167 /* FirstNode */ ? child : child.getFirstToken(sourceFile);\n  }\n  getLastToken(sourceFile) {\n    this.assertHasRealPosition();\n    const children = this.getChildren(sourceFile);\n    const child = lastOrUndefined(children);\n    if (!child) {\n      return void 0;\n    }\n    return child.kind < 167 /* FirstNode */ ? child : child.getLastToken(sourceFile);\n  }\n  forEachChild(cbNode, cbNodeArray) {\n    return forEachChild(this, cbNode, cbNodeArray);\n  }\n}"},{"key":"assertHasRealPosition","writable":true,"enumerable":false,"configurable":true,"value":"assertHasRealPosition(message) {\n    Debug.assert(!positionIsSynthesized(this.pos) && !positionIsSynthesized(this.end), message || \"Node must have a real position for this operation\");\n  }"},{"key":"getSourceFile","writable":true,"enumerable":false,"configurable":true,"value":"getSourceFile() {\n    return getSourceFileOfNode(this);\n  }"},{"key":"getStart","writable":true,"enumerable":false,"configurable":true,"value":"getStart(sourceFile, includeJsDocComment) {\n    this.assertHasRealPosition();\n    return getTokenPosOfNode(this, sourceFile, includeJsDocComment);\n  }"},{"key":"getFullStart","writable":true,"enumerable":false,"configurable":true,"value":"getFullStart() {\n    this.assertHasRealPosition();\n    return this.pos;\n  }"},{"key":"getEnd","writable":true,"enumerable":false,"configurable":true,"value":"getEnd() {\n    this.assertHasRealPosition();\n    return this.end;\n  }"},{"key":"getWidth","writable":true,"enumerable":false,"configurable":true,"value":"getWidth(sourceFile) {\n    this.assertHasRealPosition();\n    return this.getEnd() - this.getStart(sourceFile);\n  }"},{"key":"getFullWidth","writable":true,"enumerable":false,"configurable":true,"value":"getFullWidth() {\n    this.assertHasRealPosition();\n    return this.end - this.pos;\n  }"},{"key":"getLeadingTriviaWidth","writable":true,"enumerable":false,"configurable":true,"value":"getLeadingTriviaWidth(sourceFile) {\n    this.assertHasRealPosition();\n    return this.getStart(sourceFile) - this.pos;\n  }"},{"key":"getFullText","writable":true,"enumerable":false,"configurable":true,"value":"getFullText(sourceFile) {\n    this.assertHasRealPosition();\n    return (sourceFile || this.getSourceFile()).text.substring(this.pos, this.end);\n  }"},{"key":"getText","writable":true,"enumerable":false,"configurable":true,"value":"getText(sourceFile) {\n    this.assertHasRealPosition();\n    if (!sourceFile) {\n      sourceFile = this.getSourceFile();\n    }\n    return sourceFile.text.substring(this.getStart(sourceFile), this.getEnd());\n  }"},{"key":"getChildCount","writable":true,"enumerable":false,"configurable":true,"value":"getChildCount(sourceFile) {\n    return this.getChildren(sourceFile).length;\n  }"},{"key":"getChildAt","writable":true,"enumerable":false,"configurable":true,"value":"getChildAt(index, sourceFile) {\n    return this.getChildren(sourceFile)[index];\n  }"},{"key":"getChildren","writable":true,"enumerable":false,"configurable":true,"value":"getChildren(sourceFile = getSourceFileOfNode(this)) {\n    this.assertHasRealPosition(\"Node without a real position cannot be scanned and thus has no token nodes - use forEachChild and collect the result if that's fine\");\n    return getNodeChildren(this, sourceFile) ?? setNodeChildren(this, sourceFile, createChildren(this, sourceFile));\n  }"},{"key":"getFirstToken","writable":true,"enumerable":false,"configurable":true,"value":"getFirstToken(sourceFile) {\n    this.assertHasRealPosition();\n    const children = this.getChildren(sourceFile);\n    if (!children.length) {\n      return void 0;\n    }\n    const child = find(children, (kid) => kid.kind < 310 /* FirstJSDocNode */ || kid.kind > 352 /* LastJSDocNode */);\n    return child.kind < 167 /* FirstNode */ ? child : child.getFirstToken(sourceFile);\n  }"},{"key":"getLastToken","writable":true,"enumerable":false,"configurable":true,"value":"getLastToken(sourceFile) {\n    this.assertHasRealPosition();\n    const children = this.getChildren(sourceFile);\n    const child = lastOrUndefined(children);\n    if (!child) {\n      return void 0;\n    }\n    return child.kind < 167 /* FirstNode */ ? child : child.getLastToken(sourceFile);\n  }"},{"key":"forEachChild","writable":true,"enumerable":false,"configurable":true,"value":"forEachChild(cbNode, cbNodeArray) {\n    return forEachChild(this, cbNode, cbNodeArray);\n  }"}],"prototype:getNodeConstructor:2":[{"key":"constructor","writable":true,"enumerable":false,"configurable":true,"value":"function Object() { [native code] }"},{"key":"__defineGetter__","writable":true,"enumerable":false,"configurable":true,"value":"function __defineGetter__() { [native code] }"},{"key":"__defineSetter__","writable":true,"enumerable":false,"configurable":true,"value":"function __defineSetter__() { [native code] }"},{"key":"hasOwnProperty","writable":true,"enumerable":false,"configurable":true,"value":"function hasOwnProperty() { [native code] }"},{"key":"__lookupGetter__","writable":true,"enumerable":false,"configurable":true,"value":"function __lookupGetter__() { [native code] }"},{"key":"__lookupSetter__","writable":true,"enumerable":false,"configurable":true,"value":"function __lookupSetter__() { [native code] }"},{"key":"isPrototypeOf","writable":true,"enumerable":false,"configurable":true,"value":"function isPrototypeOf() { [native code] }"},{"key":"propertyIsEnumerable","writable":true,"enumerable":false,"configurable":true,"value":"function propertyIsEnumerable() { [native code] }"},{"key":"toString","writable":true,"enumerable":false,"configurable":true,"value":"function toString() { [native code] }"},{"key":"valueOf","writable":true,"enumerable":false,"configurable":true,"value":"function valueOf() { [native code] }"},{"key":"__proto__","enumerable":false,"configurable":true,"get":"function get __proto__() { [native code] }","set":"function set __proto__() { [native code] }"},{"key":"toLocaleString","writable":true,"enumerable":false,"configurable":true,"value":"function toLocaleString() { [native code] }"}],"ctor:getTokenConstructor":[{"key":"length","writable":false,"enumerable":false,"configurable":true,"primitive":{"type":"number","value":3}},{"key":"name","writable":false,"enumerable":false,"configurable":true,"primitive":{"type":"string","value":"TokenObject"}},{"key":"prototype","writable":false,"enumerable":false,"configurable":false}],"prototype:getTokenConstructor:1":[{"key":"constructor","writable":true,"enumerable":false,"configurable":true,"value":"class extends TokenOrIdentifierObject {\n  constructor(kind, pos, end) {\n    super(kind, pos, end);\n  }\n}"}],"prototype:getTokenConstructor:2":[{"key":"constructor","writable":true,"enumerable":false,"configurable":true,"value":"class {\n  constructor(kind, pos, end) {\n    this.pos = pos;\n    this.end = end;\n    this.kind = kind;\n    this.id = 0;\n    this.flags = 0 /* None */;\n    this.transformFlags = 0 /* None */;\n    this.parent = void 0;\n    this.emitNode = void 0;\n  }\n  getSourceFile() {\n    return getSourceFileOfNode(this);\n  }\n  getStart(sourceFile, includeJsDocComment) {\n    return getTokenPosOfNode(this, sourceFile, includeJsDocComment);\n  }\n  getFullStart() {\n    return this.pos;\n  }\n  getEnd() {\n    return this.end;\n  }\n  getWidth(sourceFile) {\n    return this.getEnd() - this.getStart(sourceFile);\n  }\n  getFullWidth() {\n    return this.end - this.pos;\n  }\n  getLeadingTriviaWidth(sourceFile) {\n    return this.getStart(sourceFile) - this.pos;\n  }\n  getFullText(sourceFile) {\n    return (sourceFile || this.getSourceFile()).text.substring(this.pos, this.end);\n  }\n  getText(sourceFile) {\n    if (!sourceFile) {\n      sourceFile = this.getSourceFile();\n    }\n    return sourceFile.text.substring(this.getStart(sourceFile), this.getEnd());\n  }\n  getChildCount() {\n    return this.getChildren().length;\n  }\n  getChildAt(index) {\n    return this.getChildren()[index];\n  }\n  getChildren() {\n    return this.kind === 1 /* EndOfFileToken */ ? this.jsDoc || emptyArray : emptyArray;\n  }\n  getFirstToken() {\n    return void 0;\n  }\n  getLastToken() {\n    return void 0;\n  }\n  forEachChild() {\n    return void 0;\n  }\n}"},{"key":"getSourceFile","writable":true,"enumerable":false,"configurable":true,"value":"getSourceFile() {\n    return getSourceFileOfNode(this);\n  }"},{"key":"getStart","writable":true,"enumerable":false,"configurable":true,"value":"getStart(sourceFile, includeJsDocComment) {\n    return getTokenPosOfNode(this, sourceFile, includeJsDocComment);\n  }"},{"key":"getFullStart","writable":true,"enumerable":false,"configurable":true,"value":"getFullStart() {\n    return this.pos;\n  }"},{"key":"getEnd","writable":true,"enumerable":false,"configurable":true,"value":"getEnd() {\n    return this.end;\n  }"},{"key":"getWidth","writable":true,"enumerable":false,"configurable":true,"value":"getWidth(sourceFile) {\n    return this.getEnd() - this.getStart(sourceFile);\n  }"},{"key":"getFullWidth","writable":true,"enumerable":false,"configurable":true,"value":"getFullWidth() {\n    return this.end - this.pos;\n  }"},{"key":"getLeadingTriviaWidth","writable":true,"enumerable":false,"configurable":true,"value":"getLeadingTriviaWidth(sourceFile) {\n    return this.getStart(sourceFile) - this.pos;\n  }"},{"key":"getFullText","writable":true,"enumerable":false,"configurable":true,"value":"getFullText(sourceFile) {\n    return (sourceFile || this.getSourceFile()).text.substring(this.pos, this.end);\n  }"},{"key":"getText","writable":true,"enumerable":false,"configurable":true,"value":"getText(sourceFile) {\n    if (!sourceFile) {\n      sourceFile = this.getSourceFile();\n    }\n    return sourceFile.text.substring(this.getStart(sourceFile), this.getEnd());\n  }"},{"key":"getChildCount","writable":true,"enumerable":false,"configurable":true,"value":"getChildCount() {\n    return this.getChildren().length;\n  }"},{"key":"getChildAt","writable":true,"enumerable":false,"configurable":true,"value":"getChildAt(index) {\n    return this.getChildren()[index];\n  }"},{"key":"getChildren","writable":true,"enumerable":false,"configurable":true,"value":"getChildren() {\n    return this.kind === 1 /* EndOfFileToken */ ? this.jsDoc || emptyArray : emptyArray;\n  }"},{"key":"getFirstToken","writable":true,"enumerable":false,"configurable":true,"value":"getFirstToken() {\n    return void 0;\n  }"},{"key":"getLastToken","writable":true,"enumerable":false,"configurable":true,"value":"getLastToken() {\n    return void 0;\n  }"},{"key":"forEachChild","writable":true,"enumerable":false,"configurable":true,"value":"forEachChild() {\n    return void 0;\n  }"}],"ctor:getIdentifierConstructor":[{"key":"length","writable":false,"enumerable":false,"configurable":true,"primitive":{"type":"number","value":3}},{"key":"name","writable":false,"enumerable":false,"configurable":true,"primitive":{"type":"string","value":"IdentifierObject"}},{"key":"prototype","writable":false,"enumerable":false,"configurable":false}],"prototype:getIdentifierConstructor:1":[{"key":"constructor","writable":true,"enumerable":false,"configurable":true,"value":"class extends TokenOrIdentifierObject {\n  constructor(kind, pos, end) {\n    super(kind, pos, end);\n  }\n  get text() {\n    return idText(this);\n  }\n}"},{"key":"text","enumerable":false,"configurable":true,"get":"get text() {\n    return idText(this);\n  }"}],"ctor:getPrivateIdentifierConstructor":[{"key":"length","writable":false,"enumerable":false,"configurable":true,"primitive":{"type":"number","value":3}},{"key":"name","writable":false,"enumerable":false,"configurable":true,"primitive":{"type":"string","value":"PrivateIdentifierObject"}},{"key":"prototype","writable":false,"enumerable":false,"configurable":false}],"prototype:getPrivateIdentifierConstructor:1":[{"key":"constructor","writable":true,"enumerable":false,"configurable":true,"value":"class extends TokenOrIdentifierObject {\n  constructor(kind, pos, end) {\n    super(kind, pos, end);\n  }\n  get text() {\n    return idText(this);\n  }\n}"},{"key":"text","enumerable":false,"configurable":true,"get":"get text() {\n    return idText(this);\n  }"}],"ctor:getSourceFileConstructor":[{"key":"length","writable":false,"enumerable":false,"configurable":true,"primitive":{"type":"number","value":3}},{"key":"name","writable":false,"enumerable":false,"configurable":true,"primitive":{"type":"string","value":"SourceFileObject"}},{"key":"prototype","writable":false,"enumerable":false,"configurable":false}],"prototype:getSourceFileConstructor:1":[{"key":"constructor","writable":true,"enumerable":false,"configurable":true,"value":"class extends NodeObject {\n  constructor(kind, pos, end) {\n    super(kind, pos, end);\n  }\n  update(newText, textChangeRange) {\n    return updateSourceFile(this, newText, textChangeRange);\n  }\n  getLineAndCharacterOfPosition(position) {\n    return getLineAndCharacterOfPosition(this, position);\n  }\n  getLineStarts() {\n    return getLineStarts(this);\n  }\n  getPositionOfLineAndCharacter(line, character, allowEdits) {\n    return computePositionOfLineAndCharacter(getLineStarts(this), line, character, this.text, allowEdits);\n  }\n  getLineEndOfPosition(pos) {\n    const { line } = this.getLineAndCharacterOfPosition(pos);\n    const lineStarts = this.getLineStarts();\n    let lastCharPos;\n    if (line + 1 >= lineStarts.length) {\n      lastCharPos = this.getEnd();\n    }\n    if (!lastCharPos) {\n      lastCharPos = lineStarts[line + 1] - 1;\n    }\n    const fullText = this.getFullText();\n    return fullText[lastCharPos] === \"\\n\" && fullText[lastCharPos - 1] === \"\\r\" ? lastCharPos - 1 : lastCharPos;\n  }\n  getNamedDeclarations() {\n    if (!this.namedDeclarations) {\n      this.namedDeclarations = this.computeNamedDeclarations();\n    }\n    return this.namedDeclarations;\n  }\n  computeNamedDeclarations() {\n    const result = createMultiMap();\n    this.forEachChild(visit);\n    return result;\n    function addDeclaration(declaration) {\n      const name = getDeclarationName(declaration);\n      if (name) {\n        result.add(name, declaration);\n      }\n    }\n    function getDeclarations(name) {\n      let declarations = result.get(name);\n      if (!declarations) {\n        result.set(name, declarations = []);\n      }\n      return declarations;\n    }\n    function getDeclarationName(declaration) {\n      const name = getNonAssignedNameOfDeclaration(declaration);\n      return name && (isComputedPropertyName(name) && isPropertyAccessExpression(name.expression) ? name.expression.name.text : isPropertyName(name) ? getNameFromPropertyName(name) : void 0);\n    }\n    function visit(node) {\n      switch (node.kind) {\n        case 263 /* FunctionDeclaration */:\n        case 219 /* FunctionExpression */:\n        case 175 /* MethodDeclaration */:\n        case 174 /* MethodSignature */:\n          const functionDeclaration = node;\n          const declarationName = getDeclarationName(functionDeclaration);\n          if (declarationName) {\n            const declarations = getDeclarations(declarationName);\n            const lastDeclaration = lastOrUndefined(declarations);\n            if (lastDeclaration && functionDeclaration.parent === lastDeclaration.parent && functionDeclaration.symbol === lastDeclaration.symbol) {\n              if (functionDeclaration.body && !lastDeclaration.body) {\n                declarations[declarations.length - 1] = functionDeclaration;\n              }\n            } else {\n              declarations.push(functionDeclaration);\n            }\n          }\n          forEachChild(node, visit);\n          break;\n        case 264 /* ClassDeclaration */:\n        case 232 /* ClassExpression */:\n        case 265 /* InterfaceDeclaration */:\n        case 266 /* TypeAliasDeclaration */:\n        case 267 /* EnumDeclaration */:\n        case 268 /* ModuleDeclaration */:\n        case 272 /* ImportEqualsDeclaration */:\n        case 282 /* ExportSpecifier */:\n        case 277 /* ImportSpecifier */:\n        case 274 /* ImportClause */:\n        case 275 /* NamespaceImport */:\n        case 178 /* GetAccessor */:\n        case 179 /* SetAccessor */:\n        case 188 /* TypeLiteral */:\n          addDeclaration(node);\n          forEachChild(node, visit);\n          break;\n        case 170 /* Parameter */:\n          if (!hasSyntacticModifier(node, 31 /* ParameterPropertyModifier */)) {\n            break;\n          }\n        // falls through\n        case 261 /* VariableDeclaration */:\n        case 209 /* BindingElement */: {\n          const decl = node;\n          if (isBindingPattern(decl.name)) {\n            forEachChild(decl.name, visit);\n            break;\n          }\n          if (decl.initializer) {\n            visit(decl.initializer);\n          }\n        }\n        // falls through\n        case 307 /* EnumMember */:\n        case 173 /* PropertyDeclaration */:\n        case 172 /* PropertySignature */:\n          addDeclaration(node);\n          break;\n        case 279 /* ExportDeclaration */:\n          const exportDeclaration = node;\n          if (exportDeclaration.exportClause) {\n            if (isNamedExports(exportDeclaration.exportClause)) {\n              forEach(exportDeclaration.exportClause.elements, visit);\n            } else {\n              visit(exportDeclaration.exportClause.name);\n            }\n          }\n          break;\n        case 273 /* ImportDeclaration */:\n          const importClause = node.importClause;\n          if (importClause) {\n            if (importClause.name) {\n              addDeclaration(importClause.name);\n            }\n            if (importClause.namedBindings) {\n              if (importClause.namedBindings.kind === 275 /* NamespaceImport */) {\n                addDeclaration(importClause.namedBindings);\n              } else {\n                forEach(importClause.namedBindings.elements, visit);\n              }\n            }\n          }\n          break;\n        case 227 /* BinaryExpression */:\n          if (getAssignmentDeclarationKind(node) !== 0 /* None */) {\n            addDeclaration(node);\n          }\n        // falls through\n        default:\n          forEachChild(node, visit);\n      }\n    }\n  }\n}"},{"key":"update","writable":true,"enumerable":false,"configurable":true,"value":"update(newText, textChangeRange) {\n    return updateSourceFile(this, newText, textChangeRange);\n  }"},{"key":"getLineAndCharacterOfPosition","writable":true,"enumerable":false,"configurable":true,"value":"getLineAndCharacterOfPosition(position) {\n    return getLineAndCharacterOfPosition(this, position);\n  }"},{"key":"getLineStarts","writable":true,"enumerable":false,"configurable":true,"value":"getLineStarts() {\n    return getLineStarts(this);\n  }"},{"key":"getPositionOfLineAndCharacter","writable":true,"enumerable":false,"configurable":true,"value":"getPositionOfLineAndCharacter(line, character, allowEdits) {\n    return computePositionOfLineAndCharacter(getLineStarts(this), line, character, this.text, allowEdits);\n  }"},{"key":"getLineEndOfPosition","writable":true,"enumerable":false,"configurable":true,"value":"getLineEndOfPosition(pos) {\n    const { line } = this.getLineAndCharacterOfPosition(pos);\n    const lineStarts = this.getLineStarts();\n    let lastCharPos;\n    if (line + 1 >= lineStarts.length) {\n      lastCharPos = this.getEnd();\n    }\n    if (!lastCharPos) {\n      lastCharPos = lineStarts[line + 1] - 1;\n    }\n    const fullText = this.getFullText();\n    return fullText[lastCharPos] === \"\\n\" && fullText[lastCharPos - 1] === \"\\r\" ? lastCharPos - 1 : lastCharPos;\n  }"},{"key":"getNamedDeclarations","writable":true,"enumerable":false,"configurable":true,"value":"getNamedDeclarations() {\n    if (!this.namedDeclarations) {\n      this.namedDeclarations = this.computeNamedDeclarations();\n    }\n    return this.namedDeclarations;\n  }"},{"key":"computeNamedDeclarations","writable":true,"enumerable":false,"configurable":true,"value":"computeNamedDeclarations() {\n    const result = createMultiMap();\n    this.forEachChild(visit);\n    return result;\n    function addDeclaration(declaration) {\n      const name = getDeclarationName(declaration);\n      if (name) {\n        result.add(name, declaration);\n      }\n    }\n    function getDeclarations(name) {\n      let declarations = result.get(name);\n      if (!declarations) {\n        result.set(name, declarations = []);\n      }\n      return declarations;\n    }\n    function getDeclarationName(declaration) {\n      const name = getNonAssignedNameOfDeclaration(declaration);\n      return name && (isComputedPropertyName(name) && isPropertyAccessExpression(name.expression) ? name.expression.name.text : isPropertyName(name) ? getNameFromPropertyName(name) : void 0);\n    }\n    function visit(node) {\n      switch (node.kind) {\n        case 263 /* FunctionDeclaration */:\n        case 219 /* FunctionExpression */:\n        case 175 /* MethodDeclaration */:\n        case 174 /* MethodSignature */:\n          const functionDeclaration = node;\n          const declarationName = getDeclarationName(functionDeclaration);\n          if (declarationName) {\n            const declarations = getDeclarations(declarationName);\n            const lastDeclaration = lastOrUndefined(declarations);\n            if (lastDeclaration && functionDeclaration.parent === lastDeclaration.parent && functionDeclaration.symbol === lastDeclaration.symbol) {\n              if (functionDeclaration.body && !lastDeclaration.body) {\n                declarations[declarations.length - 1] = functionDeclaration;\n              }\n            } else {\n              declarations.push(functionDeclaration);\n            }\n          }\n          forEachChild(node, visit);\n          break;\n        case 264 /* ClassDeclaration */:\n        case 232 /* ClassExpression */:\n        case 265 /* InterfaceDeclaration */:\n        case 266 /* TypeAliasDeclaration */:\n        case 267 /* EnumDeclaration */:\n        case 268 /* ModuleDeclaration */:\n        case 272 /* ImportEqualsDeclaration */:\n        case 282 /* ExportSpecifier */:\n        case 277 /* ImportSpecifier */:\n        case 274 /* ImportClause */:\n        case 275 /* NamespaceImport */:\n        case 178 /* GetAccessor */:\n        case 179 /* SetAccessor */:\n        case 188 /* TypeLiteral */:\n          addDeclaration(node);\n          forEachChild(node, visit);\n          break;\n        case 170 /* Parameter */:\n          if (!hasSyntacticModifier(node, 31 /* ParameterPropertyModifier */)) {\n            break;\n          }\n        // falls through\n        case 261 /* VariableDeclaration */:\n        case 209 /* BindingElement */: {\n          const decl = node;\n          if (isBindingPattern(decl.name)) {\n            forEachChild(decl.name, visit);\n            break;\n          }\n          if (decl.initializer) {\n            visit(decl.initializer);\n          }\n        }\n        // falls through\n        case 307 /* EnumMember */:\n        case 173 /* PropertyDeclaration */:\n        case 172 /* PropertySignature */:\n          addDeclaration(node);\n          break;\n        case 279 /* ExportDeclaration */:\n          const exportDeclaration = node;\n          if (exportDeclaration.exportClause) {\n            if (isNamedExports(exportDeclaration.exportClause)) {\n              forEach(exportDeclaration.exportClause.elements, visit);\n            } else {\n              visit(exportDeclaration.exportClause.name);\n            }\n          }\n          break;\n        case 273 /* ImportDeclaration */:\n          const importClause = node.importClause;\n          if (importClause) {\n            if (importClause.name) {\n              addDeclaration(importClause.name);\n            }\n            if (importClause.namedBindings) {\n              if (importClause.namedBindings.kind === 275 /* NamespaceImport */) {\n                addDeclaration(importClause.namedBindings);\n              } else {\n                forEach(importClause.namedBindings.elements, visit);\n              }\n            }\n          }\n          break;\n        case 227 /* BinaryExpression */:\n          if (getAssignmentDeclarationKind(node) !== 0 /* None */) {\n            addDeclaration(node);\n          }\n        // falls through\n        default:\n          forEachChild(node, visit);\n      }\n    }\n  }"}]}):null;
const __runtimeImportOps=__runtimeImportInitial?{get:Object.getOwnPropertyDescriptor,keys:Reflect.ownKeys,parent:Object.getPrototypeOf,own:Object.hasOwn,apply:Reflect.apply,define:Object.defineProperty,proxy:types.isProxy,Map,getMap:Map.prototype.get,setMap:Map.prototype.set,clear:Map.prototype.clear,freeze:Object.freeze}:null;
let __runtimeImportActive=null;
function runtimeImportDescriptorSame(a,b){return !!a&&!!b&&a.value===b.value&&a.get===b.get&&a.set===b.set&&a.writable===b.writable&&a.enumerable===b.enumerable&&a.configurable===b.configurable;}
function runtimeImportBootstrap(budget){
 const bad=reason=>{budget.reason=reason;return null;};
 const o=__runtimeImportOps;if(!o||!originalPrivateParserIngressUnchanged()||!originalNamespaceTraversalIntrinsicsUnchanged()||!originalDataFreezeIntrinsicsUnchanged()||!originalStaticSourceIntrinsicsUnchanged())return bad('initial-native-operations');
 const ts=ownershipCompiler();if(!ownershipCompilerRuntimeNativeCurrent(ts))return bad('native-loader-function-identity');if(ts.version!=='5.9.3'||o.proxy(ts))return bad('compiler-native-shape');
 const rows=[],seen=[];
 function capture(owner,tag,selected){
  if(!owner||typeof owner!=='object'&&typeof owner!=='function'||o.proxy(owner))return false;
  if(seen.includes(owner))return true;seen.push(owner);
  const names=selected??o.keys(owner),fields=[];for(const key of names){const field=o.get(owner,key);if(!field)return false;fields.push(field);}
  const expected=__runtimeImportPins[tag];if(expected){
   if(expected.length!==names.length)return false;
   for(let at=0;at<names.length;at++){const row=expected[at],field=fields[at];if(row.key!==names[at]||field.writable!==row.writable||field.enumerable!==row.enumerable||field.configurable!==row.configurable)return false;if(row.primitive&&!(row.primitive.type===typeof field.value&&(row.primitive.type==='undefined'||field.value===row.primitive.value)))return false;for(const kind of ['value','get','set'])if(typeof field[kind]==='function'?(o.proxy(field[kind])||originalCapturedFunctionSource(field[kind])!==row[kind]&&!(kind==='value'&&row.nativeNoop!==undefined&&field[kind]===ts.noop&&originalCapturedFunctionSource(field[kind])===row.nativeNoop)):row[kind]!==undefined)return false;}
  }
  rows.push({owner,tag,names,fields,parent:o.parent(owner),selected:!!selected});return true;
 }
 const top=['noop','createSourceFile','isImportDeclaration','isExportDeclaration','forEachChild','forEachChildRecursively','setParentRecursive','setParent','isJSDocNode','ScriptKind','ScriptTarget','Debug','objectAllocator','performance','tracing'];if(!capture(ts,'compiler',top))return bad('compiler-fields');
 const debug=ts.Debug,allocator=ts.objectAllocator,performance=ts.performance;
 for(const [owner,tag]of [[ts.ScriptKind,'ScriptKind'],[ts.ScriptTarget,'ScriptTarget'],[debug,'Debug'],[allocator,'allocator'],[performance,'performance']])if(!capture(owner,tag))return bad('native-object:'+tag);
 if(debug.loggingHost!==undefined&&!capture(debug.loggingHost,'loggingHost'))return bad('native-object:loggingHost');
 const getLevel=debug.getAssertionLevel,isEnabled=performance.isEnabled;if(typeof getLevel!=='function'||typeof isEnabled!=='function')return bad('native-state-readers');
 if(ts.tracing!==undefined||o.apply(isEnabled,performance,[])!==false||o.apply(getLevel,debug,[])!==0||debug.isDebugging!==false)return bad('tracing-performance-debug-state');
 for(const name of ['getNodeConstructor','getTokenConstructor','getIdentifierConstructor','getPrivateIdentifierConstructor','getSourceFileConstructor']){
  const method=allocator[name];if(typeof method!=='function')return bad('allocator-method:'+name);const ctor=o.apply(method,allocator,[]);if(typeof ctor!=='function'||!capture(ctor,'ctor:'+name))return bad('allocator-constructor:'+name);
  let owner=ctor.prototype,depth=0;while(owner!==null){if(++depth>8||!capture(owner,'prototype:'+name+':'+depth))return bad('allocator-prototype:'+name+':'+depth);owner=o.parent(owner);}
 }
 for(const owner of [Object.prototype,Array.prototype,Map.prototype,Function.prototype,String.prototype])if(!capture(owner,'intrinsic'))return bad('global-intrinsic');
 return {ts,rows,debug,performance,getLevel,isEnabled};
}
function runtimeImportNativeCurrent(n){
 const o=__runtimeImportOps;if(!n||!originalPrivateParserIngressUnchanged()||!originalNamespaceTraversalIntrinsicsUnchanged()||!originalDataFreezeIntrinsicsUnchanged()||!originalStaticSourceIntrinsicsUnchanged()||ownershipCompiler()!==n.ts||!ownershipCompilerRuntimeNativeCurrent(n.ts))return false;
 for(const row of n.rows){if(o.proxy(row.owner)||o.parent(row.owner)!==row.parent)return false;const names=row.selected?row.names:o.keys(row.owner);if(names.length!==row.names.length)return false;for(let at=0;at<names.length;at++){if(names[at]!==row.names[at])return false;const actual=o.get(row.owner,names[at]),birth=row.fields[at];if(runtimeImportDescriptorSame(actual,birth))continue;const expected=row.tag==='Debug'?__runtimeImportPins.Debug[at]:null;if(!expected?.nativeNoop||!actual||!birth||!o.own(actual,'value')||!o.own(birth,'value')||typeof birth.value!=='function'||actual.value!==n.ts.noop||actual.get!==birth.get||actual.set!==birth.set||actual.writable!==birth.writable||actual.enumerable!==birth.enumerable||actual.configurable!==birth.configurable)return false;}}
 return n.ts.tracing===undefined&&o.apply(n.isEnabled,n.performance,[])===false&&o.apply(n.getLevel,n.debug,[])===0&&n.debug.isDebugging===false;
}
function runtimeImportDisable(frame){
 for(let value=frame;value;value=value.parent){value.disabled=true;if(value.entries)__runtimeImportOps.apply(__runtimeImportOps.clear,value.entries,[]);value.entries=null;}
}
function runtimeImportEpoch(ts){
 const frame=__runtimeImportActive;if(!frame||!frame.open||frame.disabled)return null;
 const budget=frame.budget;if(!budget.attempted){budget.attempted=true;try{budget.native=runtimeImportBootstrap(budget);}catch{budget.reason='native-bootstrap-refused';budget.native=null;}}
 const native=budget.native;if(!native||native.ts!==ts||!runtimeImportNativeCurrent(native)){runtimeImportDisable(frame);return null;}
 return {frame,native,open:true,complete:false};
}
function runtimeImportEpochClose(epoch){
 if(!epoch)return;epoch.open=false;
 if(!epoch.complete||!runtimeImportNativeCurrent(epoch.native))runtimeImportDisable(epoch.frame);
 epoch.frame=null;epoch.native=null;
}
function runtimeImportEpochReturn(epoch,value){if(epoch)epoch.complete=true;return value;}
function runtimeImportEpochUsable(epoch){if(!epoch||!epoch.open||epoch.frame!==__runtimeImportActive||!epoch.frame.open||epoch.frame.disabled)return false;if(!runtimeImportNativeCurrent(epoch.native)){runtimeImportDisable(epoch.frame);return false;}return true;}
function runtimeImportParsed(ts,path,source,epoch){
 if(!runtimeImportEpochUsable(epoch))return parsed(ts,path,source);
 const frame=epoch.frame,o=__runtimeImportOps,cached=frame.entries?o.apply(o.getMap,frame.entries,[path]):undefined;
 if(cached&&cached.source===source){frame.hits++;return runtimeParsedWithoutParents(ts,path,source);}
 frame.misses++;const budget=frame.budget;budget.rows++;budget.units+=path.length+source.length;
 if(budget.rows>256||budget.units>2097152)runtimeImportDisable(frame);
 // Every first actual use retains the complete original true-parent parse.
 return parsed(ts,path,source);
}
function runtimeImportComplete(ts,path,source,file,epoch){
 if(!runtimeImportEpochUsable(epoch))return;const frame=epoch.frame,o=__runtimeImportOps,cached=frame.entries?o.apply(o.getMap,frame.entries,[path]):undefined;
 if(cached&&cached.source===source)return;const edges=[];
 // The first native parse and complete original recursive namespace walk have
 // already finished. Only primitive specifier strings enter the dictionary.
 for(const node of file.statements)if((ts.isImportDeclaration(node)||ts.isExportDeclaration(node))&&node.moduleSpecifier){
  const text=node.moduleSpecifier.text;if(typeof text!=='string'){runtimeImportDisable(frame);return;}
  if(++frame.budget.edges>16384){runtimeImportDisable(frame);return;}
  o.define(edges,''+edges.length,{value:text,writable:true,enumerable:true,configurable:true});
 }
 if(!frame.entries)frame.entries=new o.Map();
 o.apply(o.setMap,frame.entries,[path,{source,edges:o.freeze(edges)}]);frame.stores++;
}
function runtimeImportSynchronous(value){
 const o=__runtimeImportOps;let depth=0;
 while(value!==null&&(typeof value==='object'||typeof value==='function')){
  if(++depth>160||o.proxy(value))throw new TypeError('Runtime import DATA scope requires an ordinary synchronous result');
  if(o.get(value,'then'))throw new TypeError('Runtime import DATA scope refuses Promise and thenable results');value=o.parent(value);
 }
}
export function withOwnedRuntimeImportEdges(run){
 if(typeof run!=='function')throw new TypeError('Runtime import DATA scope requires its synchronous callback');
 const o=__runtimeImportOps;if(o&&o.proxy(run))throw new TypeError('Runtime import DATA scope refuses proxy callbacks');
 const prior=__runtimeImportActive,frame={open:true,parent:prior,disabled:!!prior?.disabled,entries:null,budget:prior?prior.budget:{rows:0,units:0,edges:0,native:null,attempted:false,reason:null},hits:0,misses:0,stores:0};__runtimeImportActive=frame;
 let completed=false;try{const value=run();if(!originalPrivateParserIngressUnchanged()||!originalNamespaceTraversalIntrinsicsUnchanged()||!originalStaticSourceIntrinsicsUnchanged()||frame.budget.native&&!runtimeImportNativeCurrent(frame.budget.native))runtimeImportDisable(frame);if(o&&!frame.disabled)runtimeImportSynchronous(value);completed=true;return value;}
 finally{if(!completed)runtimeImportDisable(frame);if(frame.budget.native&&!runtimeImportNativeCurrent(frame.budget.native))runtimeImportDisable(frame);frame.open=false;if(frame.entries)o.apply(o.clear,frame.entries,[]);frame.entries=null;frame.parent=null;if(!prior){if(frame.budget.native)frame.budget.native.rows.length=0;frame.budget.native=null;}__runtimeImportActive=prior;}
}
export function ownedRuntimeImportEdgeFacts(){
 const frame=__runtimeImportActive;if(!frame)return {active:false,disabled:false,hits:0,misses:0,stores:0,rows:0,sourceUnits:0,edges:0,reason:null};
 return {active:frame.open,disabled:frame.disabled,hits:frame.hits,misses:frame.misses,stores:frame.stores,rows:frame.budget.rows,sourceUnits:frame.budget.units,edges:frame.budget.edges,reason:frame.budget.reason};
}


export function ownedSourcePath(path){
 if(typeof path!=='string'||path.length>1024||path.startsWith('/')||path.includes('\\')||path.includes(':')||/[\x00-\x1f]/u.test(path)||path.split('/').some(p=>!p||p==='.'||p==='..'))fail('invalid relative path');
 return path;
}
export function ownedPlainData(input){
 let cells=0,units=0;const active=new Set();
 function visit(value,depth){
  if(++cells>100000||depth>160)fail('data budget');
  if(value===null||typeof value==='boolean'||typeof value==='number')return value;
  if(typeof value==='string'){units+=value.length;if(units>16777216)fail('source budget');return value;}
  if(typeof value!=='object'||types.isProxy(value)||active.has(value))fail('non-data input');
  const array=Array.isArray(value),parent=Object.getPrototypeOf(value);
  if(array?parent!==Array.prototype:parent!==Object.prototype&&parent!==null)fail('foreign data prototype');
  const keys=Reflect.ownKeys(value);if(keys.some(k=>typeof k!=='string'||k==='stack'))fail('unknown data key');
  const fields=Object.getOwnPropertyDescriptors(value);
  for(const key of keys)if(!Object.hasOwn(fields[key],'value'))fail('data accessor');
  active.add(value);let result;
  if(array){const n=fields.length.value;if(!Number.isSafeInteger(n)||n<0||n>4096||keys.length!==n+1)fail('dense array required');result=[];for(let i=0;i<n;i++){if(!Object.hasOwn(fields,String(i)))fail('sparse array');result.push(visit(fields[i].value,depth+1));}}
  else{result={};for(const key of keys)Object.defineProperty(result,key,{value:visit(fields[key].value,depth+1),enumerable:true,writable:true,configurable:true});}
  active.delete(value);return result;
 }
 return visit(input,0);
}
function exactKeys(value,keys){if(Object.keys(value).sort().join('\0')!==[...keys].sort().join('\0'))fail('unknown source record field');}
function parsed(ts,path,source){
 const file=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,path.endsWith('.ts')||path.endsWith('.mts')?ts.ScriptKind.TS:ts.ScriptKind.JS);
 if(file.parseDiagnostics.length)fail('native source syntax: '+path);return file;
}
function relative(from,specifier){
 if(!specifier.startsWith('./')&&!specifier.startsWith('../'))fail('nonrelative source import');
 const name=posix.normalize(posix.join(posix.dirname(from),specifier));ownedSourcePath(name);return name;
}
/** Complete registered static runtime closure, freshly read on each operation. */
export function ownedCoreRuntimeSources(runtimeRoot='runtime',declarationRoot=runtimeRoot){
 ownedSourcePath(runtimeRoot);ownedSourcePath(declarationRoot);assertReverseConcreteSourceHost();const ts=ownershipCompiler(),assets=hostRuntimeAssets(),rows=[],seen=new Set();
 const __runtimeEpoch=runtimeImportEpoch(ts);try{

 function visit(name){
  if(seen.has(name))return;if(seen.size>=128||name.includes('/')||!name.endsWith('.mjs')&&!name.endsWith('.mts'))fail('runtime closure bounds');seen.add(name);
  const source=assets.get(name);if(typeof source!=='string')fail('unregistered materialized asset: '+name);const base=name.endsWith('.mts')?declarationRoot:runtimeRoot,path=base+'/'+name,file=runtimeImportParsed(ts,path,source,__runtimeEpoch);rows.push({path,source});
  for(const node of file.statements)if((ts.isImportDeclaration(node)||ts.isExportDeclaration(node))&&node.moduleSpecifier){
   const specifier=node.moduleSpecifier.text;if(specifier==='node:util'||specifier==='node:crypto')continue;
   const target=relative(path,specifier);if(posix.dirname(target)!==base)fail('runtime closure escape');visit(posix.basename(target));
  }
 runtimeImportComplete(ts,path,source,file,__runtimeEpoch);
 }
 for(const name of ['json-update-runtime.mjs','json-update-runtime.d.mts','json-macro-runtime.mjs','json-macro-runtime.d.mts','base64-runtime.mjs','base64-runtime.d.mts','json-runtime.d.mts','json-option-runtime.mjs','json-option-runtime.d.mts','json-collections-runtime.mjs','json-collections-runtime.d.mts','json-iteration-runtime.mjs','json-iteration-runtime.d.mts','json-state-runtime.mjs','json-state-runtime.d.mts','json-fields-runtime.mjs','json-fields-runtime.d.mts','owned-outcome-runtime.mjs','owned-outcome-runtime.d.mts'])visit(name);
 for(const [name,source]of assets)if(/LICENSE|NOTICE/iu.test(name))rows.push({path:runtimeRoot+'/'+name,source});
 assertReverseConcreteSourceHost();return runtimeImportEpochReturn(__runtimeEpoch,rows.sort((a,b)=>a.path.localeCompare(b.path)));

 }finally{runtimeImportEpochClose(__runtimeEpoch);}
}
// Separate additive closure. The original runtime-source API and old contexts
// do not acquire new required files or a broader string-iterator operation set.
export function ownedCoreAsciiRuntimeSources(runtimeRoot='runtime',declarationRoot=runtimeRoot){
 ownedSourcePath(runtimeRoot);ownedSourcePath(declarationRoot);assertReverseConcreteSourceHost();const ts=ownershipCompiler(),assets=hostCoreAsciiRuntimeAssets(),rows=[],seen=new Set();
 const __runtimeEpoch=runtimeImportEpoch(ts);try{

 function visit(name){
  if(seen.has(name))return;if(seen.size>=128||name.includes('/')||!name.endsWith('.mjs')&&!name.endsWith('.mts'))fail('ASCII runtime closure bounds');seen.add(name);
  const source=assets.get(name);if(typeof source!=='string')fail('unregistered ASCII materialized asset: '+name);const base=name.endsWith('.mts')?declarationRoot:runtimeRoot,path=base+'/'+name,file=runtimeImportParsed(ts,path,source,__runtimeEpoch);rows.push({path,source});if(declarationRoot!==runtimeRoot)rows.push({path:(name.endsWith('.mts')?runtimeRoot:declarationRoot)+'/'+name,source});
  for(const node of file.statements)if((ts.isImportDeclaration(node)||ts.isExportDeclaration(node))&&node.moduleSpecifier){
   const specifier=node.moduleSpecifier.text;if(specifier==='node:util'||specifier==='node:crypto')continue;
   const target=relative(path,specifier);if(posix.dirname(target)!==base)fail('ASCII runtime closure escape');visit(posix.basename(target));
  }
 runtimeImportComplete(ts,path,source,file,__runtimeEpoch);
 }
 for(const name of ['string-iterator-runtime.mjs','string-iterator-runtime.d.mts'])visit(name);
 assertReverseConcreteSourceHost();return runtimeImportEpochReturn(__runtimeEpoch,rows.sort((a,b)=>a.path.localeCompare(b.path)));

 }finally{runtimeImportEpochClose(__runtimeEpoch);}
}
function rustEdge(files){
 const source=files.get('src/lib.rs');if(typeof source!=='string')fail('complete actual Rust root required');
 const views=captureSourceModuleViews({source,sourcePath:'src/lib.rs'}),items=originalModuleViewItems(views.views[0],source);
 const declarations=items.filter(item=>item.term==='mod'&&item.name==='translation_core');
 if(declarations.length!==1||source.slice(declarations[0].start,declarations[0].end).trim()!=='pub mod translation_core;')fail('actual public Rust facade edge required');
 if(items.some(item=>item.term==='use'&&item.tokens.some(token=>token.text==='translation_core')))fail('competing Rust facade import');
 if(files.get('src/translation_core.rs')!==ROUTER_FORMATTING_FACADE_SOURCE||files.get('src/translation_core/primitives.rs')!==ROUTER_CORE_PRIMITIVES_SOURCE)fail('complete owned Rust sources differ');
 if(typeof files.get('Cargo.toml')!=='string'||typeof files.get('Cargo.lock')!=='string')fail('complete receiving Cargo sources required');
 const dependencies=jsonMacroDependencyProfile({manifest:files.get('Cargo.toml'),lock:files.get('Cargo.lock')}).proof;
 if(!dependencies)fail('actual locked JSON source profile required');const features=proveJsonMacroFeatures(dependencies);
 const modules=[{file:'src/lib.rs',path:[],source,sourceView:views.views[0],configurationCondition:views.views[0].configurationCondition}];
 for(const [path,name]of [['src/translation_core.rs',['translation_core']],['src/translation_core/primitives.rs',['translation_core','primitives']]]){
  const text=files.get(path),capture=captureSourceModuleViews({source:text,sourcePath:path}),sourceView=capture.views[0];
  modules.push({file:path,path:name,source:text,sourceView,configurationCondition:sourceView.configurationCondition});
 }
 const evidence=resolveModuleBindings({modules}),selected=selectOriginalRouterCoreFacade({modules,sourceScopes:evidence.scopes,compilationProfile:evidence.compilationProfile});
 return {path:selected.rootFile,span:[...selected.span],dependencyDigest:dependencies.digest,features:[...features.features],bindingDiagnostics:evidence.diagnostics};
}
// Full fixed native library sources are rejoined for every selected base64 use.
// These bytes establish the explicit library-unit ABI, not Engine permission.
function base64Source(files){
 if(files.get('src/translation_core/base64.rs')!==ROUTER_CORE_BASE64_SOURCE)fail('complete owned base64 leaf required');
 const concrete=transportConcreteSyntaxSource(files.get('src/translation_core/base64.rs'),{language:'Rust'});
 if(concrete.source!==ROUTER_CORE_BASE64_SOURCE)fail('complete base64 native CST source differs');
 const capture=captureSourceModuleViews({source:concrete.source,sourcePath:'src/translation_core/base64.rs'}),functions=originalModuleViewItems(capture.views[0],concrete.source).filter(item=>item.term==='fn');
 if(functions.length!==13||functions.some(item=>!ownedBase64Operation('router_core_'+item.name)))fail('actual complete base64 source operations differ');
 const proof=deriveDependencyProfile({manifest:files.get('Cargo.toml'),lock:files.get('Cargo.lock')}).proof;
 if(!proof)fail('actual locked base64 dependency required');
 const actual=originalExternalTraitPackageInputs(captureOriginalExternalTraitPackage(proof,'base64'));
 if(actual.dependency.package!=='base64'||actual.dependency.version!=='0.23.1')fail('actual base64 package source required');
 return actual;
}
/** Fresh source selection; no source/owner/verdict is shared across calls. */
export function createOwnedCoreSourceContext(input){
 assertReverseConcreteSourceHost();const __asciiSourceHas=Map.prototype.has,__asciiSourceApply=Reflect.apply;const data=ownedPlainData(input);exactKeys(data,['files','runtimeRoot','declarationRoot']);ownedSourcePath(data.runtimeRoot);ownedSourcePath(data.declarationRoot);
 if(!Array.isArray(data.files)||!data.files.length||data.files.length>4096)fail('complete files required');
 const files=new Map();let bytes=0;
 for(const row of data.files){exactKeys(row,['path','source']);ownedSourcePath(row.path);if(typeof row.source!=='string'||files.has(row.path))fail('duplicate or invalid source');bytes+=Buffer.byteLength(row.source);if(bytes>16777216)fail('complete input byte budget');files.set(row.path,row.source);}
 const expected=(__asciiSourceApply(__asciiSourceHas,files,[data.runtimeRoot+'/string-iterator-runtime.mjs'])?ownedCoreAsciiBaseRuntimeSources:ownedCoreRuntimeSources)(data.runtimeRoot,data.declarationRoot);
 for(const row of expected)if(files.get(row.path)!==row.source)fail('registered materialized runtime differs: '+row.path);
 if(files.has(data.runtimeRoot+'/string-iterator-runtime.mjs'))for(const row of ownedCoreAsciiRuntimeSources(data.runtimeRoot,data.declarationRoot))if(files.get(row.path)!==row.source)fail('registered ASCII materialized runtime differs: '+row.path);
 const edge=rustEdge(files);requireOwnedCollectionLeaf(files);
 const receipts=data.files.map(row=>({path:row.path,source:row.source,sha256:digest(row.source)}));
 const handle=Object.freeze({schema:'owned-core-source-context-v1'});
 contexts.set(handle,{data,files,receipts,edge});requireOwnedCoreSourceCurrent(handle);return handle;
}
export function requireOwnedCoreSourceCurrent(handle){
 assertReverseConcreteSourceHost();const __asciiSourceHas=Map.prototype.has,__asciiSourceApply=Reflect.apply;const state=contexts.get(handle);if(!state)fail('unissued source context');
 for(const row of state.receipts)if(digest(row.source)!==row.sha256||state.files.get(row.path)!==row.source)fail('source receipt differs');
 for(const row of (__asciiSourceApply(__asciiSourceHas,state.files,[state.data.runtimeRoot+'/string-iterator-runtime.mjs'])?ownedCoreAsciiBaseRuntimeSources:ownedCoreRuntimeSources)(state.data.runtimeRoot,state.data.declarationRoot))if(state.files.get(row.path)!==row.source)fail('current runtime differs');
 if(state.files.has(state.data.runtimeRoot+'/string-iterator-runtime.mjs'))for(const row of ownedCoreAsciiRuntimeSources(state.data.runtimeRoot,state.data.declarationRoot))if(state.files.get(row.path)!==row.source)fail('current ASCII runtime differs');
 rustEdge(state.files);requireOwnedCollectionLeaf(state.files);if(state.files.has('src/translation_core/base64.rs')&&state.files.get('src/translation_core/base64.rs')!==ROUTER_CORE_BASE64_SOURCE)fail('current base64 leaf differs');assertReverseConcreteSourceHost();
}
/** Detached full original data, used to reconstruct private authority on read. */
export function ownedCoreSourceData(handle){requireOwnedCoreSourceCurrent(handle);return ownedPlainData(contexts.get(handle).data);}
// Native AST/Program/checker storage is confined to a single fresh traversal.
// Neither the receiving handle nor issued emission facts retains it.
function originalOwnedCoreModule(handle,path){
 requireOwnedCoreSourceCurrent(handle);const state=contexts.get(handle);ownedSourcePath(path);const ts=ownershipCompiler(),syntax=new Map();
 for(const [name,source]of state.files)if(/\.(?:mjs|mts|ts)$/u.test(name))syntax.set(name,parsed(ts,name,source));
 const file=syntax.get(path);if(!file)fail('actual original module absent');
 const host={getSourceFile:name=>syntax.get(name),getDefaultLibFileName:()=>'',writeFile:()=>{},getCurrentDirectory:()=>'',getDirectories:()=>[],fileExists:name=>syntax.has(name),readFile:name=>state.files.get(name),getCanonicalFileName:name=>name,useCaseSensitiveFileNames:()=>true,getNewLine:()=> '\n',resolveModuleNames:(names,from)=>names.map(name=>{
  if(!name.startsWith('.'))return undefined;const target=relative(from,name),declaration=target.replace(/\.mjs$/u,'.d.mts');
  const paired=posix.dirname(target)===state.data.runtimeRoot?state.data.declarationRoot+'/'+posix.basename(declaration):declaration;
  const selected=syntax.has(declaration)?declaration:syntax.has(paired)?paired:target;return syntax.has(selected)?{resolvedFileName:selected,extension:selected.endsWith('.d.mts')?ts.Extension.Dmts:selected.endsWith('.mts')?ts.Extension.Mts:selected.endsWith('.ts')?ts.Extension.Ts:ts.Extension.Mjs}:undefined;
 })};
 const program=ts.createProgram([...syntax.keys()],{allowJs:true,checkJs:true,noLib:true,module:ts.ModuleKind.NodeNext,moduleResolution:ts.ModuleResolutionKind.NodeNext,target:ts.ScriptTarget.ES2022},host);
 if(program.getSyntacticDiagnostics(file).length)fail('native source syntax: '+path);
 const traversal={ts,syntax,file,source:state.files.get(path),checker:program.getTypeChecker(),runtimeRoot:state.data.runtimeRoot};
 traversals.set(traversal,{handle,state});return traversal;
}
function pairedFunction(handle,path,declaration,analysis){
 const privateState=traversals.get(analysis);if(privateState?.handle!==handle)fail('foreign paired traversal');
 const {state}=privateState;
 if(analysis.pairedTypes===undefined){
  const target=ownedCorePairedTypePath(path,state.files,state.data.runtimeRoot,state.data.declarationRoot);
  analysis.pairedTypes=target===null?null:prepareOwnedCorePairedTypes(path,analysis.source,target,state.files.get(target));
 }
 const pair=analysis.pairedTypes;if(!pair)return null;
 const span=[declaration.getStart(analysis.file),declaration.end],selected=pair.functions.filter(item=>item.javascriptSpan[0]===span[0]&&item.javascriptSpan[1]===span[1]);
 if(selected.length!==1)fail('actual paired function span differs');
 const evidence=selected[0],file=analysis.syntax.get(pair.typescript.path);
 if(!file||file.text!==pair.typescript.source)fail('complete paired original source differs');
 const nodes=file.statements.filter(node=>analysis.ts.isFunctionDeclaration(node)&&node.getStart(file)===evidence.typescriptSpan[0]&&node.end===evidence.typescriptSpan[1]);
 if(nodes.length!==1||nodes[0].name.text!==declaration.name.text)fail('actual paired native declaration differs');
 const typed={...analysis,file,source:file.text};traversals.set(typed,{handle,state,paired:true});
 return {declaration:nodes[0],analysis:typed,evidence,pair};
}
function originalImportTarget(from,specifier,analysis,state){
 const target=relative(from,specifier),families=['json-update-runtime.mjs','json-macro-runtime.mjs','base64-runtime.mjs','json-runtime.mjs','json-option-runtime.mjs','string-iterator-runtime.mjs','json-collections-runtime.mjs','json-iteration-runtime.mjs','json-state-runtime.mjs','json-fields-runtime.mjs','owned-outcome-runtime.mjs'];
 if(posix.dirname(target)===state.data.declarationRoot&&families.includes(posix.basename(target))){
  const runtime=state.data.runtimeRoot+'/'+posix.basename(target),paired=traversals.get(analysis)?.paired,direct=analysis.file.scriptKind===analysis.ts.ScriptKind.TS;
  if(paired||direct){
   if(typeof state.files.get(runtime)!=='string'||state.files.has(target)&&state.files.get(target)!==state.files.get(runtime)||direct&&!state.files.has(target))fail('complete actual TypeScript runtime counterpart differs');
   return runtime;
  }
 }
 return target;
}
/** Resolve an actual source import symbol, including only exact named reexports. */
function originalOwnedCoreImport(handle,path,node,analysis){
 const {file,ts,checker,syntax}=analysis,privateState=traversals.get(analysis);assertReverseConcreteSourceHost();const state=contexts.get(handle);
 if(!privateState||privateState.handle!==handle||privateState.state!==state||file.fileName!==path)fail('foreign source traversal');
 if(!ts.isIdentifier(node))fail('direct original imported call required');
 const symbol=checker.getSymbolAtLocation(node),declarations=symbol?.declarations;
 if(!declarations||declarations.length!==1||!ts.isImportSpecifier(declarations[0]))fail('callee is not the actual import symbol');
 const spec=declarations[0],declaration=spec.parent.parent.parent;
 if(declaration.getSourceFile()!==file||!ts.isStringLiteral(declaration.moduleSpecifier))fail('foreign import declaration');
 let target=originalImportTarget(path,declaration.moduleSpecifier.text,analysis,state),name=(spec.propertyName??spec.name).text,ownerFile=file,ownerDeclaration=declaration;const links=[];
 for(let depth=0;depth<32;depth++){
  const source=state.files.get(target);if(source===undefined)fail('import target missing');links.push({path:target,name,source,from:{path:ownerFile.fileName,span:[ownerDeclaration.getStart(ownerFile),ownerDeclaration.end]}});
  if(target===state.data.runtimeRoot+'/json-update-runtime.mjs'||target===state.data.runtimeRoot+'/json-macro-runtime.mjs'||target===state.data.runtimeRoot+'/base64-runtime.mjs'||target===state.data.runtimeRoot+'/json-runtime.mjs'||target===state.data.runtimeRoot+'/json-option-runtime.mjs'||target===state.data.runtimeRoot+'/string-iterator-runtime.mjs'||target===state.data.runtimeRoot+'/json-collections-runtime.mjs'||target===state.data.runtimeRoot+'/json-iteration-runtime.mjs'||target===state.data.runtimeRoot+'/json-state-runtime.mjs'||target===state.data.runtimeRoot+'/json-fields-runtime.mjs'||target===state.data.runtimeRoot+'/owned-outcome-runtime.mjs'){
   if(target===state.data.runtimeRoot+'/string-iterator-runtime.mjs'&&!ownedAsciiOperation(name))fail('unregistered ASCII runtime export');
   if(target===state.data.runtimeRoot+'/owned-outcome-runtime.mjs'){if(!ownedOutcomeOperation(name))fail('unregistered actual carrier operation');requireOwnedOutcomeSources(state.files,state.data);}
   if(target===state.data.runtimeRoot+'/json-fields-runtime.mjs'){if(!ownedJsonFieldOperation(name))fail('unregistered JSON field runtime export');requireOwnedJsonFieldSources(state.files,state.data);}
   const typesOnly=spec.isTypeOnly||declaration.importClause?.isTypeOnly;
   const actual=typesOnly?syntax.get(state.data.declarationRoot+'/'+posix.basename(target).replace(/\.mjs$/u,'.d.mts')):syntax.get(target);
   const exported=actual?.statements.some(item=>item.modifiers?.some(mod=>mod.kind===ts.SyntaxKind.ExportKeyword)&&((item.name?.text===name)||(ts.isVariableStatement(item)&&item.declarationList.declarations.some(node=>ts.isIdentifier(node.name)&&node.name.text===name))));
   if(!exported)fail('original runtime has no such export');return {target,name,links,local:node.text};
  }
  const next=syntax.get(target);if(!next||next.statements.length!==1)fail('only a single transparent reexport declaration');let selected=null;
  for(const item of next.statements){
   if(!ts.isExportDeclaration(item)||!item.moduleSpecifier||!item.exportClause||!ts.isNamedExports(item.exportClause))fail('nontransparent reexport module');
   for(const leaf of item.exportClause.elements){if(leaf.name.text!==name)fail('extra reexport requires independent source closure');if(leaf.name.text===name){if(selected)fail('competing export');selected={target:relative(target,item.moduleSpecifier.text),name:(leaf.propertyName??leaf.name).text,owner:item,file:next};}}
  }
  if(!selected)fail('export not found');target=selected.target;name=selected.name;ownerDeclaration=selected.owner;ownerFile=selected.file;
 }
 fail('reexport depth');
}

function originalOwnedCoreType(handle,path,type,analysis){
 const {ts,file}=analysis,privateState=traversals.get(analysis);if(privateState?.handle!==handle)fail('foreign type traversal');const state=privateState.state;
 if(!type)fail('written input domain required');
 const stateType=ownedStateWrittenType(ts,type,analysis,node=>originalOwnedCoreImport(handle,path,node,analysis));if(stateType!==null)return stateType;
 if(type.kind===ts.SyntaxKind.StringKeyword)return 'str';
 if(type.kind===ts.SyntaxKind.BooleanKeyword)return 'bool';
 if(ownedBase64ReadonlyOctets(ts,type))return 'bytes-ref';
 const list=ts.isTypeOperatorNode(type)&&type.operator===ts.SyntaxKind.ReadonlyKeyword?type.type:type;
 if(ts.isArrayTypeNode(list)&&originalOwnedCoreType(handle,path,list.elementType,analysis)==='json-ref')return 'json-list-ref';

 if(ts.isTypeReferenceNode(type)&&ts.isIdentifier(type.typeName)&&type.typeName.text!=='ReturnType'){
  const binding=originalOwnedCoreImport(handle,path,type.typeName,analysis);
  if(binding.target===state.data.runtimeRoot+'/json-macro-runtime.mjs'&&binding.name==='JsonValue'&&!type.typeArguments)return 'json-ref';
  if(binding.target===state.data.runtimeRoot+'/base64-runtime.mjs'&&!type.typeArguments){if(binding.name==='Base64Error')return 'base64-error-ref';if(binding.name==='Base64Result')return 'base64-result';}
 }
 if(ts.isImportTypeNode(type)&&!type.isTypeOf&&ts.isLiteralTypeNode(type.argument)&&ts.isStringLiteral(type.argument.literal)&&type.qualifier?.text==='JsonValue'&&!type.typeArguments){
  if(originalImportTarget(path,type.argument.literal.text,analysis,state)!==state.data.runtimeRoot+'/json-macro-runtime.mjs')fail('unregistered type import');return 'json-ref';
 }
 if(ts.isTypeReferenceNode(type)&&ts.isIdentifier(type.typeName)&&type.typeName.text==='ReturnType'&&type.typeArguments?.length===1){
  if(analysis.checker.getSymbolAtLocation(type.typeName)?.declarations?.length)fail('shadowed ReturnType type');
  const query=type.typeArguments[0];if(ts.isTypeQueryNode(query)&&ts.isIdentifier(query.exprName)){
   const binding=originalOwnedCoreImport(handle,path,query.exprName,analysis),op=ownedBase64Operation(binding.name);
   const iteration=ownedIterationOnlyOperation(binding.name);if(binding.target===state.data.runtimeRoot+'/json-iteration-runtime.mjs'&&iteration)return iteration.result==='json-list-owned'?'json-list-ref':iteration.result==='json'?'json-ref':iteration.result;
   if(binding.target===state.data.runtimeRoot+'/json-collections-runtime.mjs'&&ownedCollectionOperation(binding.name))return 'json-list-ref';
   const ascii=ownedAsciiOperation(binding.name);if(binding.target===state.data.runtimeRoot+'/string-iterator-runtime.mjs'&&ascii)return ascii.ret;
   if(binding.target===state.data.runtimeRoot+'/base64-runtime.mjs'&&op)return op.ret;
   const outcome=ownedOutcomeOperation(binding.name);if(binding.target===state.data.runtimeRoot+'/owned-outcome-runtime.mjs'&&outcome)return outcome.ret==='json'?'json-ref':outcome.ret;
   const field=ownedJsonFieldOperation(binding.name);if(binding.target===state.data.runtimeRoot+'/json-fields-runtime.mjs'&&field)return field.ret;
   const reader=ownedJsonReaderOperation(binding.name);if(binding.target===state.data.runtimeRoot+'/json-runtime.mjs'&&reader)return reader.ret;
   const optional=ownedJsonOptionalReaderOperation(binding.name);if(binding.target===state.data.runtimeRoot+'/json-option-runtime.mjs'&&optional)return optional.ret;
   // Written output domain only; source-symbol and whole-body checks stay independent.
   if(binding.target===state.data.runtimeRoot+'/json-macro-runtime.mjs'&&['json_macro_value','json_macro_null','json_macro_bool','json_macro_string','json_macro_u64','json_macro_i64','json_macro_array','json_macro_object'].includes(binding.name))return 'json-ref';
  }
 }
 // Map and byte domains must be written through the actual imported operation,
 // not a caller's similarly-shaped object/array declaration.
 if(ts.isIndexedAccessTypeNode(type)&&ts.isLiteralTypeNode(type.indexType)&&['0','1'].includes(type.indexType.literal.text)&&ts.isTypeReferenceNode(type.objectType)&&type.objectType.typeName.getText(file)==='Parameters'&&type.objectType.typeArguments?.length===1){
  if(analysis.checker.getSymbolAtLocation(type.objectType.typeName)?.declarations?.length)fail('shadowed Parameters type');
  const query=type.objectType.typeArguments[0];
  if(ts.isTypeQueryNode(query)&&ts.isIdentifier(query.exprName)){
   const binding=originalOwnedCoreImport(handle,path,query.exprName,analysis);
   const iteration=ownedIterationOnlyOperation(binding.name);if(binding.target===state.data.runtimeRoot+'/json-iteration-runtime.mjs'&&iteration){if(type.indexType.literal.text==='0')return 'json-list-ref';if(iteration.arity===3&&type.indexType.literal.text==='1')return 'json-ref';}
   if(binding.target===state.data.runtimeRoot+'/json-collections-runtime.mjs'&&ownedCollectionOperation(binding.name)&&type.indexType.literal.text==='0')return 'json-list-ref';
   const ascii=ownedAsciiOperation(binding.name);if(binding.target===state.data.runtimeRoot+'/string-iterator-runtime.mjs'&&ascii)return ascii.args[Number(type.indexType.literal.text)];
   const base64=ownedBase64Operation(binding.name);if(binding.target===state.data.runtimeRoot+'/base64-runtime.mjs'&&base64&&type.indexType.literal.text==='0')return base64.input;
   const outcome=ownedOutcomeOperation(binding.name);if(binding.target===state.data.runtimeRoot+'/owned-outcome-runtime.mjs'&&outcome&&Number(type.indexType.literal.text)<outcome.args.length)return outcome.args[Number(type.indexType.literal.text)];
   const field=ownedJsonFieldOperation(binding.name);if(binding.target===state.data.runtimeRoot+'/json-fields-runtime.mjs'&&field&&Number(type.indexType.literal.text)<field.args.length)return field.args[Number(type.indexType.literal.text)];
   const reader=ownedJsonReaderOperation(binding.name);if(binding.target===state.data.runtimeRoot+'/json-runtime.mjs'&&reader&&Number(type.indexType.literal.text)<reader.args.length)return reader.args[Number(type.indexType.literal.text)];
   const optional=ownedJsonOptionalReaderOperation(binding.name);if(binding.target===state.data.runtimeRoot+'/json-option-runtime.mjs'&&optional&&type.indexType.literal.text==='0')return optional.input;
   if(binding.target===state.data.runtimeRoot+'/json-macro-runtime.mjs'&&type.indexType.literal.text==='0'){if(binding.name==='json_macro_i64')return 'i64';if(binding.name==='json_macro_u64')return 'u64';}
   if(binding.target===state.data.runtimeRoot+'/json-update-runtime.mjs'&&binding.name==='router_core_json_map_index'&&type.indexType.literal.text==='0')return 'map-ref';
   if(binding.target===state.data.runtimeRoot+'/json-update-runtime.mjs'&&binding.name==='router_core_json_index_usize'&&type.indexType.literal.text==='1')return 'usize';
  }
 }
 fail('unregistered written type domain');
}

// The compiler traversal is entirely private. Only detached source/body facts
// leave this operation; every emission boundary reconstructs them afresh.
const OPS=Object.freeze({
 router_core_json_copy:{args:['json'],ret:'json',rust:'json_copy'},
 router_core_json_with_field:{args:['json','str','json'],ret:'json',rust:'json_with_field'},
 router_core_json_index_str:{args:['json','str'],ret:'json-ref',rust:'json_index_str',root:0},
 router_core_json_index_usize:{args:['json','usize'],ret:'json-ref',rust:'json_index_usize',root:0},
 router_core_json_map_index:{args:['map-ref','str'],ret:'json-ref',rust:'json_map_index',root:0},
 json_macro_value:{args:['json'],ret:'json',rust:'json_copy'},
 json_macro_null:{args:[],ret:'json',rust:null},
 json_macro_bool:{args:['bool'],ret:'json',rust:null},
 json_macro_string:{args:['str'],ret:'json',rust:null},
 json_macro_u64:{args:['u64'],ret:'json',rust:null},
 json_macro_i64:{args:['i64'],ret:'json',rust:null},
});
const KEYS=new Set('as async await break const continue crate default do dyn else enum export extern false fn for function if impl import in let loop match mod move mut new null pub ref return self static struct super switch this throw trait true try type typeof undefined unsafe use var void where while with yield abstract become box final gen macro override priv unsized virtual'.split(' '));
function rustName(name){
 if(!/^[a-z][A-Za-z0-9_]*$/u.test(name)||KEYS.has(name))fail('nonportable declaration name');
 const rust=name.replace(/[A-Z]/gu,c=>'_'+c.toLowerCase());if(KEYS.has(rust))fail('reserved declaration name');return rust;
}
const json=type=>type==='json'||type==='json-ref';
const compatible=(actual,wanted)=>wanted==='json-list-ref'?actual==='json-list-ref'||actual==='json-list-owned':wanted==='json'?json(actual):wanted==='i64'?actual==='i64'||actual==='usize':wanted==='u64'||wanted==='usize'?actual==='usize'||actual==='u64':actual===wanted;
export function analyzeOriginalOwnedCoreSource(context,path){
 const analysis=originalOwnedCoreModule(context,path),{ts,file,source}=analysis,program=[],diagnostics=[],items=[];
 const functions=file.statements.filter(ts.isFunctionDeclaration);
 // Top-level evaluation, namespace imports and unsupported exports are not
 // silently erased. Their full source remains in the refusal manifest.
 for(const item of file.statements){
  if(ts.isImportDeclaration(item)){
   if(!item.importClause?.namedBindings||!ts.isNamedImports(item.importClause.namedBindings))fail('only actual named imports');
   for(const spec of item.importClause.namedBindings.elements)originalOwnedCoreImport(context,path,spec.name,analysis);continue;
  }
  if(ts.isFunctionDeclaration(item))continue;
  if(ts.isEmptyStatement(item))continue;
  fail('top-level evaluation or unsupported declaration');
 }
 for(const declaration of functions){
  const span=[declaration.getStart(file),declaration.end],name=declaration.name?.text??null;
  try{const item=checkFunction(context,path,declaration,analysis);program.push(item);items.push({name,span,status:'translated'});}
  catch(error){if(!(error instanceof TypeError))throw error;const diagnostic={kind:'owned-core',name,span,message:error.message};diagnostics.push(diagnostic);items.push({name,span,status:'unsupported',diagnostic});}
 }
 requireOwnedCoreSourceCurrent(context);return {program,diagnostics,items,source,path};
}
function checkFunction(context,path,declaration,analysis){
 const {ts,file,source,checker}=analysis;
 if(!declaration.name||!declaration.body||declaration.asteriskToken||declaration.typeParameters||declaration.modifiers?.some(mod=>mod.kind!==ts.SyntaxKind.ExportKeyword))fail('ordinary original named function required');
 const name=rustName(declaration.name.text),params=[],environment=new Map();let cells=0,paired=pairedFunction(context,path,declaration,analysis);
 const tick=depth=>{if(++cells>100000||depth>160)fail('whole function flow budget');};
 function bind(identifier,value,scope){
  if(!ts.isIdentifier(identifier)||scope.has(identifier.text)||identifier.text.startsWith('__ro'))fail('duplicate, reserved or nonidentifier binding');
  const rust=rustName(identifier.text);if([...scope.values()].some(binding=>binding.rust===rust))fail('colliding Rust binding');
  const symbol=checker.getSymbolAtLocation(identifier);if(!symbol)fail('unresolved lexical declaration');scope.set(identifier.text,{...value,symbol,rust});return identifier.text;
 }
 for(let index=0;index<declaration.parameters.length;index++){
  const param=declaration.parameters[index];
  if(param.dotDotDotToken||param.questionToken||param.initializer||param.modifiers?.length)fail('default/rest/optional parameter');
  const written=param.type??ts.getJSDocType(param);let type;
  if(written)type=originalOwnedCoreType(context,path,written,analysis);
  else{
   paired??=pairedFunction(context,path,declaration,analysis);
   type=paired?originalOwnedCoreType(context,paired.pair.typescript.path,paired.declaration.parameters[index].type,paired.analysis):originalOwnedCoreType(context,path,undefined,analysis);
  }
  if(type==='base64-result')fail('native base64 result input control is not implemented');
  if(ownedJsonOptionalPayload(type)&&type!=='json-owned-option')fail('optional public parameters require an independently checked carrier boundary');
  if(type==='text-owned')type='str';
  const identifier=param.name;
  const sourceName=bind(identifier,{type,root:['json-ref','map-ref','str','bytes-ref','base64-error-ref'].includes(type)||ownedJsonBorrowed(type)||type==='json-option-input'||type==='json-list-ref'?identifier.text:null,input:true},environment);
  params.push({name:sourceName,rust:rustName(sourceName),type});
 }
 // The complete available pair was selected before parameter domains.
 const hostCalls=[],byteInputs=new Set();let collectionReturn=null,collectionDeclaration=declaration;
 const branchScope=scope=>new Map([...scope].map(([key,value])=>[key,ownedBase64Result(value.type)?{...value}:value]));
 const mergeMoves=(scope,yes,no)=>{for(const [key,value]of scope){if(ownedBase64Result(value.type))value.moved=!!yes.get(key)?.moved||!!no.get(key)?.moved;if(value.mutable&&(yes.get(key)?.variant!==value.variant||no.get(key)?.variant!==value.variant||yes.get(key)?.some!==value.some||no.get(key)?.some!==value.some))scope.set(key,{...value,variant:undefined,some:undefined});}};
 const refine=(scope,condition,truth)=>{
  if(condition.kind==='not')return refine(scope,condition.value,!truth);
  if(condition.kind==='outcome-test'){const entry=scope.get(condition.value.name);if(entry)scope.set(condition.value.name,{...entry,variant:truth===condition.ok?'Ok':'Err'});return scope;}
  if(condition.kind!=='option-test')return scope;
  const entry=scope.get(condition.value.name);if(entry)scope.set(condition.value.name,{...entry,some:truth===condition.some});return scope;
 };
 const writtenReturnDomain=()=>{
  if(collectionReturn!==null)return collectionReturn;
  const written=declaration.type??ts.getJSDocReturnType(declaration);
  return written?originalOwnedCoreType(context,path,written,analysis):paired?.declaration.type?originalOwnedCoreType(context,paired.pair.typescript.path,paired.declaration.type,paired.analysis):null;
 };
 const resultOption=()=>{
  if(collectionReturn==='json-owned-option')return collectionReturn;
  const written=declaration.type??ts.getJSDocReturnType(declaration);
  const type=written?originalOwnedCoreType(context,path,written,analysis):paired?.declaration.type?originalOwnedCoreType(context,paired.pair.typescript.path,paired.declaration.type,paired.analysis):null;
  if(!ownedJsonOptionalPayload(type))fail('optional constructor requires actual written operation return domain');return type;
 };
 function outcomeTest(node,scope,depth){
  const left=node.left,right=node.right;if(![ts.SyntaxKind.EqualsEqualsEqualsToken,ts.SyntaxKind.ExclamationEqualsEqualsToken].includes(node.operatorToken.kind)||!ts.isPropertyAccessExpression(left)||left.questionDotToken||left.name.text!=='$'||!ts.isIdentifier(left.expression)||!ts.isStringLiteral(right)||!['Ok','Err'].includes(right.text))return null;
  const entry=scope.get(left.expression.text);if(!entry||!ownedOutcomeType(entry.type)||checker.getSymbolAtLocation(left.expression)!==entry.symbol)fail('actual typed Result binding required');
  return {kind:'outcome-test',value:expression(left.expression,scope,depth+1),ok:(right.text==='Ok')===(node.operatorToken.kind===ts.SyntaxKind.EqualsEqualsEqualsToken),type:'bool',root:null};
 }
 function optionTest(node,scope,depth){
  const op=node.operatorToken.kind,left=node.left,right=node.right;
  if(![ts.SyntaxKind.EqualsEqualsEqualsToken,ts.SyntaxKind.ExclamationEqualsEqualsToken].includes(op)||!ts.isPropertyAccessExpression(left)||left.questionDotToken||left.name.text!=='$'||!ts.isIdentifier(left.expression)||!ts.isStringLiteral(right)||!['Some','None'].includes(right.text))return null;
  const entry=scope.get(left.expression.text);if(!entry||checker.getSymbolAtLocation(left.expression)!==entry.symbol||!ownedJsonOptionalPayload(entry.type))fail('optional tag requires original typed binding');
  const value=expression(left.expression,scope,depth+1);return {kind:'option-test',value,some:(right.text==='Some')===(op===ts.SyntaxKind.EqualsEqualsEqualsToken),type:'bool',root:null};
 }

  // Fresh analyzed expressions only. Null is not a static-loan proof: only
  // an actual literal (or both independently checked literal alternatives) is.
  function stringLoan(value){
   if(value.type!=='str')return undefined;
   if(value.root!==null)return params.some(param=>param.name===value.root&&(['json-ref','map-ref','str','json-option-input'].includes(param.type)||ownedJsonBorrowed(param.type)))?{root:value.root}:undefined;
   if(value.kind==='string')return {root:null};
   if(value.kind==='choose')return meetStringLoans(stringLoan(value.then),stringLoan(value.else));
   return undefined;
  }
  function meetStringLoans(left,right){
   if(!left||!right)return undefined;
   if(left.root===null)return right;
   if(right.root===null||left.root===right.root)return left;
   return undefined;
  }
  // This additional fact stays in the current native lexical environment.
  // It does not broaden existing str-return/conditional loan rules or turn
  // a public null root into a static-origin proof.
  function asciiStringLoan(value,scope){
   const loan=stringLoan(value);if(loan)return loan;
   return value.type==='str'&&value.kind==='variable'&&value.root===null&&scope.get(value.name)?.asciiStaticLoan===true?{root:null}:undefined;
  }

 function collectionCall(node,binding,scope,depth){
  const operation=ownedCollectionOperation(binding.name);if(!operation||binding.target!==analysis.runtimeRoot+'/'+operation.runtime+'-runtime.mjs')return null;
  requireOwnedCoreSourceCurrent(context);if(node.arguments.length!==operation.arity)fail('actual finite iteration callback arity required');
  const receiver=expression(node.arguments[0],scope,depth+1),initial=operation.arity===3?expression(node.arguments[1],scope,depth+1):null,callback=node.arguments.at(-1);
  if(!['json-list-ref','json-list-owned'].includes(receiver.type)||initial&&!json(initial.type)||!ts.isArrowFunction(callback)||callback.modifiers?.length||callback.typeParameters?.length||callback.parameters.length!==operation.parameters.length)fail('actual shared JSON list, owned initial value and fixed inline callback required');
  const local=branchScope(scope);for(const [key,value]of local)if(ownedBase64Result(value.type)||value.mutable)local.delete(key);
  const parameterNames=[];
  for(let index=0;index<callback.parameters.length;index++){
   const parameter=callback.parameters[index];if(!ts.isIdentifier(parameter.name)||parameter.initializer||parameter.questionToken||parameter.dotDotDotToken||parameter.modifiers?.length||parameter.type||callback.type)fail('ordinary contextually typed inline JSON parameters required');
   local.delete(parameter.name.text);parameterNames.push(bind(parameter.name,{type:operation.parameters[index],root:operation.parameters[index]==='json-ref'?parameter.name.text:null,input:false},local));
  }
  const callbackPair=pairedCollectionCallback(ts,collectionDeclaration,callback,paired);
  for(let index=0;index<callback.parameters.length;index++){
   const written=callbackPair?.declaration.parameters[index].type??ts.getJSDocType(callback.parameters[index]);
   if(written&&originalOwnedCoreType(context,callbackPair?callbackPair.pair.typescript.path:path,written,callbackPair?.analysis??analysis)!=='json-ref')fail('written callback parameter differs from actual Json domain');
  }
  const saved={resultType,resultRoot,resultOnlyAbsent,stringResultLoan,paired,collectionReturn,collectionDeclaration,scalarCount:scalarReturnValues.length};let checked;
  paired=callbackPair;collectionReturn=operation.returns;collectionDeclaration=callback;resultType=null;resultRoot=null;resultOnlyAbsent=true;stringResultLoan=null;
  try{
   if(ts.isBlock(callback.body))checked=block(callback.body.statements,local,depth+1);
   else{const value=expression(callback.body,local,depth+1);resultType=value.type;checked={body:[{kind:'return',value}],terminated:true};}
   if(!checked.terminated||resultType!==operation.returns)fail('every callback path must match its actual owned iteration result contract');
   const annotation=callbackPair?.declaration.type??ts.getJSDocReturnType(callback);
   if(annotation){const written=originalOwnedCoreType(context,callbackPair?callbackPair.pair.typescript.path:path,annotation,callbackPair?.analysis??analysis);if(written==='json-ref'?resultType!=='json':written!==resultType)fail('written callback return differs');}
  }finally{collectionReturn=saved.collectionReturn;collectionDeclaration=saved.collectionDeclaration;resultType=saved.resultType;resultRoot=saved.resultRoot;resultOnlyAbsent=saved.resultOnlyAbsent;stringResultLoan=saved.stringResultLoan;paired=saved.paired;scalarReturnValues.length=saved.scalarCount;}
  hostCalls.push({name:binding.name,target:binding.target,links:binding.links,span:[node.getStart(file),node.end],callbackSpan:[callback.getStart(file),callback.end]});requireOwnedCoreSourceCurrent(context);
  return {kind:'json-collection-call',name:binding.name,receiver,...(initial?{initial}:{}),callback:{parameters:parameterNames,returns:operation.returns,body:checked.body,span:[callback.getStart(file),callback.end]},type:operation.result,root:null};
 }
 function expression(node,scope,depth,opaqueOperand=false,numericDomain=null){
  tick(depth);if(ts.isParenthesizedExpression(node))return expression(node.expression,scope,depth+1,opaqueOperand,numericDomain);
  if(ts.isStringLiteral(node)||ts.isNoSubstitutionTemplateLiteral(node)){
   if(/\p{Surrogate}/u.test(node.text))fail('unpaired UTF16 string');return {kind:'string',value:node.text,type:'str',root:null};
  }
  if(node.kind===ts.SyntaxKind.TrueKeyword||node.kind===ts.SyntaxKind.FalseKeyword)return {kind:'bool',value:node.kind===ts.SyntaxKind.TrueKeyword,type:'bool',root:null};
  if(ts.isBigIntLiteral(node))return narrowOwnedNumericLiteral(ownedIntegerLiteral(node.text),numericDomain);
  if(ts.isPrefixUnaryExpression(node)&&node.operator===ts.SyntaxKind.MinusToken&&ts.isBigIntLiteral(node.operand))return narrowOwnedNumericLiteral(ownedIntegerLiteral(node.operand.text,{negative:true}),numericDomain);
  if(ts.isObjectLiteralExpression(node)&&node.properties[0]?.name?.text==='$'&&ts.isStringLiteral(node.properties[0]?.initializer)&&['Ok','Err'].includes(node.properties[0].initializer.text)){
   const type=writtenReturnDomain(),fields=node.properties,tag=fields[0].initializer.text;if(!ownedOutcomeType(type)||fields.length!==2||fields.some(field=>!ts.isPropertyAssignment(field)||!ts.isIdentifier(field.name)&&!ts.isStringLiteral(field.name))||fields[1].name.text!=='field0')fail('closed source-bound Result constructor required');
   const value=expression(fields[1].initializer,scope,depth+1);if(tag==='Ok'?!json(value.type):!['str','text-owned'].includes(value.type))fail('actual Result payload domain differs');return {kind:tag==='Ok'?'outcome-ok':'outcome-err',value,type,root:null};
  }
  if(ts.isObjectLiteralExpression(node)){
   const fields=node.properties,type=resultOption(),payload=ownedJsonOptionalPayload(type);
   if(fields.length<1||fields.length>2||fields.some(field=>!ts.isPropertyAssignment(field)||!ts.isIdentifier(field.name)&&!ts.isStringLiteral(field.name))||fields[0].name.text!=='$'||!ts.isStringLiteral(fields[0].initializer))fail('closed optional constructor required');
   const tag=fields[0].initializer.text;
   if(tag==='None'&&fields.length===1)return {kind:'option-none',type,root:null};
   if(tag!=='Some'||fields.length!==2||fields[1].name.text!=='field0')fail('closed optional constructor fields');
   const value=expression(fields[1].initializer,scope,depth+1,false,payload);if(value.type!==payload&&!(type==='json-owned-option'&&json(value.type))||ownedJsonBorrowed(type)&&!value.root&&value.kind!=='string')fail('optional payload or live root differs');
   return {kind:'option-some',value,type,root:ownedJsonBorrowed(type)?value.root:null};
  }
  if(ts.isPropertyAccessExpression(node)&&!node.questionDotToken&&node.name.text==='field0'&&ts.isIdentifier(node.expression)){
   const entry=scope.get(node.expression.text);if(entry&&ownedOutcomeType(entry.type)){if(!['Ok','Err'].includes(entry.variant)||checker.getSymbolAtLocation(node.expression)!==entry.symbol)fail('Result payload requires a dominating actual variant');return {kind:'outcome-field',value:expression(node.expression,scope,depth+1),variant:entry.variant,type:entry.variant==='Ok'?'json':'text-owned',root:null};}
   const payload=entry&&ownedJsonOptionalPayload(entry.type);
   if(!payload||entry.some!==true||checker.getSymbolAtLocation(node.expression)!==entry.symbol)fail('optional payload needs a dominating actual Some tag');
   const value=expression(node.expression,scope,depth+1);return {kind:'option-field',value,type:payload,root:ownedJsonBorrowed(entry.type)?entry.root:null};
  }
  if(ts.isIdentifier(node)){
   const value=scope.get(node.text);if(!value||checker.getSymbolAtLocation(node)!==value.symbol)fail('unknown, shadowed or moved binding');
   if(value.type==='json-option-input'&&!opaqueOperand)fail('opaque optional Json input requires its actual checked operation');
   if(ownedBase64Result(value.type)){if(value.moved)fail('native base64 result used after move');value.moved=true;}
   return {kind:'variable',name:node.text,type:value.type,root:value.root};
  }
  if(ts.isCallExpression(node)){
   if(node.questionDotToken||node.typeArguments?.length||node.arguments.some(ts.isSpreadElement))fail('optional/generic/spread call');
   const binding=originalOwnedCoreImport(context,path,node.expression,analysis),op=OPS[binding.name];
   const outcome=ownedOutcomeOperation(binding.name);if(outcome&&binding.target===analysis.runtimeRoot+'/owned-outcome-runtime.mjs'){
    requireOwnedCoreSourceCurrent(context);const args=node.arguments.map(argument=>expression(argument,scope,depth+1));if(args.length!==outcome.args.length||args.some((value,index)=>!ownedOutcomeCompatible(value.type,outcome.args[index])))fail('actual owned carrier operand domains differ');
    hostCalls.push({name:binding.name,target:binding.target,links:binding.links,span:[node.getStart(file),node.end]});return {kind:'outcome-call',name:binding.name,args,type:outcome.ret,root:null};
   }
   const fieldOperation=ownedJsonFieldOperation(binding.name);
   if(fieldOperation&&binding.target===analysis.runtimeRoot+'/json-fields-runtime.mjs'){
    requireOwnedCoreSourceCurrent(context);const args=node.arguments.map(argument=>expression(argument,scope,depth+1));
    if(args.length!==2||!json(args[0].type)||(fieldOperation.args[1]==='str'?!['str','text-owned'].includes(args[1].type):!['u64','usize'].includes(args[1].type)))fail('actual JSON field operand domains differ');
    const root=fieldOperation.root===null?null:args[0].root;if(fieldOperation.root!==null&&!root)fail('borrowed JSON field requires a live actual input root');
    hostCalls.push({name:binding.name,target:binding.target,links:binding.links,span:[node.getStart(file),node.end]});requireOwnedCoreSourceCurrent(context);
    return {kind:'json-field-call',name:binding.name,args,type:fieldOperation.ret,root};
   }
   const stateOperation=ownedStateOperation(binding.name);
   if(stateOperation&&binding.target===analysis.runtimeRoot+'/json-state-runtime.mjs'){
    requireOwnedCoreSourceCurrent(context);const args=node.arguments.map(argument=>expression(argument,scope,depth+1));
    if(args.length!==stateOperation.args.length||args.some((argument,index)=>!ownedStateCompatible(argument.type,stateOperation.args[index])))fail('actual owned state operand domain differs');
    hostCalls.push({name:binding.name,target:binding.target,links:binding.links,span:[node.getStart(file),node.end]});requireOwnedCoreSourceCurrent(context);
    return {kind:'json-state-call',name:binding.name,args,type:stateOperation.ret,root:null};
   }
   const collection=collectionCall(node,binding,scope,depth);if(collection)return collection;
   const ascii=ownedAsciiOperation(binding.name);
   if(ascii&&binding.target===analysis.runtimeRoot+'/string-iterator-runtime.mjs'){
    requireOwnedCoreSourceCurrent(context);if(node.arguments.length!==ascii.args.length)fail('fixed ASCII arity');
    const args=node.arguments.map(argument=>expression(argument,scope,depth+1));
    if(args.some(value=>value.type!=='str'||!asciiStringLoan(value,scope)))fail('ASCII arguments require actual borrowed input or static scalar text');
    hostCalls.push({name:binding.name,target:binding.target,links:binding.links,span:[node.getStart(file),node.end]});requireOwnedCoreSourceCurrent(context);
    return {kind:'ascii-call',name:binding.name,args,type:ascii.ret,root:null};
   }
   const optional=ownedJsonOptionalReaderOperation(binding.name);
   if(optional&&binding.target===analysis.runtimeRoot+'/json-option-runtime.mjs'){
    requireOwnedCoreSourceCurrent(context);
    if(node.arguments.length!==1||!ts.isIdentifier(node.arguments[0]))fail('opaque optional Json operation requires one actual input binding');
    const argument=expression(node.arguments[0],scope,depth+1,true);
    if(argument.type!==optional.input||!params.some(param=>param.type===optional.input&&param.name===argument.root))fail('opaque optional Json root differs');
    hostCalls.push({name:binding.name,target:binding.target,links:binding.links,span:[node.getStart(file),node.end],inputRoot:argument.root});requireOwnedCoreSourceCurrent(context);
    return {kind:'json-option-call',name:binding.name,args:[argument],type:optional.ret,root:argument.root};
   }
   const reader=ownedJsonReaderOperation(binding.name);
   if(reader&&binding.target===analysis.runtimeRoot+'/json-runtime.mjs'){
    // The fixed current JS/declaration closure and original Rust/Cargo JSON
    // profile were freshly joined by the genuine context. Rows are only DATA.
    requireOwnedCoreSourceCurrent(context);
    const args=node.arguments.map(argument=>expression(argument,scope,depth+1));
    if(args.length!==reader.args.length||args.some((value,at)=>reader.args[at]==='json-ref'?!json(value.type):value.type!==reader.args[at]&&!(reader.args[at]==='usize'&&value.type==='u64')))fail('actual JSON reader operand domain differs');
    const root=reader.root===null?null:args[reader.root].root;if(reader.root!==null&&!root)fail('JSON reader loan requires a live original input');
    hostCalls.push({name:binding.name,target:binding.target,links:binding.links,span:[node.getStart(file),node.end]});requireOwnedCoreSourceCurrent(context);
    return {kind:'json-reader-call',name:binding.name,args,type:reader.ret,root};
   }
   const base64=ownedBase64Operation(binding.name);
   if(base64&&binding.target===analysis.runtimeRoot+'/base64-runtime.mjs'){
    base64Source(traversals.get(analysis).state.files);
    if(node.arguments.length!==1)fail('fixed base64 arity');const argument=expression(node.arguments[0],scope,depth+1);
    if(!ownedBase64Compatible(argument.type,base64.input))fail('actual base64 argument domain differs');
    if(base64.input==='bytes-ref'){if(!argument.root||!params.some(param=>param.name===argument.root&&param.type==='bytes-ref'))fail('base64 octets require a live original input');byteInputs.add(argument.root);}
    if(base64.input==='base64-error-ref'&&!argument.root)fail('native error requires a live original input');
    hostCalls.push({name:binding.name,target:binding.target,links:binding.links,span:[node.getStart(file),node.end]});
    return {kind:'base64-call',name:binding.name,args:[argument],type:base64.ret,root:null,copy:base64.copy};
   }
   const expected=analysis.runtimeRoot+'/'+(binding.name.startsWith('json_macro_')?'json-macro-runtime.mjs':'json-update-runtime.mjs');
   if(['json_macro_array','json_macro_object'].includes(binding.name)&&binding.target===expected){
    if(node.arguments.length!==1||!ts.isArrayLiteralExpression(node.arguments[0])||node.arguments[0].elements.length>4096)fail('literal dense JSON constructor required');
    const values=[],keys=new Set();
    for(const element of node.arguments[0].elements){
     if(ts.isSpreadElement(element)||ts.isOmittedExpression(element))fail('dense literal JSON constructor required');
     if(binding.name==='json_macro_array'){const value=expression(element,scope,depth+1);if(!json(value.type))fail('JSON array element domain');values.push(value);}
     else{
      if(!ts.isArrayLiteralExpression(element)||element.elements.length!==2||!ts.isStringLiteral(element.elements[0])||ts.isSpreadElement(element.elements[1])||ts.isOmittedExpression(element.elements[1]))fail('literal JSON entry pair required');
      const key=element.elements[0].text;if(/\p{Surrogate}/u.test(key)||keys.has(key))fail('invalid or duplicate literal JSON key');keys.add(key);
      const value=expression(element.elements[1],scope,depth+1);if(!json(value.type))fail('JSON object value domain');values.push({key,value});
     }
    }
    hostCalls.push({name:binding.name,target:binding.target,links:binding.links,span:[node.getStart(file),node.end]});
    return binding.name==='json_macro_array'?{kind:'json-array',items:values,type:'json',root:null}:{kind:'json-object',entries:values,type:'json',root:null};
   }
   if(!op||binding.target!==expected)fail('unregistered source operation');
   const args=node.arguments.map(argument=>expression(argument,scope,depth+1));
   if(args.length!==op.args.length||args.some((argument,index)=>!compatible(argument.type,op.args[index])))fail('owned argument type differs');
   // Shared index loans from temporaries cannot outlive their owner. No alias
   // or public source flag changes the actual root identity.
   const root=op.root===undefined?null:args[op.root].root;
   if(op.root!==undefined&&!root)fail('index requires a live input root');
   hostCalls.push({name:binding.name,target:binding.target,links:binding.links,span:[node.getStart(file),node.end]});
   return {kind:'owned-call',name:binding.name,args,type:op.ret,root};
  }
  if(ts.isConditionalExpression(node)){
   const cond=expression(node.condition,scope,depth+1),a=refine(branchScope(scope),cond,true),b=refine(branchScope(scope),cond,false),yes=expression(node.whenTrue,a,depth+1,false,numericDomain),no=expression(node.whenFalse,b,depth+1,false,numericDomain);
   const loan=yes.type==='str'&&no.type==='str'?meetStringLoans(stringLoan(yes),stringLoan(no)):undefined;
   if(cond.type!=='bool'||yes.type!==no.type||yes.type==='str'&&!loan||yes.root!==no.root&&!loan&&yes.kind!=='option-none'&&no.kind!=='option-none')fail('conditional result or loan differs');mergeMoves(scope,a,b);return {kind:'choose',cond,then:yes,else:no,type:yes.type,root:loan?loan.root:yes.kind==='option-none'?no.root:yes.root};
  }
  if(ts.isPrefixUnaryExpression(node)&&node.operator===ts.SyntaxKind.ExclamationToken){const value=expression(node.operand,scope,depth+1);if(value.type!=='bool')fail('boolean negation only');return {kind:'not',value,type:'bool',root:null};}
  if(ts.isBinaryExpression(node)&&[ts.SyntaxKind.AmpersandAmpersandToken,ts.SyntaxKind.BarBarToken,ts.SyntaxKind.EqualsEqualsEqualsToken,ts.SyntaxKind.ExclamationEqualsEqualsToken,ts.SyntaxKind.LessThanToken,ts.SyntaxKind.LessThanEqualsToken,ts.SyntaxKind.GreaterThanToken,ts.SyntaxKind.GreaterThanEqualsToken].includes(node.operatorToken.kind)){
   const outcome=outcomeTest(node,scope,depth);if(outcome)return outcome;
   const optional=optionTest(node,scope,depth);if(optional)return optional;
   const left=expression(node.left,scope,depth+1),right=expression(node.right,scope,depth+1),op=node.operatorToken.getText(file);
   for(const [literal,other]of [[left,right],[right,left]])if(literal.kind==='integer'&&literal.type==='usize'&&['u64','i64'].includes(other.type)&&(other.type==='u64'||BigInt(literal.value)<=9223372036854775807n))literal.type=other.type;
   if(['<','<=','>','>='].includes(op)){if(!['usize','u64','i64'].includes(left.type)||left.type!==right.type)fail('ordered comparison requires identical checked integer domains');}
   else if(['&&','||'].includes(op)?left.type!=='bool'||right.type!=='bool':!['bool','str','usize','u64','i64'].includes(left.type)||left.type!==right.type)fail('identity/coercion comparison outside owned profile');
   return {kind:'binary',op,left,right,type:'bool',root:null};
  }
  fail('unimplemented expression '+ts.SyntaxKind[node.kind]);
 }
 let resultType=null,resultRoot=null,resultOnlyAbsent=true,stringResultLoan=null;
 // Domain narrowing uses an actual operation-derived written type, a checked
 // i64 reader payload, or an actual bounded negative literal; bare bigint fails.
 const scalarReturnValues=[];
 const i64Payload=value=>value.kind==='option-field'&&value.type==='i64'&&value.value.type==='i64-option'||value.kind==='integer'&&value.type==='i64';
 const fittingLiteral=value=>{
  if(value.kind!=='integer'||value.type!=='usize'||typeof value.value!=='string')return false;
  const text=value.value;if(!text.length||text.length>19||text.length>1&&text[0]==='0')return false;
  for(let at=0;at<text.length;at++)if(text[at]<'0'||text[at]>'9')return false;
  return text.length<19||text<='9223372036854775807';
 };
 function joinI64LiteralReturn(value){
  if(resultRoot!==null||value.root!==null)return;
  if(resultType==='i64'&&fittingLiteral(value)&&scalarReturnValues.some(i64Payload)){value.type='i64';return;}
  if(resultType==='usize'&&i64Payload(value)&&scalarReturnValues.length&&scalarReturnValues.every(fittingLiteral)){
   for(const literal of scalarReturnValues)literal.type='i64';resultType='i64';
  }
 }

 function block(statements,scope,depth,loopDepth=0){
  const body=[];let terminated=false;
  for(const statement of statements){
   tick(depth);if(terminated)fail('statement after terminating return');
   if(ts.isBreakStatement(statement)||ts.isContinueStatement(statement)){
    if(statement.label||loopDepth===0)fail('unlabeled control requires an actual enclosing loop in this function');body.push({kind:ts.isBreakStatement(statement)?'break':'continue'});terminated=true;
   }else if(ts.isWhileStatement(statement)){
    if(!ts.isBlock(statement.statement))fail('ordinary Boolean while block required');const local=branchScope(scope);for(const [name,value]of local){if(ownedBase64Result(value.type))local.delete(name);else if(value.mutable)local.set(name,{...value,variant:undefined,some:undefined});}
    const cond=expression(statement.expression,local,depth+1);if(cond.type!=='bool')fail('actual primitive Boolean loop condition required');const checked=block(statement.statement.statements,refine(local,cond,true),depth+1,loopDepth+1);
    for(const [name,value]of scope)if(value.mutable)scope.set(name,{...value,variant:undefined,some:undefined});body.push({kind:'while',cond,body:checked.body});
   }else if(ts.isForOfStatement(statement)){
    const declarationList=statement.initializer;if(statement.awaitModifier||!ts.isVariableDeclarationList(declarationList)||(declarationList.flags&ts.NodeFlags.BlockScoped)!==ts.NodeFlags.Const||declarationList.declarations.length!==1||!ts.isBlock(statement.statement))fail('ordinary const JSON for-of block required');
    const declaration=declarationList.declarations[0];if(!ts.isIdentifier(declaration.name)||declaration.type||declaration.initializer||declaration.exclamationToken||declaration.name.text.startsWith('__ro'))fail('ordinary inferred immutable loop binding required');
    if(paired){const matches=paired.evidence.locals.filter(row=>row.javascriptSpan[0]===declaration.getStart(file)&&row.javascriptSpan[1]===declaration.end);if(matches.length!==1||matches[0].typeSpan)fail('paired loop input requires its original inferred native declaration');}
    const value=expression(statement.expression,scope,depth+1);if(!['json-list-ref','json-list-owned'].includes(value.type))fail('actual canonical JSON slice or Vec iteration required');
    const local=branchScope(scope);for(const [name,value]of local){if(ownedBase64Result(value.type))local.delete(name);else if(value.mutable)local.set(name,{...value,variant:undefined,some:undefined});}local.delete(declaration.name.text);
    const name=bind(declaration.name,{type:'json-ref',root:'__ro_loop_root_'+declaration.getStart(file),input:false},local),checked=block(statement.statement.statements,local,depth+1,loopDepth+1);
    mergeMoves(scope,branchScope(scope),local);for(const [name,value]of scope)if(value.mutable)scope.set(name,{...value,variant:undefined,some:undefined});body.push({kind:'for-json',name,value,body:checked.body});
   }else if(ts.isVariableStatement(statement)){

    const declarationKind=statement.declarationList.flags&ts.NodeFlags.BlockScoped,mutable=declarationKind===ts.NodeFlags.Let;if(statement.modifiers?.length||!mutable&&declarationKind!==ts.NodeFlags.Const)fail('only fresh lexical const or owned let declarations');
    for(const declaration of statement.declarationList.declarations){
     if(!declaration.initializer||declaration.exclamationToken||declaration.type)fail('unsupported local declaration');const value=expression(declaration.initializer,scope,depth+1);if(mutable&&(!['json','json-list-owned','json-text-result','json-owned-option','bool','usize','u64','i64','text-owned'].includes(value.type)||value.root!==null))fail('mutable local requires a fresh owned JSON or Vec value');
     if(paired){
      const evidence=paired.evidence.locals.filter(item=>item.javascriptSpan[0]===declaration.getStart(file)&&item.javascriptSpan[1]===declaration.end);if(evidence.length!==1)fail('actual paired local span differs');
      const span=evidence[0].typeSpan;
      if(span){
       let actual;const find=node=>{if(ts.isVariableDeclaration(node)&&node.getStart(paired.analysis.file)===evidence[0].typescriptSpan[0]&&node.end===evidence[0].typescriptSpan[1])actual=node;ts.forEachChild(node,find);};find(paired.declaration.body);
       if(!actual?.type||actual.type.getStart(paired.analysis.file)!==span[0]||actual.type.end!==span[1])fail('actual paired local type differs');
       const written=originalOwnedCoreType(context,paired.pair.typescript.path,actual.type,paired.analysis);
       if(written==='json-ref'?!json(value.type):!ownedBase64Compatible(value.type,written))fail('paired written local ABI differs');
      }
     }
     const asciiLoan=value.type==='str'?asciiStringLoan(value,scope):undefined;
     const name=bind(declaration.name,{type:value.type,root:value.root,...(mutable?{mutable:true}:{}),...(asciiLoan?.root===null?{asciiStaticLoan:true}:{})},scope);body.push({kind:'let',name,value,...(mutable?{mutable:true}:{})});
    }
   }else if(ts.isExpressionStatement(statement)&&ts.isBinaryExpression(statement.expression)&&statement.expression.operatorToken.kind===ts.SyntaxKind.EqualsToken&&ts.isIdentifier(statement.expression.left)){
    const assignment=statement.expression,entry=scope.get(assignment.left.text);
    if(!entry?.mutable||!['json','json-list-owned','json-text-result','json-owned-option','bool','usize','u64','i64','text-owned'].includes(entry.type)||checker.getSymbolAtLocation(assignment.left)!==entry.symbol)fail('assignment requires the actual mutable owned JSON or Vec binding');
    const value=expression(assignment.right,scope,depth+1);if(value.type!==entry.type||value.root!==null)fail('assigned owned domain or loan differs');
    scope.set(assignment.left.text,{...entry,variant:undefined,some:undefined});body.push({kind:'assign',name:assignment.left.text,value});
   }else if(ts.isReturnStatement(statement)&&statement.expression){
    const value=expression(statement.expression,scope,depth+1,false,writtenReturnDomain());
    if(!['json','json-ref','bool','str','usize','text-owned','base64-result','u64','i64','json-list-owned','json-text-result'].includes(value.type)&&!ownedJsonOptionalPayload(value.type))fail('unsupported owned result');
    if(value.type==='json-ref'&&!params.some(param=>param.name===value.root&&['json-ref','map-ref','json-option-ref'].includes(param.type)))fail('returned local loan');
    if(ownedJsonBorrowed(value.type)&&value.root&&!params.some(param=>param.name===value.root&&(['json-ref','map-ref','str','json-option-input'].includes(param.type)||ownedJsonBorrowed(param.type))))fail('returned local optional loan');
    joinI64LiteralReturn(value);
    const loan=value.type==='str'?(stringResultLoan===null?stringLoan(value):meetStringLoans(stringResultLoan,stringLoan(value))):undefined,effectiveRoot=loan?loan.root:value.root;
    if(value.type==='str'&&!loan)fail('returned str requires an actual literal or live input origin');
    if(resultType!==null&&(resultType!==value.type||resultRoot!==effectiveRoot&&!(value.type==='str'&&loan)&&!(ownedJsonOptionalPayload(value.type)&&(value.kind==='option-none'||resultOnlyAbsent))))fail('return domains differ');resultType=value.type;if(value.kind!=='option-none'){resultRoot=effectiveRoot;resultOnlyAbsent=false;}if(value.type==='str')stringResultLoan=loan;scalarReturnValues.push(value);body.push({kind:'return',value});terminated=true;
   }else if(ts.isIfStatement(statement)&&ts.isBlock(statement.thenStatement)&&(!statement.elseStatement||ts.isBlock(statement.elseStatement))){
    const cond=expression(statement.expression,scope,depth+1);if(cond.type!=='bool')fail('nonboolean condition');
    const a=refine(branchScope(scope),cond,true),b=refine(branchScope(scope),cond,false),yes=block(statement.thenStatement.statements,a,depth+1,loopDepth),no=block(statement.elseStatement?.statements??[],b,depth+1,loopDepth);
    if(yes.terminated!==no.terminated){const continuing=yes.terminated?b:a;for(const name of scope.keys())scope.set(name,continuing.get(name));}else mergeMoves(scope,a,b);body.push({kind:'if',cond,then:yes.body,else:no.body});terminated=yes.terminated&&no.terminated;
   }else fail('statement/effects outside owned profile');
  }
  return {body,terminated};
 }
 const checked=block(declaration.body.statements,environment,0);if(!checked.terminated)fail('missing return');
 if(paired)for(let index=0;index<params.length;index++){
  const actual=originalOwnedCoreType(context,paired.pair.typescript.path,paired.declaration.parameters[index].type,paired.analysis);
  if((actual==='text-owned'?'str':actual)!==params[index].type)fail('paired written parameter ABI differs');
 }
 const writtenReturn=declaration.type??ts.getJSDocReturnType(declaration);
 if(writtenReturn){
  const written=originalOwnedCoreType(context,path,writtenReturn,analysis);
  if(written==='json-ref'?!json(resultType):!compatible(resultType,written)&&!ownedBase64Compatible(resultType,written))fail('written return ABI differs from original checked body');
  // A written Value domain accepts owned or borrowed results; it never
  // supplies or changes the independently checked loan/root identity.
 }
 if(paired?.declaration.type){
  const written=originalOwnedCoreType(context,paired.pair.typescript.path,paired.declaration.type,paired.analysis);
  if(written==='json-ref'?!json(resultType):!compatible(resultType,written)&&!ownedBase64Compatible(resultType,written))fail('paired written return ABI differs');
 }
 if(params.some(param=>param.type==='bytes-ref'&&!byteInputs.has(param.name)))fail('octet input requires an actual fixed base64 operand');
 if(params.some(param=>param.type==='json-option-input'&&!hostCalls.some(call=>ownedJsonOptionalReaderOperation(call.name)&&call.inputRoot===param.name)))fail('opaque optional Json input requires validation');
 if(!hostCalls.length)fail('no actual owned-core call');
 const item={kind:'owned-function',name,javascript:declaration.name.text,exported:!!declaration.modifiers?.some(mod=>mod.kind===ts.SyntaxKind.ExportKeyword),params,returns:resultType,resultRoot,body:checked.body,source:{path,source,span:[declaration.getStart(file),declaration.end]},hostCalls};
 if(paired)item.pairedSource={path:paired.pair.typescript.path,source:paired.pair.typescript.source,span:paired.evidence.typescriptSpan,parameters:paired.evidence.parameters,locals:paired.evidence.locals,returnSpan:paired.evidence.returnSpan,erasure:paired.pair.erasure.edits};
 requireOwnedCoreSourceCurrent(context);return item;
}

// Explicit ASCII presence source profile; original full builder above remains exact.
export function ownedCoreAsciiBaseRuntimeSources(runtimeRoot='runtime',declarationRoot=runtimeRoot){
 ownedSourcePath(runtimeRoot);ownedSourcePath(declarationRoot);assertReverseConcreteSourceHost();const ts=ownershipCompiler(),assets=hostCoreAsciiBaseRuntimeAssets(),rows=[],seen=new Set();
 const __runtimeEpoch=runtimeImportEpoch(ts);try{

 function visit(name){
  if(seen.has(name))return;if(seen.size>=128||name.includes('/')||!name.endsWith('.mjs')&&!name.endsWith('.mts'))fail('runtime closure bounds');seen.add(name);
  const source=assets.get(name);if(typeof source!=='string')fail('unregistered materialized asset: '+name);const base=name.endsWith('.mts')?declarationRoot:runtimeRoot,path=base+'/'+name,file=runtimeImportParsed(ts,path,source,__runtimeEpoch);rows.push({path,source});
  for(const node of file.statements)if((ts.isImportDeclaration(node)||ts.isExportDeclaration(node))&&node.moduleSpecifier){
   const specifier=node.moduleSpecifier.text;if(specifier==='node:util'||specifier==='node:crypto')continue;
   const target=relative(path,specifier);if(posix.dirname(target)!==base)fail('runtime closure escape');visit(posix.basename(target));
  }
 runtimeImportComplete(ts,path,source,file,__runtimeEpoch);
 }
 for(const name of ['json-update-runtime.mjs','json-update-runtime.d.mts','json-macro-runtime.mjs','json-macro-runtime.d.mts','base64-runtime.mjs','base64-runtime.d.mts','json-runtime.d.mts','json-option-runtime.mjs','json-option-runtime.d.mts','json-collections-runtime.mjs','json-collections-runtime.d.mts','json-iteration-runtime.mjs','json-iteration-runtime.d.mts','json-state-runtime.mjs','json-state-runtime.d.mts'])visit(name);
 for(const [name,source]of assets)if(/LICENSE|NOTICE/iu.test(name))rows.push({path:runtimeRoot+'/'+name,source});
 assertReverseConcreteSourceHost();return runtimeImportEpochReturn(__runtimeEpoch,rows.sort((a,b)=>a.path.localeCompare(b.path)));

 }finally{runtimeImportEpochClose(__runtimeEpoch);}
}
