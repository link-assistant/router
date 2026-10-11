// Generated draft from src/provider_connector.rs; sha256=67ce14fc49995863bd5d6b32d2f8c9e07978aff3af45f6a87c0f403446c9ff65
// Carried constructs are data, never runtime parity evidence.
function ml_make_LoginFlow_DeviceCode() {
  return Object.freeze({ $: 'DeviceCode' });
}

function ml_make_LoginFlow_Loopback() {
  return Object.freeze({ $: 'Loopback' });
}

function ml_make_LoginFlow_AuthorizationCode() {
  return Object.freeze({ $: 'AuthorizationCode' });
}

function ml_make_LoginFlow_ApiKey() {
  return Object.freeze({ $: 'ApiKey' });
}

function ml_make_LoginFlow_VendorCli() {
  return Object.freeze({ $: 'VendorCli' });
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
};

const serde_json = {
  error: {

  },
};

function ml_make_ConnectorEndpoints_ConnectorEndpoints(token_url, catalog_base) {
  if (!(typeof token_url === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(token_url))) throw new TypeError('argument outside supported Rust value domain');
  if (!(typeof catalog_base === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(catalog_base))) throw new TypeError('argument outside supported Rust value domain');
  return Object.freeze({ $: "ConnectorEndpoints", ["token_url"]: token_url, ["catalog_base"]: catalog_base });
}

export const translated = { ["LoginFlow"]: Object.freeze({ ["DeviceCode"]: ml_make_LoginFlow_DeviceCode, ["Loopback"]: ml_make_LoginFlow_Loopback, ["AuthorizationCode"]: ml_make_LoginFlow_AuthorizationCode, ["ApiKey"]: ml_make_LoginFlow_ApiKey, ["VendorCli"]: ml_make_LoginFlow_VendorCli }), ["ConnectorEndpoints"]: ml_make_ConnectorEndpoints_ConnectorEndpoints };
export const provenance = {"sourcePath":"src/provider_connector.rs","sourceSha256":"67ce14fc49995863bd5d6b32d2f8c9e07978aff3af45f6a87c0f403446c9ff65","executable":2,"executableFunctions":0,"executableConstants":0,"executableTypes":2,"executableConstructors":6,"carried":16,"preserved":19,"runtimeParity":false};
