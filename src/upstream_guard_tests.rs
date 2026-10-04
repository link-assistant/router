use super::*;

const STRICT: NetworkPolicy = NetworkPolicy {
    loopback: false,
    private: false,
    link_local: false,
    all: false,
};

#[test]
fn every_refused_range_is_classified() {
    let cases: &[(&str, Option<AddressClass>)] = &[
        ("127.0.0.1", Some(AddressClass::Loopback)),
        ("127.255.0.9", Some(AddressClass::Loopback)),
        ("::1", Some(AddressClass::Loopback)),
        ("::ffff:127.0.0.1", Some(AddressClass::Loopback)),
        ("10.1.2.3", Some(AddressClass::Private)),
        ("172.16.0.1", Some(AddressClass::Private)),
        ("172.31.255.255", Some(AddressClass::Private)),
        ("192.168.1.1", Some(AddressClass::Private)),
        ("100.64.0.1", Some(AddressClass::Private)),
        ("fd00:ec2::254", Some(AddressClass::Private)),
        ("169.254.169.254", Some(AddressClass::LinkLocal)),
        ("::ffff:169.254.169.254", Some(AddressClass::LinkLocal)),
        ("fe80::1", Some(AddressClass::LinkLocal)),
        ("0.0.0.0", Some(AddressClass::NonUnicast)),
        ("::", Some(AddressClass::NonUnicast)),
        ("255.255.255.255", Some(AddressClass::NonUnicast)),
        ("224.0.0.1", Some(AddressClass::NonUnicast)),
        ("ff02::1", Some(AddressClass::NonUnicast)),
        ("8.8.8.8", None),
        ("172.32.0.1", None),
        ("100.128.0.1", None),
        ("2606:4700::1111", None),
    ];
    for (address, expected) in cases {
        let ip: IpAddr = address.parse().unwrap();
        assert_eq!(classify(ip), *expected, "{address}");
    }
}

#[test]
fn a_strict_policy_refuses_literal_and_named_internal_base_urls() {
    for url in [
        "http://127.0.0.1:11434/v1",
        "http://[::1]:8080",
        "http://localhost:11434",
        "http://api.localhost/v1",
        "http://10.0.0.5/v1",
        "http://192.168.0.10:8000",
        "http://169.254.169.254/latest/meta-data/",
        "http://metadata.google.internal/computeMetadata/v1/",
        "http://[fe80::1]/",
        "http://0.0.0.0:80/",
    ] {
        let error = STRICT
            .check_base_url(url)
            .expect_err(&format!("{url} must be refused"));
        assert!(!error.to_string().is_empty());
    }
    for url in [
        "https://api.anthropic.com",
        "https://api.z.ai/api/paas/v4",
        "https://8.8.8.8/v1",
        "https://openrouter.ai/api/v1",
    ] {
        STRICT
            .check_base_url(url)
            .unwrap_or_else(|error| panic!("{url}: {error}"));
    }
}

#[test]
fn the_allow_option_opens_exactly_the_named_classes() {
    let loopback = NetworkPolicy::parse(Some("loopback"));
    assert!(loopback.check_base_url("http://127.0.0.1:1/").is_ok());
    assert!(loopback.check_base_url("http://localhost:1/").is_ok());
    assert!(loopback.check_base_url("http://10.0.0.1/").is_err());
    assert!(loopback.check_base_url("http://169.254.169.254/").is_err());

    let both = NetworkPolicy::parse(Some(" Loopback , private "));
    assert!(both.check_base_url("http://10.0.0.1/").is_ok());
    assert!(both.check_base_url("http://169.254.169.254/").is_err());

    let metadata = NetworkPolicy::parse(Some("link-local"));
    assert!(metadata.check_base_url("http://169.254.169.254/").is_ok());

    for all in ["all", "1", "true"] {
        assert_eq!(NetworkPolicy::parse(Some(all)), NetworkPolicy::allow_all());
    }
    // Non-unicast addresses are never a provider, even with every class open.
    assert!(
        NetworkPolicy::parse(Some("loopback,private,link-local"))
            .check_base_url("http://0.0.0.0/")
            .is_err()
    );
    // An unknown word never widens the policy.
    assert_eq!(NetworkPolicy::parse(Some("everything")), STRICT);
    assert_eq!(NetworkPolicy::parse(None), STRICT);
}

#[test]
fn the_refusal_names_the_option_that_allows_it() {
    let error = STRICT.check_base_url("http://127.0.0.1:9/").unwrap_err();
    let message = error.to_string();
    assert!(message.contains(ALLOW_PRIVATE_NETWORKS_ENV), "{message}");
    assert!(message.contains("loopback"), "{message}");
}

#[test]
fn rebinding_to_an_internal_address_leaves_nothing_to_dial() {
    let public: SocketAddr = "93.184.216.34:443".parse().unwrap();
    let metadata: SocketAddr = "169.254.169.254:443".parse().unwrap();
    let loopback: SocketAddr = "127.0.0.1:443".parse().unwrap();
    assert_eq!(
        STRICT
            .filter("mixed.example", vec![metadata, public])
            .unwrap(),
        vec![public]
    );
    let error = STRICT
        .filter("rebound.example", vec![loopback, metadata])
        .unwrap_err();
    assert_eq!(error.host, "rebound.example");
    assert_eq!(error.class, AddressClass::Loopback);
}

#[tokio::test]
async fn the_guarded_resolver_refuses_a_name_that_resolves_to_loopback() {
    use reqwest::dns::Resolve;
    let resolver = GuardedResolver::new(STRICT);
    let name: reqwest::dns::Name = "localhost".parse().unwrap();
    let Err(error) = resolver.resolve(name).await else {
        panic!("localhost must not resolve through a strict guard");
    };
    assert!(error.to_string().contains("loopback"), "{error}");

    let open = GuardedResolver::new(NetworkPolicy::parse(Some("loopback")));
    let name: reqwest::dns::Name = "localhost".parse().unwrap();
    let addrs: Vec<SocketAddr> = open.resolve(name).await.unwrap().collect();
    assert!(addrs.iter().all(|addr| addr.ip().is_loopback()));
}

#[tokio::test]
async fn a_guarded_client_never_dials_a_rebound_name() {
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let port = listener.local_addr().unwrap().port();
    let accepted = tokio::spawn(async move {
        tokio::time::timeout(std::time::Duration::from_millis(500), listener.accept())
            .await
            .is_ok()
    });
    let client = reqwest::Client::builder()
        .dns_resolver(std::sync::Arc::new(GuardedResolver::new(STRICT)))
        .build()
        .unwrap();
    let error = client
        .get(format!("http://localhost:{port}/"))
        .send()
        .await
        .expect_err("a strict guard refuses the dial");
    assert!(
        error.is_connect() || error.to_string().contains("dns"),
        "{error}"
    );
    assert!(
        !accepted.await.unwrap(),
        "no connection may reach the listener"
    );
}
