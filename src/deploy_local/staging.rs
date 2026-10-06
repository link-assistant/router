//! Independent candidates with exact resource ownership and bounded control.

use std::fs::{self, OpenOptions};
use std::io::Write as _;
use std::net::{Ipv4Addr, SocketAddr, TcpListener, TcpStream};
use std::path::{Path, PathBuf};
use std::process::ExitCode;
use std::time::{Duration, Instant};

use super::docker::Docker;
use super::operation_lock::OperationLock;
use link_assistant_router::cli::DeployArgs;
use serde_json::{Value, json};

const LABEL: &str = "com.link-assistant.router.staging";
const MARKER: &str = "staging.json";

fn namespace(name: &str) -> Result<String, String> {
    if name.is_empty()
        || name.len() > 40
        || !name
            .bytes()
            .all(|byte| byte.is_ascii_lowercase() || byte.is_ascii_digit() || byte == b'-')
    {
        return Err("staging NAME must contain 1-40 lowercase letters, digits or hyphens".into());
    }
    Ok(format!("router-stage-{name}"))
}

fn private_file(path: &Path, bytes: &[u8]) -> Result<(), String> {
    let mut options = OpenOptions::new();
    options.write(true).create_new(true);
    #[cfg(unix)]
    {
        use std::os::unix::fs::OpenOptionsExt as _;
        options.mode(0o600);
    }
    let mut file = options.open(path).map_err(|error| error.to_string())?;
    file.write_all(bytes)
        .and_then(|()| file.sync_all())
        .map_err(|error| error.to_string())
}

fn owned(docker: &Docker, resource: &str, network: bool, owner: &str) -> Result<bool, String> {
    let mut args = if network {
        vec!["network".into(), "inspect".into()]
    } else {
        vec!["inspect".into()]
    };
    args.push(resource.into());
    let objects: Value =
        serde_json::from_str(&docker.output(&args)?).map_err(|_| "invalid ownership inspection")?;
    let labels = if network {
        &objects[0]["Labels"]
    } else {
        &objects[0]["Config"]["Labels"]
    };
    Ok(labels[LABEL].as_str() == Some(owner))
}

fn objects(docker: &Docker, owner: &str) -> Result<Vec<String>, String> {
    Ok(docker
        .output(&[
            "ps".into(),
            "-a".into(),
            "--filter".into(),
            format!("label={LABEL}={owner}"),
            "--format".into(),
            "{{.Names}}".into(),
        ])?
        .lines()
        .map(str::to_string)
        .collect())
}

fn free_disk(root: &Path) -> Result<u64, String> {
    #[cfg(not(windows))]
    let mut command = crate::operation_context::command("df");
    #[cfg(not(windows))]
    command.args(["-Pk"]).arg(root);
    #[cfg(windows)]
    let mut command = {
        // Canonical Windows paths use a verbatim prefix. Resolve the volume
        // directly instead of asking Get-Item to interpret that namespace.
        use std::path::{Component, Prefix};
        let Some(Component::Prefix(prefix)) = root.components().next() else {
            return Err("staging disk volume is unverifiable".into());
        };
        let letter = match prefix.kind() {
            Prefix::Disk(letter) | Prefix::VerbatimDisk(letter) => letter,
            _ => return Err("staging disk volume is unverifiable".into()),
        };
        let mut command = crate::operation_context::command("powershell");
        command
            .args([
                "-NoProfile",
                "-NonInteractive",
                "-Command",
                "[UInt64](Get-PSDrive -Name $env:ROUTER_STAGE_DRIVE -PSProvider FileSystem -ErrorAction Stop).Free",
            ])
            .env("ROUTER_STAGE_DRIVE", char::from(letter).to_string());
        command
    };
    let output = crate::operation_context::bounded_output(&mut command, Duration::from_secs(5))
        .map_err(|error| error.to_string())?;
    #[cfg(not(windows))]
    let free = String::from_utf8_lossy(&output.stdout)
        .lines()
        .nth(1)
        .and_then(|line| line.split_whitespace().nth(3))
        .and_then(|value| value.parse::<u64>().ok());
    #[cfg(windows)]
    let free = String::from_utf8_lossy(&output.stdout)
        .trim()
        .parse::<u64>()
        .ok()
        .map(|bytes| bytes / 1024);
    if crate::operation_context::var_os("ROUTER_DEPLOY_TRACE").as_deref()
        == Some(std::ffi::OsStr::new("1"))
    {
        eprintln!(
            "staging disk probe: status={}, available_kib={free:?}, stdout_bytes={}",
            output.status,
            output.stdout.len()
        );
    }
    if !output.status.success() {
        return Err("staging disk probe failed; capacity is unverifiable".into());
    }
    free.ok_or_else(|| "staging disk probe returned invalid capacity".into())
}

