/**
 * background.js — Service Worker de la Extensión PDF Bridge
 *
 * ── Arquitectura de inyección ────────────────────────────────────────────────
 *
 * PROBLEMA ORIGINAL:
 *   El flujo anterior dependía de content_scripts declarativos (content_bridge.js)
 *   que inyectaban código en la página de Netlify y usaban postMessage para
 *   cruzar el límite "Isolated World → Main World". Esto fallaba en Android porque:
 *     1. Los content_scripts declarativos no se inyectan de forma fiable en algunos
 *        navegadores Android (Kiwi, etc.) debido a restricciones de CSP/timing.
 *     2. La cadena postMessage → injector.js → PDFViewerApplication es frágil
 *        en mobile si cualquier paso falla.
 *
 * SOLUCIÓN (este archivo):
 *   Se usa chrome.scripting.executeScript() con world: 'MAIN' desde el service
 *   worker. Esto inyecta código DIRECTAMENTE en el Main World de la página Netlify,
 *   sin necesidad de postMessage ni content_bridge.js. Es tanto la capa primaria
 *   como el fallback para Android.
 *
 *   La URL del visor SIGUE siendo Netlify (HTTPS), lo que permite que otras
 *   extensiones externas también puedan interactuar con su DOM.
 *
 * ── Flujo completo ────────────────────────────────────────────────────────────
 *   1. DNR / webNavigation interceptan links .pdf → loader.html
 *   2. loader.html descarga el PDF → lo guarda en chrome.storage.local
 *   3. loader.html redirige a https://reader01.netlify.app/web/viewer.html?file=localBridge&id=XXX
 *   4. background.js detecta esa URL con webNavigation.onCompleted
 *   5. Lee el PDF de storage y lo inyecta en Main World vía chrome.scripting
 *   6. Inyecta también las extensiones (Traductor, Liquid Mode, Read Aloud)
 */

// ─── Capa 1: declarativeNetRequest — Intercepción de links PDF ────────────────

async function registerPdfInterceptRule() {
    const loaderBase = `chrome-extension://${chrome.runtime.id}/loader.html`;
    try {
        await chrome.declarativeNetRequest.updateDynamicRules({
            removeRuleIds: [1],
            addRules: [{
                id: 1,
                priority: 100,
                action: {
                    type: "redirect",
                    redirect: { regexSubstitution: `${loaderBase}?target=\\0` }
                },
                condition: {
                    regexFilter: "^https?://.+\\.pdf(\\?.*)?$",
                    resourceTypes: ["main_frame"]
                }
            }]
        });
        console.log("[DNR] Regla de intercepción de PDFs registrada.");
    } catch (err) {
        console.error("[DNR] Error al registrar la regla:", err);
    }
}

chrome.runtime.onInstalled.addListener(registerPdfInterceptRule);
chrome.runtime.onStartup.addListener(registerPdfInterceptRule);


// ─── Capa 2: webNavigation fallback — Intercepción de links PDF ───────────────

chrome.webNavigation.onBeforeNavigate.addListener((details) => {
    if (details.frameId !== 0) return;
    const url = details.url;
    if (url.startsWith(chrome.runtime.getURL("loader.html"))) return;

    const urlObj = new URL(url);
    if (urlObj.pathname.toLowerCase().endsWith('.pdf')) {
        console.log("[Fallback webNavigation] Interceptando PDF:", url);
        const loaderUrl = chrome.runtime.getURL("loader.html")
            + "?target=" + encodeURIComponent(url);
        chrome.tabs.update(details.tabId, { url: loaderUrl });
    }
});


// ─── Capa 3: Inyección programática en el Visor Netlify ───────────────────────

/**
 * Detecta cuando el visor Netlify carga con ?file=localBridge e inyecta:
 *   - El PDF (desde chrome.storage) directamente en PDFViewerApplication
 *   - Los scripts y estilos de las extensiones (Traductor, Liquid Mode, Read Aloud)
 *
 * Al usar world: 'MAIN', el código se ejecuta en el contexto global de la página,
 * con acceso directo a PDFViewerApplication sin necesitar postMessage.
 * Esto funciona porque chrome.scripting.executeScript es inmune a la CSP de la página.
 */
