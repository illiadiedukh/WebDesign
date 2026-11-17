<?php
ini_set('display_errors', '0');
header('Content-Type: application/json; charset=utf-8');

function respond($status, $payload)
{
	http_response_code($status);
	echo json_encode($payload, JSON_UNESCAPED_UNICODE);
	exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
	header('Allow: POST');
	respond(405, ['success' => false, 'message' => 'Дозволено лише POST-запити.']);
}

if (!preg_match('/^\s*application\/json(?:\s*;|$)/i', $_SERVER['CONTENT_TYPE'] ?? '')) {
	respond(415, ['success' => false, 'message' => 'Некоректний формат запиту.']);
}

if ((int) ($_SERVER['CONTENT_LENGTH'] ?? 0) > 16384) {
	respond(413, ['success' => false, 'message' => 'Запит завеликий.']);
}

$rawBody = file_get_contents('php://input');
if ($rawBody === false || strlen($rawBody) > 16384) {
	respond(400, ['success' => false, 'message' => 'Не вдалося прочитати дані форми.']);
}

$data = json_decode($rawBody, true);
if (!is_array($data) || json_last_error() !== JSON_ERROR_NONE) {
	respond(400, ['success' => false, 'message' => 'Не вдалося прочитати дані форми.']);
}

$fields = ['userName', 'userEmail', 'userPhone', 'userMessage'];
foreach ($fields as $field) {
	if (!isset($data[$field]) || !is_string($data[$field])) {
		respond(422, ['success' => false, 'message' => 'Заповніть усі поля форми коректно.']);
	}
}

$name = trim($data['userName']);
$email = trim($data['userEmail']);
$phone = trim($data['userPhone']);
$message = trim($data['userMessage']);
$nameLength = preg_match_all('/./us', $name, $nameCharacters);
$messageLength = preg_match_all('/./us', $message, $messageCharacters);

if (
	$nameLength === false
	|| $nameLength < 2
	|| $nameLength > 50
	|| !preg_match("/^[\\p{L}\\s'’ʼ-]+$/u", $name)
	|| !filter_var($email, FILTER_VALIDATE_EMAIL)
	|| !preg_match('/^\+380\d{9}$/', $phone)
	|| $messageLength === false
	|| $messageLength < 10
	|| $messageLength > 500
	|| ($data['privacyConsent'] ?? false) !== true
) {
	respond(422, ['success' => false, 'message' => 'Перевірте правильність заповнення форми та згоду на обробку даних.']);
}

$fromEmail = getenv('CONTACT_FROM_EMAIL');
if (!$fromEmail || !filter_var($fromEmail, FILTER_VALIDATE_EMAIL) || !function_exists('mail')) {
	error_log('Contact form is not configured: set a valid CONTACT_FROM_EMAIL and enable PHP mail().');
	respond(500, ['success' => false, 'message' => 'Сервіс тимчасово недоступний. Спробуйте пізніше.']);
}

$recipient = 'illia.diedukh.pp.2025@lpnu.ua';
$subject = '=?UTF-8?B?' . base64_encode('Нове повідомлення з форми сайту') . '?=';
$body = "Ім’я: {$name}\n"
	. "Email: {$email}\n"
	. "Телефон: {$phone}\n\n"
	. "Повідомлення:\n{$message}\n";
$headers = [
	'From: Website contact <' . $fromEmail . '>',
	'Reply-To: ' . $email,
	'MIME-Version: 1.0',
	'Content-Type: text/plain; charset=UTF-8'
];

if (!mail($recipient, $subject, $body, implode("\r\n", $headers))) {
	error_log('PHP mail() failed while sending a contact form message.');
	respond(500, ['success' => false, 'message' => 'Не вдалося надіслати повідомлення. Спробуйте ще раз пізніше.']);
}

respond(200, ['success' => true]);