fn arguments(name: &str, owner: &str, root: &Path, image: &str, port: u16) -> Vec<String> {
    vec![
        "run".into(),
        "-d".into(),
        "--init".into(),
        "--name".into(),
        name.into(),
        "--network".into(),
        name.into(),
        "--label".into(),
        format!("{LABEL}={owner}"),
        "--memory".into(),
        "768m".into(),
        "--memory-swap".into(),
        "768m".into(),
        "--cpus".into(),
        "1".into(),
        "--pids-limit".into(),
        "128".into(),
        "--log-opt".into(),
        "max-size=1m".into(),
        "--log-opt".into(),
        "max-file=3".into(),
        "-p".into(),
        format!("127.0.0.1:{port}:8080"),
        "-v".into(),
        format!("{}:/data/router", root.join("data").display()),
        "--tmpfs".into(),
        "/data/claude:rw,size=16m,mode=700".into(),
        "-e".into(),
        "TOKEN_SECRET".into(),
        "-e".into(),
        "ROUTER_STAGING_ZAI_API_KEY".into(),
        "-e".into(),
        "DATA_DIR=/data/router".into(),
        "-e".into(),
        "STORAGE_POLICY=text".into(),
        "-e".into(),
        "HOME=/data/router/client-home".into(),
        "-e".into(),
        "CLAUDE_CODE_HOME=/data/claude".into(),
        "-e".into(),
        "REQUEST_LOG_MAX_TOTAL_BYTES=8388608".into(),
        image.into(),
        "serve".into(),
    ]
}

fn catalog_report(docker: &Docker, name: &str, token: &str) -> Result<Value, String> {
    // The report exposes only identities and statuses, never credentials,
    // container environment, request bodies, or provider responses.
    let script = r"const out={};for(const path of ['/api/models','/api/services/anthropic/v1/models']){const r=await fetch('http://127.0.0.1:8080'+path,{signal:AbortSignal.timeout(5000),headers:{authorization:'Bearer '+process.env.ROUTER_STAGE_VERIFY_TOKEN,'x-link-assistant-client':'claude-code'}});let j={};try{j=await r.json()}catch{};out[path]={status:r.status,models:(j.data||[]).map(x=>({id:x.id,owned_by:x.owned_by}))}}console.log(JSON.stringify(out))";
    let text = docker.exec_with_env(
        name,
        &[("ROUTER_STAGE_VERIFY_TOKEN", token)],
        &["bun", "-e", script],
    )?;
    serde_json::from_str(&text).map_err(|_| "staging catalog probe returned invalid JSON".into())
}

fn serving_health(port: u16) -> &'static str {
    use std::io::{Read as _, Write as _};
    let address = SocketAddr::from((Ipv4Addr::LOCALHOST, port));
    let timeout = Duration::from_secs(2);
    let Ok(mut stream) = TcpStream::connect_timeout(&address, timeout) else {
        return "unavailable";
    };
    let _ = stream.set_read_timeout(Some(timeout));
    let _ = stream.set_write_timeout(Some(timeout));
    if stream
        .write_all(b"GET /api/health HTTP/1.0\r\nHost: localhost\r\n\r\n")
        .is_err()
    {
        return "unavailable";
    }
    let mut bytes = [0; 128];
    let Ok(length) = stream.read(&mut bytes) else {
        return "unavailable";
    };
    if String::from_utf8_lossy(&bytes[..length])
        .lines()
        .next()
        .is_some_and(|line| line.contains(" 200 "))
    {
        "healthy"
    } else {
        "unavailable"
    }
}

