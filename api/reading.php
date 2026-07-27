<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$envPath = __DIR__ . '/../.env';
$env = [];
if (file_exists($envPath)) {
    $parsedEnv = parse_ini_file($envPath);
    if (is_array($parsedEnv)) {
        $env = $parsedEnv;
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
        'ok' => true,
        'service' => 'tarot_orbit_reading',
        'curl_enabled' => function_exists('curl_init'),
        'message' => 'Use POST with { question, cards } to request a tarot reading.'
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['error' => 'Only POST is supported'], JSON_UNESCAPED_UNICODE);
    exit;
}

$apiKey = getenv('OPENAI_API_KEY') ?: ($env['OPENAI_API_KEY'] ?? '');
if ($apiKey === '') {
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['error' => '未配置 OPENAI_API_KEY，请设置环境变量或 games/tarot_orbit/.env'], JSON_UNESCAPED_UNICODE);
    exit;
}

$raw = file_get_contents('php://input');
$body = json_decode($raw, true);
if (json_last_error() !== JSON_ERROR_NONE || !is_array($body)) {
    http_response_code(400);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['error' => '请求体必须是 JSON'], JSON_UNESCAPED_UNICODE);
    exit;
}

$question = trim((string)($body['question'] ?? ''));
$cards = $body['cards'] ?? [];
if (!is_array($cards) || count($cards) !== 3) {
    http_response_code(400);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['error' => '必须提供恰好三张牌'], JSON_UNESCAPED_UNICODE);
    exit;
}

$safeQuestion = $question !== '' ? $question : '未提供具体问题，请做通用三牌解读。';
$cardsText = '';
foreach ($cards as $card) {
    $position = (string)($card['position'] ?? '');
    $name = (string)($card['name'] ?? '');
    $nameEn = (string)($card['nameEn'] ?? '');
    $reversed = !empty($card['reversed']) ? '逆位' : '正位';
    $meaning = (string)($card['meaning'] ?? '');
    $cardsText .= "- {$position}: {$name} ({$nameEn}) {$reversed}; 牌义: {$meaning}\n";
}

$model = getenv('OPENAI_MODEL') ?: ($env['OPENAI_MODEL'] ?? 'gpt-4o-mini');
$requestPayload = [
    'model' => $model,
    'messages' => [
        [
            'role' => 'system',
            'content' => '你是一位温和、清醒、有洞察力的塔罗解读者。请用中文回答，语气神秘但不过度玄学，不做绝对预言，不制造恐惧。围绕过去、现在、未来三张牌，结合用户问题给出 300-500 字的指引。不要使用 Markdown 列表。'
        ],
        [
            'role' => 'user',
            'content' => "用户问题: {$safeQuestion}\n\n抽到的三张牌:\n{$cardsText}\n请给出解读。"
        ]
    ],
    'temperature' => 0.82,
    'max_tokens' => 900,
    'stream' => true
];

if (!function_exists('curl_init')) {
    $requestPayload['stream'] = false;
    $fallbackPayload = json_encode($requestPayload, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
    if ($fallbackPayload === false) {
        http_response_code(500);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['error' => '无法编码 OpenAI 请求 JSON: ' . json_last_error_msg()], JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
        exit;
    }
    $context = stream_context_create([
        'http' => [
            'method' => 'POST',
            'header' => "Content-Type: application/json\r\n" .
                "Authorization: Bearer {$apiKey}\r\n",
            'content' => $fallbackPayload,
            'timeout' => 70,
            'ignore_errors' => true
        ]
    ]);

    $result = @file_get_contents('https://api.openai.com/v1/chat/completions', false, $context);
    header('Content-Type: application/json; charset=utf-8');

    if ($result === false) {
        http_response_code(500);
        echo json_encode(['error' => 'PHP curl 扩展未启用，且 HTTPS 后备请求失败。请在 XAMPP 的 php.ini 启用 extension=curl。'], JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
        exit;
    }

    $decoded = json_decode($result, true);
    if (!is_array($decoded)) {
        http_response_code(502);
        echo json_encode(['error' => 'OpenAI 返回了无法解析的内容', 'raw' => substr($result, 0, 500)], JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
        exit;
    }

    if (isset($decoded['error'])) {
        http_response_code(502);
        $message = is_array($decoded['error']) ? ($decoded['error']['message'] ?? 'OpenAI API error') : (string)$decoded['error'];
        echo json_encode(['error' => $message], JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
        exit;
    }

    echo json_encode(['reading' => $decoded['choices'][0]['message']['content'] ?? ''], JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
    exit;
}

$payload = json_encode($requestPayload, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);

header('Content-Type: text/event-stream; charset=utf-8');
header('Cache-Control: no-cache');
header('X-Accel-Buffering: no');
ob_implicit_flush(true);
while (ob_get_level() > 0) {
    @ob_end_flush();
}

$ch = curl_init('https://api.openai.com/v1/chat/completions');
curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => $payload,
    CURLOPT_HTTPHEADER => [
        'Content-Type: application/json',
        'Authorization: Bearer ' . $apiKey,
        'Accept: text/event-stream'
    ],
    CURLOPT_RETURNTRANSFER => false,
    CURLOPT_WRITEFUNCTION => function ($ch, $data) {
        echo $data;
        flush();
        return strlen($data);
    },
    CURLOPT_TIMEOUT => 70,
    CURLOPT_CONNECTTIMEOUT => 12,
    CURLOPT_SSL_VERIFYPEER => true,
]);

$ok = curl_exec($ch);
if (!$ok) {
    $message = curl_error($ch);
    echo "data: " . json_encode(['error' => $message], JSON_UNESCAPED_UNICODE) . "\n\n";
}

$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($httpCode >= 400) {
    echo "data: " . json_encode(['error' => "OpenAI API HTTP {$httpCode}"], JSON_UNESCAPED_UNICODE) . "\n\n";
}

echo "data: [DONE]\n\n";
flush();
