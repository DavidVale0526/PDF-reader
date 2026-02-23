document.addEventListener("webviewerloaded", () => {
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get("file") === "localBridge") {
    // Retrasar un poco para asegurar que PDFViewerApplication.open principal falle o esté listo para ser sobrescrito
    setTimeout(() => {
        if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
            chrome.storage.local.get(['pdf_bridge_data', 'pdf_bridge_name'], (result) => {
                if (result.pdf_bridge_data) {
                    try {
                        // El formato es "data:application/pdf;base64,..."
                        const base64Data = result.pdf_bridge_data.split(',')[1];
                        const binaryString = atob(base64Data);
                        const len = binaryString.length;
                        const bytes = new Uint8Array(len);
                        for (let i = 0; i < len; i++) {
                            bytes[i] = binaryString.charCodeAt(i);
                        }
                        
                        // Abrir el documento usando la API expuesta globalmente en viewer.html
                        if (window.PDFViewerApplication) {
                            window.PDFViewerApplication.open({ data: bytes });
                            window.PDFViewerApplication.setTitleUsingUrl(result.pdf_bridge_name || "Documento Local");
                        }
                        
                        // Opcional: limpiar la memoria
                        chrome.storage.local.remove(['pdf_bridge_data', 'pdf_bridge_name']);
                    } catch (e) {
                        console.error("Error cargando PDF local vía bridge:", e);
                    }
                }
            });
        }
    }, 500);
  }
});
