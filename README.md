# Website Zimmerei & Dachdeckerei Schüll GmbH

Neue Website für zimmerei-schuell.de – statisches HTML/CSS mit wenig JavaScript und einem kleinen PHP-Skript für das Anfrageformular. Keine Datenbank, kein CMS, keine externen Dienste, keine Cookies.

## Ordner

| Ordner | Inhalt |
|---|---|
| `public/` | **Die fertige Website.** Dieser Ordnerinhalt wird zu Hostinger hochgeladen. |
| `src/pages/` | Inhalte der einzelnen Seiten |
| `src/partials/` | wiederkehrende Bausteine: Footer, Kontaktbereich, Leistungsliste, Zeichnungen, Karte |
| `src/layout.html` | Rahmen jeder Seite (Kopf, Navigation, Schnellkontakt-Leiste) |
| `src/static/` | CSS, JavaScript, Schriften, Logo, `anfrage.php`, `.htaccess` |
| `src/build.mjs` | baut `public/` neu – dort stehen auch Seitentitel, Beschreibungen und Firmendaten |
| `docs/` | offene Punkte, Bilderliste, Original-Logo |

## Änderungen machen

1. Text in `src/pages/…` bzw. `src/partials/…` ändern (Telefonnummern, Adresse usw. zentral in `src/build.mjs` unter `SITE`).
2. Neu bauen: `node src/build.mjs` (Node.js 18 oder neuer, keine Installation weiterer Pakete nötig).
3. Den Inhalt von `public/` hochladen.

Lokal ansehen (mit funktionierendem Formular-Skript): `php -S 127.0.0.1:8080 -t public` und dann http://127.0.0.1:8080 öffnen.

## Veröffentlichen bei Hostinger

1. Domain `zimmerei-schuell.de` bei Hostinger hinzufügen bzw. per Nameserver/DNS auf Hostinger zeigen lassen.
2. SSL-Zertifikat im hPanel aktivieren (kostenlos).
3. Im hPanel unter **E-Mails** das Postfach bzw. die Adresse `website@zimmerei-schuell.de` anlegen – sie ist der Absender der Formular-Mails. Empfänger ist `info@zimmerei-schuell.de`. Beides steht oben in `public/anfrage.php` (bzw. `src/static/anfrage.php`) und kann dort geändert werden.
4. Im **Dateimanager** den Inhalt von `public/` in `public_html/` hochladen – inklusive der versteckten Dateien `.htaccess` und `.user.ini`.
5. Testen: Formular mit einem Foto absenden, Mail-Eingang prüfen. Alte Adressen wie `/der-betrieb/` leiten automatisch auf die neuen Seiten um.
6. In der Google Search Console die `sitemap.xml` einreichen und im Google-Unternehmensprofil die Website-Adresse prüfen.

## Technik in Kürze

- Mobile first, ohne Frameworks; Animationen nur per CSS und `IntersectionObserver`, abschaltbar über „Bewegung reduzieren“.
- Schriften (Barlow Condensed, IBM Plex Sans/Mono, SIL Open Font License) liegen lokal – keine Verbindung zu Google Fonts.
- Lokale SEO: Seitentitel und Beschreibungen je Seite, strukturierte Daten (`RoofingContractor`), `sitemap.xml`, `robots.txt`, 301-Weiterleitungen der alten URLs.
- Barrierefreiheit: geprüft mit axe (WCAG 2.1 AA) bei 390 px und 1440 px ohne Befund.
