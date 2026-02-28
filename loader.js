document.addEventListener('DOMContentLoaded', async () => {
    const statusText = document.getElementById('status-text');
    const errorMsg = document.getElementById('error-msg');
    const spinner = document.getElementById('spinner');

    const urlParams = new URLSearchParams(window.location.search);
    const targetUrl = urlParams.get('target');

    if (!targetUrl) {
        showError("No se especificó ningún PDF para cargar.");
        return;
    }
    
    // Mostramos solo el nombre del archivo para que se vea más limpio
    const fileName = targetUrl.split('/').pop().split('?')[0] || "Documento Web";
    statusText.innerText = `Descargando: ${fileName}...`;

    try {
        // En extension chrome fetch desde una pagina empaquetada (<all_urls> grant) bypassea CORS
        console.log("Iniciando fetch hacia:", targetUrl);
        const response = await fetch(targetUrl);
        
        if (!response.ok) {
            throw new Error(`Servidor denegó la descarga: Error ${response.status} ${response.statusText}`);
        }

        const blob = await response.blob();
        if (blob.type !== "application/pdf" && !fileName.endsWith('.pdf')) {
             console.warn("La respuesta no tiene Type PDF explícito, pero procederemos de todas formas.");
        }

        const reader = new FileReader();
        reader.onloadend = async function(e) {
            const base64Data = e.target.result;
            
            // Guardamos el PDF usando exactamente el mismo puente que popup.js
            await chrome.storage.local.set({ 
                'pdf_bridge_data': base64Data, 
                'pdf_bridge_name': fileName 
            });
            
            // Validamos si hay conexión a Internet
            // ACTUALIZACIÓN PWA: Ahora SIEMPRE apuntamos a Netlify. 
            // Si el usuario está offline, el Service Worker de Netlify interceptará la petición.
            let viewerUrl = "https://reader01.netlify.app/web/viewer.html?file=localBridge";
            
            if (navigator.onLine) {
                 statusText.innerText = "¡PDF listo! Redirigiendo a Netlify...";
            } else {
                 statusText.innerText = "¡PDF descargado! Redirigiendo a Netlify (Caché Offline)...";
            }
            
            // Reemplazamos esta ventana de carga con nuestro Visor Final
            window.location.replace(viewerUrl);
        };
        
        reader.onerror = () => {
            throw new Error("No se pudo convertir el PDF descargado.");
        };

        // Convertimos el blob en Base64 para guardarlo
        reader.readAsDataURL(blob);

    } catch (err) {
        console.error(err);
        showError("Error al descargar el archivo: " + err.message);
    }
    
    function showError(msg) {
        spinner.style.display = 'none';
        errorMsg.innerText = msg;
        errorMsg.style.display = 'block';
    }
});
