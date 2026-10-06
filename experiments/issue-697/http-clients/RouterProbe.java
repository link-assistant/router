package router.client;
import router.client.api.ManagementApi;
import router.client.api.NeutralApi;
import router.client.auth.HttpBearerAuth;
public class RouterProbe {
    public static void main(String[] args) throws Exception {
        ApiClient client = new ApiClient().setBasePath(System.getenv("ROUTER_HTTP_ORIGIN"));
        client.setReadTimeout(10000);
        client.setConnectTimeout(10000);
        ((HttpBearerAuth) client.getAuthentication("AdminBearer"))
            .setBearerToken(System.getenv("ROUTER_HTTP_ADMIN_TOKEN"));
        NeutralApi neutral = new NeutralApi(client);
        if (!"ok".equals(neutral.getApiHealth())) throw new AssertionError("health contract");
        new ManagementApi(client).getApiManagementProviders();
        ((HttpBearerAuth) client.getAuthentication("RouterBearer"))
            .setBearerToken(System.getenv("ROUTER_HTTP_CLIENT_TOKEN"));
        neutral.getApiModels();
        System.out.println("Java generated client passed against Router");
    }
}
