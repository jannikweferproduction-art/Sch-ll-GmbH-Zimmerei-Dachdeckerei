<?php
/**
 * Anfrageformular der Zimmerei & Dachdeckerei Schüll
 * Nimmt das Formular (inkl. bis zu 5 Fotos) entgegen und schickt es als E-Mail.
 * Es wird nichts auf dem Server gespeichert.
 *
 * Einstellungen: nur die beiden Adressen unten anpassen.
 * ABSENDER muss eine Adresse der eigenen Domain sein (bei Hostinger unter „E-Mails“ anlegen),
 * sonst landen die Nachrichten im Spam oder werden abgewiesen.
 */

const EMPFAENGER = 'info@zimmerei-schuell.de';
const ABSENDER   = 'website@zimmerei-schuell.de';

const MAX_FOTOS      = 5;
const MAX_FOTO_BYTES = 10 * 1024 * 1024;
const MAX_GESAMT     = 25 * 1024 * 1024;
const ERLAUBTE_TYPEN = [
    'image/jpeg' => 'jpg',
    'image/png'  => 'png',
    'image/webp' => 'webp',
    'image/heic' => 'heic',
    'image/heif' => 'heif',
];
const ANLIEGEN = [
    'dach'        => 'Dach & Abdichtung',
    'energie'     => 'Dämmung, Fassade, Energie',
    'holzbau'     => 'Carport, Holzbau, Anbau',
    'innenausbau' => 'Innenausbau',
    'asbest'      => 'Asbest',
    'sonstiges'   => 'Etwas anderes',
];
const DRINGLICHKEIT = [
    'planung' => 'Erst in Planung',
    'monate'  => 'In den nächsten Monaten',
    'akut'    => 'AKUTER SCHADEN – bitte schnell melden',
];

mb_internal_encoding('UTF-8');

$willJson = str_contains($_SERVER['HTTP_ACCEPT'] ?? '', 'application/json');

function antwort(bool $ok, string $meldung = ''): never
{
    global $willJson;
    if ($willJson) {
        header('Content-Type: application/json; charset=utf-8');
        http_response_code($ok ? 200 : 400);
        echo json_encode(['ok' => $ok, 'message' => $meldung], JSON_UNESCAPED_UNICODE);
        exit;
    }
    if ($ok) {
        header('Location: /kontakt/danke/', true, 303);
        exit;
    }
    http_response_code(400);
    header('Content-Type: text/html; charset=utf-8');
    $m = htmlspecialchars($meldung, ENT_QUOTES, 'UTF-8');
    echo "<!doctype html><html lang=\"de\"><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">"
       . "<title>Anfrage nicht gesendet</title><link rel=\"stylesheet\" href=\"/assets/css/site.css\">"
       . "<main class=\"wrap\" style=\"padding-block:64px\"><p class=\"label\">Anfrage nicht gesendet</p>"
       . "<h1 class=\"page-title\">Das hat nicht geklappt.</h1><p class=\"lead\">{$m}</p>"
       . "<p class=\"btn-row\"><a class=\"btn btn--primary\" href=\"javascript:history.back()\">Zurück zum Formular</a>"
       . "<a class=\"btn\" href=\"tel:+491774049589\">Anrufen: 0177 404 95 89</a></p></main></html>";
    exit;
}

function feld(string $name, int $max): string
{
    $wert = trim((string)($_POST[$name] ?? ''));
    $wert = str_replace("\0", '', $wert);
    return mb_substr($wert, 0, $max);
}

function einzeilig(string $s): string
{
    return trim(preg_replace('/[\r\n\t]+/', ' ', $s));
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    header('Location: /kontakt/', true, 303);
    exit;
}

// Formular größer als erlaubt: PHP verwirft dann $_POST komplett
if (empty($_POST) && (int)($_SERVER['CONTENT_LENGTH'] ?? 0) > 0) {
    antwort(false, 'Die Fotos sind zusammen zu groß. Bitte weniger oder kleinere Bilder auswählen.');
}

// Spam-Falle: Menschen sehen dieses Feld nicht
if (feld('website', 200) !== '') {
    antwort(true);
}

$name        = einzeilig(feld('name', 120));
$telefon     = einzeilig(feld('telefon', 60));
$email       = einzeilig(feld('email', 160));
$ort         = einzeilig(feld('ort', 120));
$nachricht   = feld('nachricht', 5000);
$anliegenKey = feld('anliegen', 20);
$dringKey    = feld('dringlichkeit', 20);

$fehler = [];
if ($name === '') {
    $fehler[] = 'Bitte geben Sie Ihren Namen an.';
}
if ($telefon === '' && $email === '') {
    $fehler[] = 'Bitte geben Sie eine Telefonnummer oder eine E-Mail-Adresse an.';
}
if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    $fehler[] = 'Die E-Mail-Adresse scheint nicht zu stimmen.';
}
if ($telefon !== '' && !preg_match('/^[0-9+()\/\-\s.]{5,}$/', $telefon)) {
    $fehler[] = 'Die Telefonnummer scheint nicht zu stimmen.';
}
if ($nachricht === '') {
    $fehler[] = 'Bitte beschreiben Sie kurz Ihr Anliegen.';
}

