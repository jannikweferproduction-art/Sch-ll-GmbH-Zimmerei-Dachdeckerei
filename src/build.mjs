// Baut die statische Website aus src/ nach public/.
// Aufruf: node src/build.mjs   (keine Abhängigkeiten nötig)
//
// Seiten liegen als HTML-Fragmente in src/pages/, gemeinsame Bausteine in
// src/partials/. Platzhalter: {{> name}} bindet src/partials/name.html ein,
// {{key}} setzt Werte aus SITE bzw. den Seitenangaben unten ein.

import { readFile, writeFile, mkdir, cp, rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC = dirname(fileURLToPath(import.meta.url));
const OUT = join(SRC, '..', 'public');

const SITE = {
  url: 'https://zimmerei-schuell.de',
  name: 'Zimmerei & Dachdeckerei Schüll GmbH',
  phoneMobile: '0177 404 95 89',
  phoneMobileHref: '+491774049589',
  phoneOffice: '04456 899 340',
  phoneOfficeHref: '+494456899340',
  fax: '04456 899 169',
  email: 'info@zimmerei-schuell.de',
  street: 'Wiefelsteder Straße 223',
  zip: '26316',
  city: 'Varel',
  district: 'Altjührden',
  mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Zimmerei+%26+Dachdeckerei+Sch%C3%BCll+GmbH+Wiefelsteder+Stra%C3%9Fe+223+26316+Varel',
  bauUrl: 'https://www.schuell-bau.de',
};

// nav: welcher Hauptmenüpunkt ist aktiv · anliegen: Vorauswahl im Formular
const PAGES = [
  { src: 'index.html', out: '/', nav: 'start',
    title: 'Zimmerei & Dachdeckerei in Varel | Meisterbetrieb Schüll',
    description: 'Dachsanierung, Dämmung, Energieberatung, Holzbau und Asbestsanierung in Varel, Friesland und Ammerland. Meisterbetrieb Schüll – Zimmerer-, Dachdecker- und Maurermeister.' },
  { src: 'leistungen.html', out: '/leistungen/', nav: 'leistungen',
    title: 'Leistungen: Dach, Dämmung, Holzbau, Innenausbau | Schüll Varel',
    description: 'Alle Leistungen der Zimmerei & Dachdeckerei Schüll in Varel: Dach & Abdichtung, Gebäudehülle & Energieberatung, Holzbau & Anbauten, Innenausbau und Asbestsanierung.' },
  { src: 'leistung-dach.html', out: '/leistungen/dach/', nav: 'leistungen', anliegen: 'dach',
    title: 'Dachsanierung & Dachreparatur in Varel und Friesland | Schüll',
    description: 'Dachsanierung, Dachreparatur, Dachaufstockung, Dachfenster und Dachrinnen vom Dachdecker- und Zimmerermeister aus Varel – auch während Sie im Haus wohnen.' },
  { src: 'leistung-energie.html', out: '/leistungen/daemmung-fassade-energieberatung/', nav: 'leistungen', anliegen: 'energie',
    title: 'Dämmung, Fassade & Energieberatung in Varel | Schüll',
    description: 'Staatlich anerkannte Energieberatung, Dämmung, zertifizierte Hohlwand-Einblasdämmung, Fassadenverkleidung, Verschieferung sowie Fenster- und Türeinbau in Varel und Umgebung.' },
  { src: 'leistung-holzbau.html', out: '/leistungen/holzbau-carport-wintergarten/', nav: 'leistungen', anliegen: 'holzbau',
    title: 'Carport, Wintergarten & Holzbau in Varel | Zimmerei Schüll',
    description: 'Carports, Eingangsüberdachungen, Wintergärten, Terrassen, Pergolen, Gartenhäuser und Garagentore von der Zimmerei Schüll aus Varel-Altjührden.' },
  { src: 'leistung-innenausbau.html', out: '/leistungen/innenausbau/', nav: 'leistungen', anliegen: 'innenausbau',
    title: 'Innenausbau & Dachgeschossausbau in Varel | Zimmerei Schüll',
    description: 'Dachgeschossausbau, Holzfenster, Türen, Böden und Treppen: Innenausbau vom Zimmerermeister aus Varel für Friesland und Ammerland.' },
  { src: 'leistung-asbest.html', out: '/leistungen/asbestsanierung/', nav: 'leistungen', anliegen: 'asbest',
    title: 'Asbestsanierung Dach & Fassade in Varel und Friesland | Schüll',
    description: 'Asbestzement-Platten an Dach und Fassade fachgerecht ausbauen und entsorgen lassen – und direkt neu eindecken. Zimmerei & Dachdeckerei Schüll aus Varel.' },
  { src: 'betrieb.html', out: '/betrieb/', nav: 'betrieb',
    title: 'Betrieb & Meister | Zimmerei & Dachdeckerei Schüll, Varel',
    description: 'Magnus Schüll: Zimmerer-, Dachdecker-, Maurer- und Betonbaumeister, Energieberater und DEKRA-Sachverständiger. Der Meisterbetrieb aus Varel-Altjührden seit 2006.' },
  { src: 'kontakt.html', out: '/kontakt/', nav: 'kontakt',
    title: 'Kontakt & Anfrage | Zimmerei & Dachdeckerei Schüll, Varel',
    description: 'Anrufen, SMS schreiben oder Anfrage mit Fotos senden: Zimmerei & Dachdeckerei Schüll, Wiefelsteder Straße 223, 26316 Varel. Mobil 0177 404 95 89.' },
  { src: 'danke.html', out: '/kontakt/danke/', nav: 'kontakt', noindex: true,
    title: 'Danke für Ihre Anfrage | Zimmerei & Dachdeckerei Schüll',
    description: 'Ihre Anfrage ist bei uns angekommen.' },
  { src: 'impressum.html', out: '/impressum/', nav: '',
    title: 'Impressum | Zimmerei & Dachdeckerei Schüll GmbH',
    description: 'Impressum der Zimmerei & Dachdeckerei Schüll GmbH, Varel.' },
  { src: 'datenschutz.html', out: '/datenschutz/', nav: '',
    title: 'Datenschutz | Zimmerei & Dachdeckerei Schüll GmbH',
    description: 'Datenschutzerklärung der Zimmerei & Dachdeckerei Schüll GmbH, Varel.' },
  { src: '404.html', out: '/404.html', nav: '', noindex: true,
    title: 'Seite nicht gefunden | Zimmerei & Dachdeckerei Schüll',
    description: 'Diese Seite gibt es nicht.' },
];

const read = (p) => readFile(join(SRC, p), 'utf8');

async function render(tpl, vars, depth = 0) {
  if (depth > 8) throw new Error('Partials zu tief verschachtelt');
  let html = tpl;
  const includes = [...html.matchAll(/\{\{>\s*([\w-]+)\s*\}\}/g)];
  for (const [tag, name] of includes) {
    const part = await render(await read(`partials/${name}.html`), vars, depth + 1);
    html = html.replace(tag, () => part);
  }
  return html.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (tag, key) => {
    if (!(key in vars)) throw new Error(`Unbekannter Platzhalter ${tag}`);
    return vars[key];
  });
}

