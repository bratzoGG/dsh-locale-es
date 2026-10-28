#!/usr/bin/env node
/**
 * Genera `lib/client.js` a partir de `translations/es.json`.
 *
 * Uso:
 *   node scripts/build-pack.js [--check]
 *
 * `--check` solo valida (claves desconocidas y marcadores {…} desalineados) y sale
 * con código 1 si hay problemas: es lo que ejecuta la CI.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const es = JSON.parse(fs.readFileSync(path.join(root, 'translations', 'es.json'), 'utf8'));

const enPath = path.join(root, 'translations', 'en-dicts.json');
const en = fs.existsSync(enPath) ? JSON.parse(fs.readFileSync(enPath, 'utf8')) : null;
const checkOnly = process.argv.includes('--check');

const placeholders = (s) => (String(s).match(/\{[A-Za-z0-9_]+\}/g) || []).sort().join(',');
const orphans = [];
const mismatches = [];

if (en) {
  for (const [ns, dict] of Object.entries(es)) {
    for (const [k, v] of Object.entries(dict)) {
      const source = en[ns] && en[ns][k];
      if (source === undefined) orphans.push(ns + '/' + k);
      else if (placeholders(source) !== placeholders(v)) mismatches.push([ns + '/' + k, source, v]);
    }
  }
}

let total = 0;
let missing = 0;
for (const dict of Object.values(es)) total += Object.keys(dict).length;
if (en) {
  for (const [ns, dict] of Object.entries(en)) {
    for (const k of Object.keys(dict)) {
      if (!es[ns] || !(k in es[ns])) missing++;
    }
  }
}

console.log('namespaces:', Object.keys(es).length, 'claves:', total, 'sin traducir:', missing);
console.log('claves desconocidas:', orphans.length, 'marcadores desalineados:', mismatches.length);
for (const o of orphans.slice(0, 10)) console.log('  ORPHAN', o);
for (const m of mismatches.slice(0, 10)) console.log('  PLACEHOLDER', m[0], JSON.stringify(m[1]), '->', JSON.stringify(m[2]));

if (checkOnly) process.exit(orphans.length || mismatches.length ? 1 : 0);

const literal = (obj) => JSON.stringify(obj, null, '\t').replace(/</g, '\\u003c');
const namespaces = Object.keys(es).filter((ns) => Object.keys(es[ns]).length > 0).sort();
const body = namespaces
  .map((ns) => `\t\t\tctx.effect(() => ctx.locale.register(${JSON.stringify(ns)}, "es", ${literal(es[ns])}), ${JSON.stringify('locale-es: ' + ns)});`)
  .join('\n');

const source = `window.__ModuleLoader__.load({
\tid: ${JSON.stringify(manifest.name)},
\tfactory: (require) => {
\t\tvar module = { exports: {} };
\t\tvar exports = module.exports;
\t\tObject.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
\t\t/** Required Client services. */
\t\tconst inject = ["locale"];
\t\t/**
\t\t* Register the Spanish language definition and every translated namespace.
\t\t* @param ctx - Client root Context.
\t\t*/
\t\tfunction apply(ctx) {
\t\t\tctx.effect(() => ctx.locale.addLanguage({
\t\t\t\tid: "es",
\t\t\t\tlabel: "Espa\\u00f1ol",
\t\t\t\tfallback: "en"
\t\t\t}), "locale-es: language");
${body}
\t\t}
\t\texports.apply = apply;
\t\texports.inject = inject;
\t\treturn module.exports;
\t}
});
`;

fs.writeFileSync(path.join(root, 'lib', 'client.js'), source, 'utf8');
console.log('escrito lib/client.js —', source.length, 'caracteres');
