# Changelog

## 1.0.0 — 2026-10-28

Primera versión.

- Idioma `es` registrado con `fallback: "en"` y **2 589 cadenas** traducidas en
  **52 espacios de nombres**, extraídas de los diccionarios de DeepSeek Harness 0.2.1-rc.3.
- Paquete distribuido como bundle de DSH: mitad Node inerte, mitad navegador con los
  diccionarios y parche `cordis.patch.yml` con la fila del cargador.
- `install.ps1` / `uninstall.ps1` sin dependencias, idempotentes y con respaldo de cada
  archivo que modifican.
- `scripts/extract-dicts.js` y `scripts/build-pack.js` para regenerar el paquete cuando la
  app publique textos nuevos.
- CI que valida cobertura y marcadores `{…}` en cada push.