// Fotos prüfen
$anhaenge = [];
$gesamt = 0;
if (!empty($_FILES['fotos']) && is_array($_FILES['fotos']['name'])) {
    $anzahl = count(array_filter($_FILES['fotos']['name'], fn($n) => $n !== ''));
    if ($anzahl > MAX_FOTOS) {
        $fehler[] = 'Bitte höchstens ' . MAX_FOTOS . ' Fotos auswählen.';
    } else {
        $finfo = new finfo(FILEINFO_MIME_TYPE);
        foreach ($_FILES['fotos']['name'] as $i => $original) {
            $err = $_FILES['fotos']['error'][$i];
            if ($err === UPLOAD_ERR_NO_FILE) {
                continue;
            }
            if ($err === UPLOAD_ERR_INI_SIZE || $err === UPLOAD_ERR_FORM_SIZE) {
                $fehler[] = 'Ein Foto ist größer als 10 MB.';
                continue;
            }
            if ($err !== UPLOAD_ERR_OK) {
                $fehler[] = 'Ein Foto konnte nicht hochgeladen werden.';
                continue;
            }
            $tmp  = $_FILES['fotos']['tmp_name'][$i];
            $size = (int)$_FILES['fotos']['size'][$i];
            $typ  = $finfo->file($tmp) ?: '';
            if (!isset(ERLAUBTE_TYPEN[$typ])) {
                $fehler[] = 'Bitte nur Fotos (JPG, PNG, WebP oder HEIC) anhängen.';
                continue;
            }
            if ($size > MAX_FOTO_BYTES) {
                $fehler[] = 'Ein Foto ist größer als 10 MB.';
                continue;
            }
            $gesamt += $size;
            $anhaenge[] = [
                'pfad' => $tmp,
                'typ'  => $typ,
                'name' => sprintf('foto-%d.%s', count($anhaenge) + 1, ERLAUBTE_TYPEN[$typ]),
            ];
        }
        if ($gesamt > MAX_GESAMT) {
            $fehler[] = 'Die Fotos sind zusammen größer als 25 MB.';
        }
    }
}

if ($fehler) {
    antwort(false, implode(' ', array_unique($fehler)));
}

$anliegen = ANLIEGEN[$anliegenKey] ?? 'nicht angegeben';
$dringend = DRINGLICHKEIT[$dringKey] ?? 'nicht angegeben';

$betreff = ($dringKey === 'akut' ? 'DRINGEND: ' : '') . "Website-Anfrage: {$anliegen} – {$name}";

$text = "Neue Anfrage über zimmerei-schuell.de\n"
      . str_repeat('=', 40) . "\n\n"
      . "Anliegen:      {$anliegen}\n"
      . "Dringlichkeit: {$dringend}\n\n"
      . "Name:          {$name}\n"
      . "Telefon:       " . ($telefon ?: '–') . "\n"
      . "E-Mail:        " . ($email ?: '–') . "\n"
      . "Ort:           " . ($ort ?: '–') . "\n\n"
      . "Nachricht:\n{$nachricht}\n\n"
      . 'Fotos:         ' . (count($anhaenge) ?: 'keine') . "\n\n"
      . '– gesendet am ' . date('d.m.Y \u\m H:i') . " Uhr\n";

$grenze = 'schuell-' . bin2hex(random_bytes(12));
$headers = [
    'From: ' . mb_encode_mimeheader('Website Schüll', 'UTF-8', 'Q') . ' <' . ABSENDER . '>',
    'MIME-Version: 1.0',
    "Content-Type: multipart/mixed; boundary=\"{$grenze}\"",
];
if ($email !== '') {
    $headers[] = 'Reply-To: ' . mb_encode_mimeheader($name, 'UTF-8', 'Q') . " <{$email}>";
}

$body = "--{$grenze}\r\n"
      . "Content-Type: text/plain; charset=UTF-8\r\n"
      . "Content-Transfer-Encoding: base64\r\n\r\n"
      . chunk_split(base64_encode($text)) . "\r\n";
foreach ($anhaenge as $a) {
    $body .= "--{$grenze}\r\n"
           . "Content-Type: {$a['typ']}; name=\"{$a['name']}\"\r\n"
           . "Content-Transfer-Encoding: base64\r\n"
           . "Content-Disposition: attachment; filename=\"{$a['name']}\"\r\n\r\n"
           . chunk_split(base64_encode((string)file_get_contents($a['pfad']))) . "\r\n";
}
$body .= "--{$grenze}--\r\n";

$gesendet = mail(
    EMPFAENGER,
    mb_encode_mimeheader($betreff, 'UTF-8', 'B'),
    $body,
    implode("\r\n", $headers),
    '-f' . ABSENDER
);

// Hochgeladene Dateien sofort entfernen (PHP räumt sie ohnehin nach der Anfrage weg)
foreach ($anhaenge as $a) {
    @unlink($a['pfad']);
}

if (!$gesendet) {
    antwort(false, 'Ihre Anfrage konnte gerade nicht versendet werden. Bitte rufen Sie uns an: 0177 404 95 89 oder schreiben Sie an info@zimmerei-schuell.de.');
}
antwort(true);
