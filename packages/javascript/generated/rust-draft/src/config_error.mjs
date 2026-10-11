// Generated draft from src/config_error.rs; sha256=e9faf8f580df0b266d3b08f2eb4b70573f819c9aeb9e7a3a705fbc5584f7e4ef
// Carried constructs are data, never runtime parity evidence.
function ml_make_ConfigError_InvalidPort() {
  return Object.freeze({ $: 'InvalidPort' });
}

function ml_make_ConfigError_InvalidManagementSecurity(field0) {
  if (!(typeof field0 === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(field0))) throw new TypeError('argument outside supported Rust value domain');
  return Object.freeze({ $: 'InvalidManagementSecurity', field0: field0 });
}

function ml_make_ConfigError_InvalidModelCatalogSources(field0) {
  if (!(typeof field0 === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(field0))) throw new TypeError('argument outside supported Rust value domain');
  return Object.freeze({ $: 'InvalidModelCatalogSources', field0: field0 });
}

function ml_make_ConfigError_InvalidAddress() {
  return Object.freeze({ $: 'InvalidAddress' });
}

function ml_make_ConfigError_InvalidListenHost(field0) {
  if (!(typeof field0 === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(field0))) throw new TypeError('argument outside supported Rust value domain');
  return Object.freeze({ $: 'InvalidListenHost', field0: field0 });
}

function ml_make_ConfigError_MissingTokenSecret() {
  return Object.freeze({ $: 'MissingTokenSecret' });
}

function ml_make_ConfigError_TokenSecretFile(field0) {
  if (!(typeof field0 === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(field0))) throw new TypeError('argument outside supported Rust value domain');
  return Object.freeze({ $: 'TokenSecretFile', field0: field0 });
}

function ml_make_ConfigError_InvalidRoutingMode() {
  return Object.freeze({ $: 'InvalidRoutingMode' });
}

function ml_make_ConfigError_InvalidApiFormat() {
  return Object.freeze({ $: 'InvalidApiFormat' });
}

function ml_make_ConfigError_InvalidStoragePolicy() {
  return Object.freeze({ $: 'InvalidStoragePolicy' });
}

function ml_make_ConfigError_InvalidUpstreamProvider() {
  return Object.freeze({ $: 'InvalidUpstreamProvider' });
}

function ml_make_ConfigError_InvalidBridgeModelPolicy(field0) {
  if (!(typeof field0 === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(field0))) throw new TypeError('argument outside supported Rust value domain');
  return Object.freeze({ $: 'InvalidBridgeModelPolicy', field0: field0 });
}

function ml_make_ConfigError_InvalidSubscriptionBridgePolicy(field0) {
  if (!(typeof field0 === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(field0))) throw new TypeError('argument outside supported Rust value domain');
  return Object.freeze({ $: 'InvalidSubscriptionBridgePolicy', field0: field0 });
}

function ml_make_ConfigError_InvalidProxiedClientPolicy(field0) {
  if (!(typeof field0 === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(field0))) throw new TypeError('argument outside supported Rust value domain');
  return Object.freeze({ $: 'InvalidProxiedClientPolicy', field0: field0 });
}

function ml_make_ConfigError_InvalidPrimaryListener(field0) {
  if (!(typeof field0 === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(field0))) throw new TypeError('argument outside supported Rust value domain');
  return Object.freeze({ $: 'InvalidPrimaryListener', field0: field0 });
}

function ml_make_ConfigError_InvalidAccountRoutingStrategy() {
  return Object.freeze({ $: 'InvalidAccountRoutingStrategy' });
}

function ml_make_ConfigError_InvalidAccountRequestLimits() {
  return Object.freeze({ $: 'InvalidAccountRequestLimits' });
}

function ml_make_ConfigError_MismatchedAccountRequestLimits() {
  return Object.freeze({ $: 'MismatchedAccountRequestLimits' });
}

function ml_make_ConfigError_MissingGonkaApiKey() {
  return Object.freeze({ $: 'MissingGonkaApiKey' });
}

function ml_make_ConfigError_MissingGonkaSourceUrl() {
  return Object.freeze({ $: 'MissingGonkaSourceUrl' });
}

function ml_make_ConfigError_UnsupportedGonkaDirectWallet() {
  return Object.freeze({ $: 'UnsupportedGonkaDirectWallet' });
}

function ml_make_ConfigError_MissingCraterForgeFedInbox() {
  return Object.freeze({ $: 'MissingCraterForgeFedInbox' });
}

const std = {
  io: {

  },
  ffi: {

  },
  env: {

  },
  time: {

  },
  num: {

  },
};

const serde_json = {
  error: {

  },
};

export const translated = { ["ConfigError"]: Object.freeze({ ["InvalidPort"]: ml_make_ConfigError_InvalidPort, ["InvalidManagementSecurity"]: ml_make_ConfigError_InvalidManagementSecurity, ["InvalidModelCatalogSources"]: ml_make_ConfigError_InvalidModelCatalogSources, ["InvalidAddress"]: ml_make_ConfigError_InvalidAddress, ["InvalidListenHost"]: ml_make_ConfigError_InvalidListenHost, ["MissingTokenSecret"]: ml_make_ConfigError_MissingTokenSecret, ["TokenSecretFile"]: ml_make_ConfigError_TokenSecretFile, ["InvalidRoutingMode"]: ml_make_ConfigError_InvalidRoutingMode, ["InvalidApiFormat"]: ml_make_ConfigError_InvalidApiFormat, ["InvalidStoragePolicy"]: ml_make_ConfigError_InvalidStoragePolicy, ["InvalidUpstreamProvider"]: ml_make_ConfigError_InvalidUpstreamProvider, ["InvalidBridgeModelPolicy"]: ml_make_ConfigError_InvalidBridgeModelPolicy, ["InvalidSubscriptionBridgePolicy"]: ml_make_ConfigError_InvalidSubscriptionBridgePolicy, ["InvalidProxiedClientPolicy"]: ml_make_ConfigError_InvalidProxiedClientPolicy, ["InvalidPrimaryListener"]: ml_make_ConfigError_InvalidPrimaryListener, ["InvalidAccountRoutingStrategy"]: ml_make_ConfigError_InvalidAccountRoutingStrategy, ["InvalidAccountRequestLimits"]: ml_make_ConfigError_InvalidAccountRequestLimits, ["MismatchedAccountRequestLimits"]: ml_make_ConfigError_MismatchedAccountRequestLimits, ["MissingGonkaApiKey"]: ml_make_ConfigError_MissingGonkaApiKey, ["MissingGonkaSourceUrl"]: ml_make_ConfigError_MissingGonkaSourceUrl, ["UnsupportedGonkaDirectWallet"]: ml_make_ConfigError_UnsupportedGonkaDirectWallet, ["MissingCraterForgeFedInbox"]: ml_make_ConfigError_MissingCraterForgeFedInbox }) };
export const provenance = {"sourcePath":"src/config_error.rs","sourceSha256":"e9faf8f580df0b266d3b08f2eb4b70573f819c9aeb9e7a3a705fbc5584f7e4ef","executable":1,"executableFunctions":0,"executableConstants":0,"executableTypes":1,"executableConstructors":22,"carried":2,"preserved":4,"runtimeParity":false};
