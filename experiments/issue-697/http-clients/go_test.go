package router

import (
    "context"
    "net/http"
    "os"
    "testing"
    "time"
)

func TestRealRouterContracts(t *testing.T) {
    config := NewConfiguration()
    config.Servers = ServerConfigurations{{URL: os.Getenv("ROUTER_HTTP_ORIGIN")}}
    config.HTTPClient = &http.Client{Timeout: 10 * time.Second}
    config.DefaultHeader["Authorization"] = "Bearer " + os.Getenv("ROUTER_HTTP_ADMIN_TOKEN")
    client := NewAPIClient(config)
    ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
    defer cancel()
    health, _, err := client.NeutralAPI.GetApiHealth(ctx).Execute()
    if err != nil || health != "ok" { t.Fatalf("health: %v", err) }
    if _, _, err := client.ManagementAPI.GetApiManagementProviders(ctx).Execute(); err != nil { t.Fatal(err) }
    config.DefaultHeader["Authorization"] = "Bearer " + os.Getenv("ROUTER_HTTP_CLIENT_TOKEN")
    if _, _, err := client.NeutralAPI.GetApiModels(ctx).Execute(); err != nil {
        if contractError, ok := err.(*GenericOpenAPIError); ok { t.Fatalf("models: %s", contractError.Body()) }; t.Fatal(err)
    }
}
