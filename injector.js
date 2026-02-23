// Este script es inyectado en el DOM principal de la página por content_bridge.js
console.log("[Injector] Arrancando listener...");
window.addEventListener('message', function(event) {
    if (event.source !== window || event.data.type !== 'INJECT_PDF_BRIDGE') {
        return;
    }
    
    console.log("[Injector] Recibidos datos del PDF. Preparando byte array...");
    try {
        const base64Data = event.data.pdfData.split(',')[1];
        const binaryString = atob(base64Data);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        console.log("[Injector] Array de bytes generado. Tamaño:", len);
        
        let attempts = 0;
        const checkInterval = setInterval(() => {
            attempts++;
            if (window.PDFViewerApplication && window.PDFViewerApplication.initialized) {
                console.log("[Injector] PDFViewerApplication ya inicializado. Abriendo documento...");
                clearInterval(checkInterval);
                window.PDFViewerApplication.open({ data: bytes });
                
                if (event.data.pdfName) {
                    setTimeout(() => window.PDFViewerApplication.setTitleUsingUrl(event.data.pdfName), 200);
                }
            } else if (attempts > 100) {
                console.error("[Injector] Tiempo de espera agotado buscando PDFViewerApplication.");
                clearInterval(checkInterval);
            }
        }, 50);
        
    } catch (e) {
        console.error("Error abriendo el PDF local vía puente Netlify:", e);
    }
});
