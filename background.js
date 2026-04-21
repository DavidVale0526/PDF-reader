/**
 * background.js — Service Worker de la Extensión PDF Bridge
 *
 * Estrategia de intercepción en dos capas:
 *  1. declarativeNetRequest (DNR) — Capa primaria. Opera a nivel de red antes de
 *     que el navegador o el SO decidan si tratar la URL como descarga. Crítico en
 *     Android, donde el sistema puede interceptar PDFs vía Intents antes de que
 *     webNavigation se dispare.
 *
 *  2. webNavigation.onBeforeNavigate — Capa de fallback. Se mantiene para
 *     compatibilidad con navegadores que no soporten DNR o en los que la regla
 *     dinámica no haya sido registrada todavía.
 *
 * Ambas capas producen el mismo resultado: redirigir al loader.html con la URL
 * original del PDF como query parameter `target`.
 */

// ─── Capa 1: declarativeNetRequest (Primaria) ─────────────────────────────────

/**
 * Registra dinámicamente la regla DNR de intercepción de PDFs.
 * Se hace de forma dinámica (no estática en manifest) porque necesitamos
 * el ID de la extensión en tiempo de ejecución para construir la URL de destino.
 */
async function registerPdfInterceptRule() {
    const loaderBase = `chrome-extension://${chrome.runtime.id}/loader.html`;

    try {
        await chrome.declarativeNetRequest.updateDynamicRules({
            // Primero eliminamos la regla anterior para evitar duplicados
            removeRuleIds: [1],
            addRules: [{
                id: 1,
                priority: 100, // Prioridad alta para superar otras reglas
                action: {
                    type: "redirect",
                    redirect: {
                        // \0 se sustituye por la URL completa que disparó la regla
                        regexSubstitution: `${loaderBase}?target=\\0`
                    }
                },
                condition: {
                    // Intercepta cualquier navegación principal a una URL .pdf
                    regexFilter: "^https?://.+\\.pdf(\\?.*)?$",
                    resourceTypes: ["main_frame"]
                }
            }]
        });
        console.log("[DNR] Regla de intercepción de PDFs registrada correctamente.");
    } catch (err) {
        console.error("[DNR] Error al registrar la regla:", err);
    }
}

// Registrar la regla al instalar o actualizar la extensión
chrome.runtime.onInstalled.addListener(registerPdfInterceptRule);

// Re-registrar al iniciar el navegador. Las dynamic rules persisten en disco,
// pero lo hacemos por robustez ante un posible crash del service worker.
chrome.runtime.onStartup.addListener(registerPdfInterceptRule);


// ─── Capa 2: webNavigation (Fallback) ─────────────────────────────────────────

chrome.webNavigation.onBeforeNavigate.addListener((details) => {
    // Solo nos interesa el frame principal
    if (details.frameId !== 0) return;

    const url = details.url;

    // Evitar bucle infinito si ya estamos en la página de carga
    if (url.startsWith(chrome.runtime.getURL("loader.html"))) return;

    const urlObj = new URL(url);
    if (urlObj.pathname.toLowerCase().endsWith('.pdf')) {
        console.log("[Fallback webNavigation] Interceptando PDF:", url);

        // En el fallback, la URL se codifica correctamente con encodeURIComponent
        const loaderUrl = chrome.runtime.getURL("loader.html")
            + "?target=" + encodeURIComponent(url);

        chrome.tabs.update(details.tabId, { url: loaderUrl });
    }
});
