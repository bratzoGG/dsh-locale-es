# Español para DeepSeek Harness

Paquete de idioma que añade **Español** al selector de idioma de la interfaz de
DeepSeek Harness (Ajustes → General → Language).

- **2 589 textos** de interfaz traducidos en **52 espacios de nombres**: chat, conversación,
  ajustes, espacio de trabajo, atajos, plugins, modelos, subagentes, voz, trayectoria…
- Respaldo automático a inglés: lo que no esté traducido se muestra en inglés, nunca como
  una clave cruda (`chat.send`).
- No toca la instalación de la app: todo vive en tu perfil de usuario y se revierte con un
  comando.

## Instalación (1 minuto)

1. Descarga el repositorio: **Code → Download ZIP**, y descomprímelo.
2. En PowerShell, dentro de esa carpeta:

```powershell
powershell -ExecutionPolicy Bypass -File .\install.ps1
```

3. Cierra y vuelve a abrir DeepSeek Harness.
4. **Ajustes → General → Language → Español**.

Con `git clone` es lo mismo: entras en la carpeta y ejecutas el instalador.

Otro perfil distinto del de escritorio:

```powershell
powershell -ExecutionPolicy Bypass -File .\install.ps1 -Profile miperfil
```

### Qué hace el instalador

Tres cambios, todos en `%USERPROFILE%\.dsh\profiles\desktop`, con respaldo
`.bak-locale-es-<timestamp>` de cada archivo antes de tocarlo:

1. Copia el paquete a `plugins\dsh-locale-es` y en `node_modules\dsh-locale-es`.
2. Declara la dependencia en `package.json` (`link:./plugins/dsh-locale-es`).
3. Añade una lista `insert` en `cordis.patch.yml` con la fila `locale-es`.

Es idempotente: ejecutarlo dos veces no duplica nada.

## Verificación

En **Ajustes → General → Language** deben aparecer tres opciones: English, 简体中文 y
**Español**. Al elegirlo, menús, ajustes y chat cambian al instante y la elección se
recuerda entre sesiones.

## Desinstalación

```powershell
powershell -ExecutionPolicy Bypass -File .\uninstall.ps1
```

Restaura los respaldos y borra los archivos del paquete. Después, reinicia la app.

## Cómo funciona

El runtime de locale de DSH acepta idiomas externos aportados por plugins de cliente:

```js
ctx.locale.addLanguage({ id: 'es', label: 'Español', fallback: 'en' })
ctx.locale.register('chat', 'es', { 'chat.send': 'Enviar' /* … */ })
```

Este repositorio **es** el paquete a la vez que el proyecto:

| Ruta | Papel |
| --- | --- |
| `lib/index.js` | Mitad Node: plugin vacío, solo da al cargador una entrada que montar. |
| `lib/client.js` | Mitad navegador: registra `es` y los 52 diccionarios (generado). |
| `cordis.patch.yml` | Parche de bundle que inserta la fila del cargador. |
| `translations/es.json` | Las traducciones, editables a mano. |
| `translations/en-dicts.json` | Diccionarios originales, como referencia y para validar. |
| `scripts/` | Extractor desde `app.asar` y generador del bundle. |
| `install.ps1` / `uninstall.ps1` | Instalación y reversión sin dependencias. |

### La trampa que nos costó una tarde

En `cordis.patch.yml`, una fila `- id: locale-es` **no añade** una entrada: sobrescribe una
existente. Si el `id` no existe en ninguna capa de bundle, el cargador aborta **todo** el
parche del perfil (`patch: entry "locale-es" not found`) y las demás personalizaciones del
usuario dejan de aplicarse. Para añadir una entrada nueva hace falta una lista `insert`:

```yaml
- insert:
    - id: locale-es
      name: 'dsh-locale-es'
```

## Mantenimiento

El paquete se generó a partir de los diccionarios de DSH **0.2.1-rc.3**. Cuando la app añada
textos, aparecerán en inglés hasta traducirlos. Para actualizar:

```bash
# 1. leer los diccionarios de tu instalación
node scripts/extract-dicts.js "C:\Users\<usuario>\AppData\Local\Programs\DeepSeek Harness\resources\app.asar"

# 2. ver qué falta y validar (no escribe)
node scripts/build-pack.js --check

# 3. regenerar lib/client.js
node scripts/build-pack.js
```

Después se reinstala (`install.ps1`) y se reinicia la app.

Para corregir un texto: edita `translations/es.json`, ejecuta `node scripts/build-pack.js`
y reinstala. Los marcadores `{count}`, `{name}`, `{time}` deben conservarse tal cual; la CI
falla si se desalinean.

## Publicación (para el mantenedor)

El repositorio sirve tal cual como paquete npm: la raíz es el paquete y `files` limita el
tarball a `lib/` y `cordis.patch.yml`.

```bash
npm publish          # publica dsh-locale-es
```

Comprueba antes que el nombre siga libre (`npm view dsh-locale-es`). No uses el scope
`@deepseek-ai`: pertenece a DeepSeek.

Publicado en npm, el paquete también puede instalarse desde la página **Plugins** de la app
como cualquier bundle (`dsh.bundle.patch` + `dsh.client`), sin ejecutar el instalador.

## Licencia

MIT. Los textos originales en inglés y la marca DeepSeek Harness pertenecen a DeepSeek; este
paquete solo aporta la traducción y el registro del idioma.
