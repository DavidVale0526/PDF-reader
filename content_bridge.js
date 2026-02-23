// Este script se inyecta en la página del visor de Netlify para hacer de puente 
// entre el almacenamiento local de la extensión y la página web.
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get("file") === "localBridge") {
  console.log("[Bridge] Detectado parámetro localBridge, inyectando content script...");
  // Extraer el archivo PDF del storage de Chrome
  chrome.storage.local.get(['pdf_bridge_data', 'pdf_bridge_name'], (result) => {
      if (result.pdf_bridge_data) {
          console.log("[Bridge] PDF interceptado de chrome.storage exitosamente.");
          // Inyectamos un script directamente al DOM principal (Main World)
          // Ya que el content script corre en un ambiente aislado (Isolated World)
          // En lugar de script inline (que dispara CSP), creamos un tag referenciando a injector.js
          const script = document.createElement('script');
          script.src = chrome.runtime.getURL("injector.js");
          document.documentElement.appendChild(script);
          
          // Enviamos los binarios desde el Isolated World -> Main World Front-End
          // Agregamos un pequeñísimo delay para que el script inyectado alcance a registrar el listener de mensajes
          setTimeout(() => {
              console.log("[Bridge] Emitiendo postMessage al visor de Netlify...");
              window.postMessage({
                  type: "INJECT_PDF_BRIDGE",
                  pdfData: result.pdf_bridge_data,
                  pdfName: result.pdf_bridge_name
              }, "*");
              
              // Limpiamos los datos de storage para ahorrar espacio
              chrome.storage.local.remove(['pdf_bridge_data', 'pdf_bridge_name']);
          }, 100);
          
      } else {
        console.error("[Bridge] No se encontró 'pdf_bridge_data' en storage.");
      }
  });
}
