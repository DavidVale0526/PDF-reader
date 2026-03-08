// Este script se inyecta en la página del visor de Netlify para hacer de puente 
// entre el almacenamiento local de la extensión y la página web.
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get("file") === "localBridge") {
  console.log("[Bridge] Detectado parámetro localBridge, inyectando content script...");

  const docId = urlParams.get("id");
  const dataKey = docId ? `pdf_bridge_data_${docId}` : 'pdf_bridge_data';
  const nameKey = docId ? `pdf_bridge_name_${docId}` : 'pdf_bridge_name';

  // Extraer el archivo PDF del storage de Chrome
  chrome.storage.local.get([dataKey, nameKey], (result) => {
      const pdfData = result[dataKey];
      const pdfName = result[nameKey];

      if (pdfData) {
          console.log("[Bridge] PDF interceptado de chrome.storage exitosamente.");
          // Inyectamos un script directamente al DOM principal (Main World)
          // Ya que el content script corre en un ambiente aislado (Isolated World)
          // En lugar de script inline (que dispara CSP), creamos un tag referenciando a injector.js
          const script = document.createElement('script');
          script.src = chrome.runtime.getURL("injector.js");
          document.documentElement.appendChild(script);

          // Inyectamos el traductor MVC secuencialmente
          const loadScript = (src) => {
              return new Promise(resolve => {
                  const s = document.createElement('script');
                  s.src = chrome.runtime.getURL(src);
                  s.onload = resolve;
                  document.documentElement.appendChild(s);
              });
          };

          const cssLink = document.createElement('link');
          cssLink.rel = 'stylesheet';
          cssLink.href = chrome.runtime.getURL('translator/styles.css');
          document.head.appendChild(cssLink);

          (async () => {
              await loadScript('translator/model.js');
              await loadScript('translator/view.js');
              await loadScript('translator/controller.js');
              console.log("[Bridge] MVC Traductor inyectado.");
          })();
          
          // Enviamos los binarios desde el Isolated World -> Main World Front-End
          // Agregamos un pequeñísimo delay para que el script inyectado alcance a registrar el listener de mensajes
          setTimeout(() => {
              console.log("[Bridge] Emitiendo postMessage al visor de Netlify...");
              window.postMessage({
                  type: "INJECT_PDF_BRIDGE",
                  pdfData: pdfData,
                  pdfName: pdfName
              }, "*");
              
              // [MODIFICADO]: Ya NO borramos los datos de storage.
              // De esta manera habilitamos la "Persistencia Local", permitiendo que el visor recargue la página F5 
              // sin perder el archivo, ya que volverá a sacarlo de aquí.
              // chrome.storage.local.remove([dataKey, nameKey]);
          }, 100);
          
      } else {
        console.error(`[Bridge] No se encontró '${dataKey}' en storage.`);
      }
  });
}
