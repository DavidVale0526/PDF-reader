chrome.webNavigation.onBeforeNavigate.addListener((details) => {
    // Solo nos interesa el frame principal (cuando la página completa es un PDF)
    if (details.frameId === 0) {
        const url = details.url;
        
        // Verificamos si la URL termina en .pdf (ignorando query parameters si existen)
        const urlObj = new URL(url);
        if (urlObj.pathname.toLowerCase().endsWith('.pdf')) {
            console.log("[Background] Interceptando navegación a PDF:", url);
            
            // Construimos la URL a la página intermedia de la extensión pasando el PDF original
            const loaderUrl = chrome.runtime.getURL("loader.html") + "?target=" + encodeURIComponent(url);
            
            // Actualizamos la pestaña actual a nuestra página de carga
            chrome.tabs.update(details.tabId, { url: loaderUrl });
        }
    }
});
