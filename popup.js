document.getElementById('pdfUpload').addEventListener('change', async (event) => {
    const file = event.target.files[0];
    const statusEl = document.getElementById('status');
    const errorEl = document.getElementById('error-status');
    
    statusEl.style.display = 'none';
    errorEl.style.display = 'none';
    
    if (!file || file.type !== 'application/pdf') {
        errorEl.innerText = "Por favor, selecciona un archivo PDF válido.";
        errorEl.style.display = 'block';
        return;
    }

    statusEl.style.display = 'block';

    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const base64Data = e.target.result;
            
            // Guardar el PDF en el storage local para que el visor lo pueda leer posteriormente
            await chrome.storage.local.set({ 
                'pdf_bridge_data': base64Data, 
                'pdf_bridge_name': file.name 
            });
            
            // NOTA: Aquí predeterminadamente abrimos el visor de la extensión.
            // Puesto que mencionas que usarás un método para que la URL sea HTTPS, 
            // esta URL debe ajustarse al destino final de tu HTTPS si lo vas a abrir automáticamente.
            
            // Validamos si hay conexión a Internet
            let viewerUrl = "";
            if (navigator.onLine) {
                 viewerUrl = "https://reader01.netlify.app/web/viewer.html?file=localBridge";
            } else {
                 console.log("No hay conexión a Internet. Usando visor PDF empaquetado localmente.");
                 viewerUrl = chrome.runtime.getURL('web/viewer.html') + "?file=localBridge";
            }
            
            await chrome.tabs.create({ url: viewerUrl });
            
            statusEl.innerText = navigator.onLine ? "¡Visualizador online abierto!" : "¡Visualizador Offline activado!";
            
            // Cerrar el popup después de 1 segundo de éxito
            setTimeout(() => window.close(), 1000);

        } catch (err) {
            errorEl.innerText = "Error procesando el PDF: " + err.message;
            errorEl.style.display = 'block';
            statusEl.style.display = 'none';
        }
    };
    
    reader.onerror = () => {
        errorEl.innerText = "Hubo un error al leer el archivo seleccionado.";
        errorEl.style.display = 'block';
        statusEl.style.display = 'none';
    };

    // Leer el archivo como Data URL (Base64) - útil para saltar CORS y pasarlo de forma segura
    reader.readAsDataURL(file);
});
