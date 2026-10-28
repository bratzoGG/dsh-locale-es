# Contribuir

Gracias por querer mejorar la traducción. Todo el trabajo está en un archivo.

## Corregir o mejorar un texto

1. Abre `translations/es.json`. La estructura es `{ "namespace": { "clave": "texto" } }`.
2. Busca la clave (por ejemplo `chat.send`) y cambia el valor.
3. Valida y regenera:

```bash
node scripts/build-pack.js --check   # debe salir 0
node scripts/build-pack.js
```

4. Reinstala con `install.ps1` y reinicia la app para verlo.

## Reglas de traducción

- **Conserva los marcadores** `{count}`, `{name}`, `{time}`, `{timeZone}`, `{tokens}`, etc. tal
  cual y en el mismo orden si suena natural. La CI falla si cambian.
- **Conserva los sufijos de plural** de la clave (`.one`, `.other`) traduciendo cada variante
  de forma natural en español.
- **No traduzcas** marcas ni nombres propios: DSH, DeepSeek, DeepSeek Harness, Git, GitHub,
  JSON, Markdown, API, MCP, ACP, Cron, Token, UUID, URL, CSS, HTML, TypeScript, pnpm, npm.
- Español neutro y conciso, tono de producto: «Guardar», «Cancelar», «Ajustes», «Sesión»,
  «Espacio de trabajo», «Agente», «Subagente», «Habilidad» (skill), «Plugin/Plugins».

## Añadir un idioma nuevo

El mismo mecanismo sirve para otros idiomas: cambia `id`, `label` y `fallback` en
`scripts/build-pack.js`, añade `translations/<id>.json` y ajusta `cordis.patch.yml`. El
runtime de DSH encadena el respaldo al inglés, así que un idioma parcial funciona desde el
primer día.

## Actualizar tras una versión nueva de DSH

```bash
node scripts/extract-dicts.js "C:\Users\<usuario>\AppData\Local\Programs\DeepSeek Harness\resources\app.asar"
node scripts/build-pack.js --check
```

`--check` informa de las claves **sin traducir** (caen a inglés) y de las **desconocidas**
(ya no existen en la app). Añade o retira entradas en `translations/es.json` según el caso.

## Enviar cambios

1. Crea una rama.
2. Asegúrate de que `npm run check` pasa.
3. Abre un pull request explicando qué textos cambian y por qué.
