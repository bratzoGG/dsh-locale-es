# Spanish for DeepSeek Harness

A language pack that adds **Spanish** to the DeepSeek Harness interface language picker
(Settings → General → Language).

- **2,589** interface strings translated across **52 namespaces**.
- English fallback: untranslated strings render in English, never as a raw key.
- It never touches the app installation — everything lives in your user profile and is
  reverted with one command.

## Install (about a minute)

1. **Code → Download ZIP**, then unzip.
2. In PowerShell, from that folder:

```powershell
powershell -ExecutionPolicy Bypass -File .\install.ps1
```

3. Quit and reopen DeepSeek Harness.
4. **Settings → General → Language → Español**.

Non-default profile: `-Profile myprofile`.

The installer copies the pack into the profile, declares the dependency on `package.json`
and appends an `insert` list to `cordis.patch.yml`, backing up every file it touches. It is
idempotent.

## Uninstall

```powershell
powershell -ExecutionPolicy Bypass -File .\uninstall.ps1
```

## How it works

DSH's locale runtime accepts external languages contributed by client plugins:

```js
ctx.locale.addLanguage({ id: 'es', label: 'Español', fallback: 'en' })
ctx.locale.register('chat', 'es', { 'chat.send': 'Enviar' /* … */ })
```

The repository is both the project and the package: `lib/index.js` is the inert Node half,
`lib/client.js` registers the language and dictionaries, and `cordis.patch.yml` inserts the
loader row.

### The gotcha that cost us an afternoon

In `cordis.patch.yml`, a `- id: locale-es` row does **not** add an entry — it overrides an
existing one. When the id exists in no bundle layer, the loader aborts the **entire** profile
patch and the user's other overrides stop applying. New entries require an `insert` list.

## Updating for a newer DSH

The pack was built from the 0.2.1-rc.3 dictionaries. New strings fall back to English until
translated.

```bash
node scripts/extract-dicts.js "C:\Users\<you>\AppData\Local\Programs\DeepSeek Harness\resources\app.asar"
node scripts/build-pack.js --check
node scripts/build-pack.js
```

## License

MIT. English source strings and the DeepSeek Harness brand belong to DeepSeek.
