// Generated draft from src/config_defaults.rs; sha256=98df913d7be1cb02a4a5ad82bbdb2f822a22b8c37546257e3bf61f7ec17a77c9
// Carried constructs are data, never runtime parity evidence.
function rp_636f6e6669675f64656661756c74732e64656661756c745f676f6e6b615f6d6f64656c() {
  return "";
}

function rp_636f6e6669675f64656661756c74732e64656661756c745f6f70656e61695f636f6d70617469626c655f626173655f75726c() {
  return "http://localhost:4000/v1";
}

function rp_636f6e6669675f64656661756c74732e64656661756c745f6f70656e61695f636f6d70617469626c655f636f6e666967() {
  const ml_record1 = "litellm";
  const ml_record2 = rp_636f6e6669675f64656661756c74732e64656661756c745f6f70656e61695f636f6d70617469626c655f626173655f75726c();
  const ml_record3 = Object.freeze({ $: 'None' });
  const ml_record4 = Object.freeze({ $: 'None' });
  const ml_record5 = Object.freeze({ $: 'None' });
  const ml_record6 = Object.freeze([]);
  const ml_record7 = Object.freeze([]);
  return Object.freeze({ $: "OpenAICompatibleConfig", ["provider_name"]: ml_record1, ["base_url"]: ml_record2, ["api_key"]: ml_record3, ["api_key_env"]: ml_record4, ["default_model"]: ml_record5, ["models"]: ml_record6, ["supported_clients"]: ml_record7 });
}

export const translated = { ["default_gonka_model"]: rp_636f6e6669675f64656661756c74732e64656661756c745f676f6e6b615f6d6f64656c, ["default_openai_compatible_base_url"]: rp_636f6e6669675f64656661756c74732e64656661756c745f6f70656e61695f636f6d70617469626c655f626173655f75726c, ["default_openai_compatible_config"]: rp_636f6e6669675f64656661756c74732e64656661756c745f6f70656e61695f636f6d70617469626c655f636f6e666967 };
export const provenance = {"sourcePath":"src/config_defaults.rs","sourceSha256":"98df913d7be1cb02a4a5ad82bbdb2f822a22b8c37546257e3bf61f7ec17a77c9","executable":3,"executableFunctions":3,"executableConstants":0,"executableTypes":0,"executableConstructors":0,"carried":2,"preserved":6,"runtimeParity":false};
