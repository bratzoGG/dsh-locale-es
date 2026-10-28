/**
 * Mitad Node del paquete de idioma español.
 *
 * Todo el trabajo ocurre en la mitad navegador (`lib/client.js`), que registra el
 * idioma `es` y sus diccionarios en el runtime de locale del cliente. Esta mitad
 * solo existe para que el cargador tenga una entrada que montar.
 */

/** No requiere servicios del host. */
export const inject = [];

/** Entrada sin efectos secundarios. */
export function apply() {}
