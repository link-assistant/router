<?php
require $argv[1] . '/vendor/autoload.php';
$config = new LinkAssistant\Router\Configuration();
$config->setHost(getenv('ROUTER_HTTP_ORIGIN'));
$config->setAccessToken(getenv('ROUTER_HTTP_ADMIN_TOKEN'));
$http = new GuzzleHttp\Client(['timeout' => 10]);
$neutral = new LinkAssistant\Router\Api\NeutralApi($http, $config);
if ($neutral->getApiHealth() !== 'ok') throw new RuntimeException('health contract');
(new LinkAssistant\Router\Api\ManagementApi($http, $config))->getApiManagementProviders();
$config->setAccessToken(getenv('ROUTER_HTTP_CLIENT_TOKEN'));
$neutral->getApiModels();
echo "PHP generated client passed against Router\n";
