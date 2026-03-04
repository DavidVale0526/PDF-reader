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
            
            const uniqueId = Date.now().toString();
            await cleanupOldPdfs();

            // Guardar el PDF en el storage local para que el visor lo pueda leer posteriormente
            const dataKey = `pdf_bridge_data_${uniqueId}`;
            const nameKey = `pdf_bridge_name_${uniqueId}`;

            await chrome.storage.local.set({ 
                [dataKey]: base64Data, 
                [nameKey]: file.name 
            });
            
            // NOTA: Aquí predeterminadamente abrimos el visor de la extensión.
            // Puesto que mencionas que usarás un método para que la URL sea HTTPS, 
            // esta URL debe ajustarse al destino final de tu HTTPS si lo vas a abrir automáticamente.
            
            // Validamos si hay conexión a Internet
            // ACTUALIZACIÓN PWA: Ahora SIEMPRE apuntamos a Netlify. 
            // Si el usuario está offline, el Service Worker de Netlify interceptará 
            // la petición y cargará la página desde el caché.
            const viewerUrl = `https://reader01.netlify.app/web/viewer.html?file=localBridge&id=${uniqueId}`;
            
            await chrome.tabs.create({ url: viewerUrl });
            
            statusEl.innerText = navigator.onLine ? "¡Visualizador PWA abierto!" : "¡Visualizador PWA (Caché Offline) activado!";
            
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

async function cleanupOldPdfs() {
    return new Promise((resolve) => {
        chrome.storage.local.get(null, (items) => {
            const pdfKeys = Object.keys(items)
                .filter(key => key.startsWith('pdf_bridge_data_'))
                .map(key => ({
                    key: key,
                    nameKey: key.replace('data', 'name'),
                    time: parseInt(key.split('_').pop(), 10) || 0
                }))
                .sort((a, b) => b.time - a.time);

            if (pdfKeys.length > 5) {
                const keysToRemove = [];
                for (let i = 5; i < pdfKeys.length; i++) {
                    keysToRemove.push(pdfKeys[i].key);
                    keysToRemove.push(pdfKeys[i].nameKey);
                }
                chrome.storage.local.remove(keysToRemove, resolve);
            } else {
                resolve();
            }
        });
    });
}