function jsonLd() {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'RoofingContractor',
    '@id': `${SITE.url}/#betrieb`,
    name: SITE.name,
    url: `${SITE.url}/`,
    logo: `${SITE.url}/assets/img/logo-schuell-480.png`,
    image: `${SITE.url}/assets/img/logo-schuell-480.png`,
    telephone: SITE.phoneOfficeHref,
    email: SITE.email,
    founder: { '@type': 'Person', name: 'Magnus Schüll', jobTitle: 'Zimmerermeister, Dachdeckermeister, Maurer- und Betonbaumeister' },
    foundingDate: '2006-04',
    address: { '@type': 'PostalAddress', streetAddress: SITE.street, postalCode: SITE.zip,
      addressLocality: `${SITE.city}-${SITE.district}`, addressRegion: 'Niedersachsen', addressCountry: 'DE' },
    areaServed: ['Varel', 'Bockhorn', 'Zetel', 'Jade', 'Rastede', 'Wiefelstede', 'Wilhelmshaven', 'Sande',
      'Schortens', 'Westerstede', 'Bad Zwischenahn', 'Oldenburg', 'Landkreis Friesland', 'Landkreis Ammerland']
      .map((name) => ({ '@type': 'Place', name })),
    knowsAbout: ['Dachsanierung', 'Zimmerei', 'Dachdeckerei', 'Energieberatung', 'Dämmung',
      'Hohlwand-Einblasdämmung', 'Asbestsanierung', 'Carports', 'Wintergärten', 'Innenausbau'],
    sameAs: [SITE.bauUrl],
  };
  return `<script type="application/ld+json">${JSON.stringify(data)}</script>`;
}

async function build() {
  await rm(OUT, { recursive: true, force: true });
  await cp(join(SRC, 'static'), OUT, { recursive: true });

  const css = await read('static/assets/css/site.css');
  const js = await read('static/assets/js/site.js');
  const ver = (s) => createHash('sha1').update(s).digest('hex').slice(0, 8);
  const layout = await read('layout.html');
  const ld = jsonLd();

  for (const page of PAGES) {
    const vars = {
      ...Object.fromEntries(Object.entries(SITE).map(([k, v]) => [`site.${k}`, v])),
      title: page.title,
      description: page.description,
      canonical: `${SITE.url}${page.out}`,
      robots: page.noindex ? 'noindex, follow' : 'index, follow',
      cssVer: ver(css),
      jsVer: ver(js),
      jsonLd: ld,
      anliegen: page.anliegen || '',
    };
    const content = await render(await read(`pages/${page.src}`), vars);
    let html = await render(layout, { ...vars, content });
    // aktiven Menüpunkt markieren
    html = html.replace(/ data-nav="([\w-]+)"/g, (_, n) => (n === page.nav ? ' aria-current="page"' : ''));
    const file = page.out.endsWith('/') ? join(OUT, page.out, 'index.html') : join(OUT, page.out);
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, html);
  }

  const today = new Date().toISOString().slice(0, 10);
  const urls = PAGES.filter((p) => !p.noindex)
    .map((p) => `  <url><loc>${SITE.url}${p.out}</loc><lastmod>${today}</lastmod></url>`).join('\n');
  await writeFile(join(OUT, 'sitemap.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`);
  console.log(`${PAGES.length} Seiten nach public/ gebaut.`);
}

build().catch((err) => { console.error(err); process.exit(1); });