fn client_token(docker: &Docker, name: &str, admin: &str) -> Result<String, String> {
    let script = r"const r=await fetch('http://127.0.0.1:8080/api/management/tokens/client',{method:'POST',signal:AbortSignal.timeout(5000),headers:{authorization:'Bearer '+process.env.ROUTER_STAGE_ADMIN,'content-type':'application/json'},body:JSON.stringify({client_kind:'claude',ttl_hours:24,label:'staging-claude'})});if(r.status!==200)process.exit(2);const j=await r.json();if(typeof j.token!=='string'||!j.token.startsWith('la_sk_'))process.exit(3);console.log(j.token)";
    docker
        .exec_with_env(
            name,
            &[("ROUTER_STAGE_ADMIN", admin)],
            &["bun", "-e", script],
        )
        .map(|text| text.trim().to_owned())
        .map_err(|_| "staging bound-client issuance failed (secret output withheld)".into())
}

fn execute(
    args: &DeployArgs,
    requested_root: &Path,
    image: &str,
    docker: &Docker,
) -> Result<Value, String> {
    execute_with_disk(args, requested_root, image, docker, free_disk)
}

fn execute_with_disk(
    args: &DeployArgs,
    requested_root: &Path,
    image: &str,
    docker: &Docker,
    available_disk: impl Fn(&Path) -> Result<u64, String>,
) -> Result<Value, String> {
    let name = namespace(args.staging.as_deref().expect("staging dispatch"))?;
    link_assistant_router::deploy::immutable_ref(image)?;
    let root: PathBuf = if requested_root.is_absolute() {
        requested_root.into()
    } else {
        crate::operation_context::current_dir()
            .map_err(|error| error.to_string())?
            .join(requested_root)
    };
    let marker = root.join(MARKER);
    let read_only = args.status || args.verify;
    if !marker.exists() {
        if args.down || read_only {
            return Ok(
                json!({"schema":"link-assistant-router/staging/v1","namespace":name,"status":"absent","parity":false}),
            );
        }
        if root.exists()
            && fs::read_dir(&root)
                .map_err(|error| error.to_string())?
                .next()
                .is_some()
        {
            return Err(
                "staging root must be new or empty; pre-existing data is never adopted".into(),
            );
        }
        fs::create_dir_all(&root).map_err(|error| error.to_string())?;
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt as _;
            fs::set_permissions(&root, fs::Permissions::from_mode(0o700))
                .map_err(|error| error.to_string())?;
        }
        let canonical = root.canonicalize().map_err(|error| error.to_string())?;
        let owner = uuid::Uuid::new_v4().to_string();
        let state = json!({"namespace":name,"owner":owner,"root":canonical,"image":image,"port":args.port()});
        private_file(&marker, serde_json::to_string(&state).unwrap().as_bytes())?;
        let secret = format!(
            "{}{}",
            uuid::Uuid::new_v4().simple(),
            uuid::Uuid::new_v4().simple()
        );
        private_file(&root.join("token-secret"), secret.as_bytes())?;
    }
    let root = root.canonicalize().map_err(|error| error.to_string())?;
    let state: Value =
        serde_json::from_slice(&fs::read(&marker).map_err(|error| error.to_string())?)
            .map_err(|_| "invalid staging journal")?;
    if state["namespace"] != name || state["root"].as_str() != root.to_str() {
        return Err("staging journal identity/root mismatch; no resources changed".into());
    }
    let owner = state["owner"].as_str().ok_or("missing staging owner")?;
    let port = state["port"]
        .as_u64()
        .and_then(|port| u16::try_from(port).ok())
        .ok_or("invalid staging journal port")?;
    let lock = if read_only {
        None
    } else {
        let file = OpenOptions::new()
            .create(true)
            .truncate(false)
            .read(true)
            .write(true)
            .open(root.join("operation.lock"))
            .map_err(|error| error.to_string())?;
        file.try_lock()
            .map_err(|_| "pending staging lifecycle operation; no recovery attempted")?;
        Some(OperationLock(file))
    };
    // Check serving and management separately. Never attempt Desktop recovery.
    let control = docker.available();
    if read_only && control.is_err() {
        return Ok(
            json!({"schema":"link-assistant-router/staging/v1","namespace":name,"control_health":"unavailable","serving_health":serving_health(port),"port_ownership":"not-proven","parity":false,"reason":"bounded Docker management probe failed; no recovery attempted"}),
        );
    }
    control?;
    let present = objects(docker, owner)?;
    if args.down {
        for resource in present {
            if resource != name || !owned(docker, &resource, false, owner)? {
                return Err("unexpected staging resource; cleanup refused".into());
            }
            docker.output(&["rm".into(), "-f".into(), resource])?;
        }
        let networks = docker.output(&[
            "network".into(),
            "ls".into(),
            "--filter".into(),
            format!("label={LABEL}={owner}"),
            "--format".into(),
            "{{.Name}}".into(),
        ])?;
        for resource in networks.lines() {
            if resource != name || !owned(docker, resource, true, owner)? {
                return Err("network cleanup ownership mismatch".into());
            }
            docker.output(&["network".into(), "rm".into(), resource.into()])?;
        }
        return Ok(
            json!({"schema":"link-assistant-router/staging/v1","namespace":name,"status":"removed","data_retained":true,"cleanup_scope":name,"primary_preservation":"not-proven","parity":false}),
        );
    }
    if !read_only && (state["image"] != image || state["port"] != args.port()) {
        return Err(
            "staging journal image/port differs; remove this namespace or use a new one".into(),
        );
    }
    if present.is_empty() && !read_only {
        if available_disk(&root)? < 1024 * 1024 {
            return Err("staging requires at least 1 GiB free disk".into());
        }
        let listeners = docker.listeners_on(args.port())?;
        if !listeners.is_empty() || TcpListener::bind(("127.0.0.1", args.port())).is_err() {
            return Err("staging port has an active listener; choose a separate --port".into());
        }
        fs::create_dir_all(root.join("data")).map_err(|error| error.to_string())?;
        docker.ensure_image(image, args.build.as_deref())?;
        let networks = docker.output(&[
            "network".into(),
            "ls".into(),
            "--filter".into(),
            format!("name=^{name}$"),
            "--format".into(),
            "{{.Name}}".into(),
        ])?;
        if networks.trim().is_empty() {
            docker.output(&[
                "network".into(),
                "create".into(),
                "--label".into(),
                format!("{LABEL}={owner}"),
                name.clone(),
            ])?;
        } else if !owned(docker, &name, true, owner)? {
            return Err("staging network name is occupied by an unowned resource".into());
        }
        let secret =
            fs::read_to_string(root.join("token-secret")).map_err(|error| error.to_string())?;
        let key = crate::operation_context::var("ROUTER_STAGING_ZAI_API_KEY").unwrap_or_default();
        let result = docker.command(
            &arguments(&name, owner, &root, image, args.port()),
            &[
                ("TOKEN_SECRET", &secret),
                ("ROUTER_STAGING_ZAI_API_KEY", &key),
            ],
        )?;
        if !result.success {
            return Err(
                "staging candidate start failed; journal retained for namespace-only cleanup"
                    .into(),
            );
        }
        let deadline = Instant::now() + Duration::from_secs(90);
        while !docker.health(&name, "http://127.0.0.1:8080") {
            if Instant::now() >= deadline {
                return Err(
                    "staging health deadline exceeded; cleanup only this namespace with --down"
                        .into(),
                );
            }
            std::thread::sleep(Duration::from_millis(200));
        }
        if !key.is_empty() {
            docker
                .exec(
                    &name,
                    &[
                        "router",
                        "providers",
                        "add",
                        "--name",
                        "staging-zai",
                        "--kind",
                        "zai-coding-plan",
                        "--base-url",
                        "https://api.z.ai",
                        "--api-key-env",
                        "ROUTER_STAGING_ZAI_API_KEY",
                        "--subscriber-id",
                        "primary",
                        "--acknowledge-intermediary-risk",
                    ],
                )
                .map_err(|_| "staging static-key configuration failed (secret output withheld)")?;
        }
        let token = docker.exec(
            &name,
            &[
                "router",
                "tokens",
                "issue",
                "--admin",
                "--label",
                "staging",
                "--ttl-hours",
                "24",
            ],
        )?;
        if !root.join("admin-token").exists() {
            private_file(&root.join("admin-token"), token.trim().as_bytes())?;
        }
        let token = client_token(docker, &name, token.trim())?;
        if !root.join("client-token").exists() {
            private_file(&root.join("client-token"), token.as_bytes())?;
        }
    }
    drop(lock);
    let present = objects(docker, owner)?;
    let health = present.iter().any(|resource| resource == &name)
        && docker.health(&name, "http://127.0.0.1:8080");
    let catalogs = if health {
        fs::read_to_string(root.join("client-token"))
            .ok()
            .and_then(|token| catalog_report(docker, &name, token.trim()).ok())
    } else {
        None
    };
    Ok(
        json!({"schema":"link-assistant-router/staging/v1","namespace":name,"root":root,"origin":format!("http://127.0.0.1:{port}"),"control_health":"healthy","serving_health":if health {"healthy"} else {"unavailable"},"active_port_owners":docker.listeners_on(port)?,"catalogs":catalogs,"oauth_ownership":"isolated-no-import","primary_preservation":"not-proven","real_claude_models_and_picker":"not-proven","resource_limits":{"memory_mib":768,"cpus":1,"pids":128,"request_logs_bytes":8_388_608},"parity":false}),
    )
}