chrome.webNavigation.onCompleted.addListener(async (details) => {
    if (details.frameId !== 0) return;

    let url;
    try {
        url = new URL(details.url);
    } catch {
        return;
    }

    // Solo actuar en el visor de Netlify con el parámetro localBridge
    if (url.hostname !== 'reader01.netlify.app') return;
    if (!url.pathname.endsWith('viewer.html')) return;
    if (url.searchParams.get('file') !== 'localBridge') return;

    const docId = url.searchParams.get('id');
    if (!docId) return;

    const dataKey = `pdf_bridge_data_${docId}`;
    const nameKey = `pdf_bridge_name_${docId}`;

    console.log("[Scripting] Visor Netlify detectado. Leyendo PDF del storage:", dataKey);

    let pdfData, pdfName;
    try {
        const result = await chrome.storage.local.get([dataKey, nameKey]);
        pdfData = result[dataKey];
        pdfName = result[nameKey] || 'Documento';
    } catch (err) {
        console.error("[Scripting] Error leyendo storage:", err);
        return;
    }

    if (!pdfData) {
        console.warn("[Scripting] PDF no encontrado en storage:", dataKey);
        return;
    }

    const tabId = details.tabId;

    // ── Paso 1: Abrir el PDF en PDFViewerApplication (Main World) ─────────────
    try {
        await chrome.scripting.executeScript({
            target: { tabId, allFrames: false },
            world: 'MAIN',
            func: openPdfInViewer,
            args: [pdfData, pdfName]
        });
        console.log("[Scripting] PDF inyectado en Main World correctamente.");
    } catch (err) {
        console.error("[Scripting] Error inyectando PDF en Main World:", err);
        return;
    }

    // ── Paso 2: Estilos de las extensiones ────────────────────────────────────
    try {
        await chrome.scripting.insertCSS({
            target: { tabId },
            files: [
                'translator/styles.css',
                'liquid_mode/styles.css',
                'read_aloud/styles.css'
            ]
        });
    } catch (err) {
        console.warn("[Scripting] Error inyectando CSS de extensiones:", err);
    }

    // ── Paso 3: Scripts MVC de las extensiones (secuencial en Main World) ─────
    const extensionModules = [
        'translator/model.js',
        'translator/view.js',
        'translator/controller.js',
        'liquid_mode/model.js',
        'liquid_mode/view.js',
        'liquid_mode/controller.js',
        'read_aloud/model.js',
        'read_aloud/view.js',
        'read_aloud/controller.js',
    ];

    for (const file of extensionModules) {
        try {
            await chrome.scripting.executeScript({
                target: { tabId, allFrames: false },
                world: 'MAIN',
                files: [file]
            });
        } catch (err) {
            console.warn(`[Scripting] No se pudo inyectar ${file}:`, err);
            // Continuamos aunque falle un módulo individual
        }
    }

    console.log("[Scripting] Todas las extensiones inyectadas en el visor Netlify.");
});


/**
 * Esta función se serializa y ejecuta en el Main World de la página Netlify.
 * NO tiene acceso a chrome.* (está en Main World, no Isolated World).
 * Sí tiene acceso directo a window.PDFViewerApplication y el DOM de la página.
 *
 * Incluye un guard para evitar doble-carga en caso de que algún otro mecanismo
 * ya haya abierto el PDF.
 *
 * @param {string} pdfData  - Data URL Base64 del PDF
 * @param {string} pdfName  - Nombre del archivo para el título
 */
function openPdfInViewer(pdfData, pdfName) {
    // Guard: si ya hay un documento cargado, no re-cargar
    if (window.PDFViewerApplication?.pdfDocument) {
        console.log('[Bridge] PDF ya estaba cargado. Omitiendo inyección.');
        return;
    }

    let attempts = 0;
    const maxAttempts = 150; // 7.5 segundos máximo de espera

    const poll = setInterval(() => {
        attempts++;

        if (window.PDFViewerApplication?.initialized) {
            clearInterval(poll);

            try {
                const rawBase64    = pdfData.split(',')[1];
                const binaryString = atob(rawBase64);
                const bytes        = new Uint8Array(binaryString.length);

                for (let i = 0; i < binaryString.length; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                }

                window.PDFViewerApplication.open({ data: bytes });
                setTimeout(() => window.PDFViewerApplication.setTitleUsingUrl(pdfName), 200);

                console.log('[Bridge] PDF abierto exitosamente:', pdfName);

            } catch (err) {
                console.error('[Bridge] Error al abrir el PDF:', err);
            }

        } else if (attempts >= maxAttempts) {
            clearInterval(poll);
            console.error('[Bridge] Tiempo de espera agotado. PDFViewerApplication no inicializó.');
        }
    }, 50);
}
