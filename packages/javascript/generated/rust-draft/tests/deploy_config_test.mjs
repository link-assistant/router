// Generated draft from tests/deploy_config_test.rs; sha256=e35ff49bfa8293aa4bd2c52897d6e387216f7df681694019fc41e3c7c51f6db5
// Carried constructs are data, never runtime parity evidence.
function SECRET() {
  return "deploy-config-test-signing-secret";
}

function PROVIDER_KEY() {
  return "sk-provider-value-never-in-argv";
}

function ENV_VALUE() {
  return "runtime-value-never-in-argv";
}

export const translated = { "SECRET": SECRET(), "PROVIDER_KEY": PROVIDER_KEY(), "ENV_VALUE": ENV_VALUE() };
export const provenance = {"sourcePath":"tests/deploy_config_test.rs","sourceSha256":"e35ff49bfa8293aa4bd2c52897d6e387216f7df681694019fc41e3c7c51f6db5","executable":3,"carried":18,"preserved":22,"runtimeParity":false};
