#!/usr/bin/env node
/**
 * Extrae los diccionarios de interfaz en inglés desde una instalación de DeepSeek Harness.
 *
 * Los textos de UI no viven en archivos .json: están compilados dentro de los bundles
 * `lib/client.js` de cada paquete de cliente, dentro de `app.asar`. Este script lee el
 * asar directamente (formato Chromium pickle) y empareja cada diccionario `const en = {…}`
 * con su llamada `ctx.locale.register(<ns>, …)`.
 *
 * Uso:
 *   node scripts/extract-dicts.js [ruta-al-app.asar] [salida.json]
 *
 * Por defecto usa la instalación de Windows y escribe translations/en-dicts.json.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_ASAR = 'C:\\Users\\<usuario>\\AppData\\Local\\Programs\\DeepSeek Harness\\resources\\app.asar';
const asarPath = process.argv[2] || process.env.DSH_ASAR || DEFAULT_ASAR;
const outFile = process.argv[3] || path.resolve(here, '..', 'translations', 'en-dicts.json');

if (!fs.existsSync(asarPath)) {
  console.error('No encuentro app.asar en: ' + asarPath);
  console.error('Pásalo como primer argumento: node scripts/extract-dicts.js "C:\\ruta\\app.asar"');
  process.exit(1);
}

// ── lector mínimo de ASAR ────────────────────────────────────────────────────
const fd = fs.openSync(asarPath, 'r');
const head = Buffer.alloc(16);
fs.readSync(fd, head, 0, 16, 0);
const pickleSize = head.readUInt32LE(4);
const jsonSize = head.readUInt32LE(12);
const jsonBuf = Buffer.alloc(jsonSize);
fs.readSync(fd, jsonBuf, 0, jsonSize, 16);
const header = JSON.parse(jsonBuf.toString('utf8'));
const base = 8 + pickleSize;

function walk(node, prefix, out) {
  for (const [name, entry] of Object.entries(node.files || {})) {
    const p = prefix ? prefix + '/' + name : name;
    if (entry.files) walk(entry, p, out);
    else out.push({ path: p, size: entry.size, offset: Number(entry.offset || 0), unpacked: !!entry.unpacked });
  }
}

function readFile(entry) {
  if (entry.unpacked) {
    const p = asarPath.replace(/app\.asar$/, 'app.asar.unpacked') + '\\' + entry.path.replace(/\//g, '\\');
    return fs.readFileSync(p);
  }
  const buf = Buffer.alloc(entry.size);
  fs.readSync(fd, buf, 0, entry.size, base + entry.offset);
  return buf;
}

// ── extracción de diccionarios ───────────────────────────────────────────────
const all = [];
walk(header, '', all);
const bundles = all.filter((f) => /\/lib\/client\.js$/.test(f.path));
console.log('bundles de cliente:', bundles.length);

function dictPairs(body) {
  const re = /(?:"((?:[^"\\]|\\.)+)"|([A-Za-z0-9_$]+))\s*:\s*"((?:[^"\\]|\\.)*)"/g;
  const obj = {};
  let m;
  while ((m = re.exec(body))) {
    const key = m[1] !== undefined ? m[1] : m[2];
    obj[key] = JSON.parse('"' + m[3] + '"');
  }
  return obj;
}

function matchBrace(text, start) {
  let depth = 0, inStr = false, esc = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === '\\') esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === '{') depth++;
    else if (ch === '}') { depth--; if (depth === 0) return i; }
  }
  return -1;
}

const out = {};
for (const entry of bundles) {
  let text;
  try { text = readFile(entry).toString('utf8'); } catch { continue; }

  const dicts = [];
  let idx = -1;
  while ((idx = text.indexOf('const en = {', idx + 1)) !== -1) {
    const start = text.indexOf('{', idx);
    const end = matchBrace(text, start);
    if (end > 0) dicts.push(dictPairs(text.slice(start + 1, end)));
  }
  if (!dicts.length) continue;

  const regs = [];
  for (const m of text.matchAll(/ctx\.locale\.register\(\s*([^,)]+)/g)) {
    let ns = m[1].trim();
    if (/^"/.test(ns)) ns = ns.slice(1, -1);
    else {
      const def = text.match(new RegExp('(?:const|let|var)\\s+' + ns.replace(/\$/g, '\\$') + '\\s*=\\s*"([^"]+)"'));
      ns = def ? def[1] : null;
    }
    if (ns) regs.push(ns);
  }
  if (!regs.length) continue;

  if (regs.length === dicts.length) regs.forEach((ns, i) => { out[ns] = Object.assign(out[ns] || {}, dicts[i]); });
  else for (const d of dicts) out[ns] = Object.assign(out[ns] || {}, d);
}

const sorted = {};
let keys = 0;
for (const ns of Object.keys(out).sort()) {
  sorted[ns] = {};
  for (const k of Object.keys(out[ns]).sort()) sorted[ns][k] = out[ns][k];
  keys += Object.keys(out[ns]).length;
}

fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, JSON.stringify(sorted, null, '\t') + '\n', 'utf8');
console.log('escrito', outFile, '—', Object.keys(sorted).length, 'namespaces,', keys, 'claves');