#[must_use]
pub fn run(args: &DeployArgs, root: &Path, image: &str) -> ExitCode {
    let result = namespace(args.staging.as_deref().expect("staging dispatch")).and_then(|_| {
        // Status/verification report existing state without planning a start.
        // Validate the identity first, and never create state for a missing image.
        if !args.down
            && !args.status
            && !args.verify
            && args.image.is_none()
            && args.build.is_none()
        {
            crate::deploy_image::ensure_default(image, link_assistant_router::VERSION)?;
        }
        execute(args, root, image, &Docker::default())
    });
    match result {
        Ok(report) => {
            println!("{}", serde_json::to_string_pretty(&report).unwrap());
            ExitCode::SUCCESS
        }
        Err(reason) => {
            println!(
                "{}",
                json!({"schema":"link-assistant-router/staging/v1","status":"refused","reason":reason,"parity":false})
            );
            ExitCode::from(2)
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn canonical_disk_probe_returns_capacity_without_requiring_spare_space() {
        let root = tempfile::tempdir().unwrap();
        let canonical = root.path().canonicalize().unwrap();
        let result = free_disk(&canonical);
        assert!(result.is_ok(), "{result:?}");
    }

    #[test]
    fn namespaces_cannot_name_primary_or_escape_their_root() {
        assert_eq!(namespace("review-643").unwrap(), "router-stage-review-643");
        for invalid in ["", "../primary", "UPPER", "a/b", "a:1"] {
            assert!(namespace(invalid).is_err());
        }
        assert_ne!(namespace("review").unwrap(), &*super::super::RELAY);
    }
    #[test]
    fn staged_arguments_have_no_primary_mount_or_rotating_login() {
        let args = arguments(
            "router-stage-review",
            "owner",
            Path::new("/tmp/stage"),
            "router:1.2.3",
            19876,
        );
        let joined = args.join(" ");
        assert!(joined.contains("127.0.0.1:19876:8080"));
        assert!(joined.contains("--memory 768m --memory-swap 768m --cpus 1"));
        assert!(!joined.contains(&*super::super::NETWORK));
        assert!(!joined.contains("credentials"));
        assert!(!joined.contains("prune"));
    }
}

#[cfg(test)]
#[path = "staging_tests.rs"]
mod lifecycle_tests;
