/**
 * Extrae la URL del PDF del query string de forma robusta.
 *
 * Dos fuentes posibles con formatos distintos:
 *  - declarativeNetRequest (DNR): URL cruda, sin codificar.
 *    Ej: ?target=https://example.com/doc.pdf?v=1
 *  - webNavigation fallback: URL con encodeURIComponent.
 *    Ej: ?target=https%3A%2F%2Fexample.com%2Fdoc.pdf%3Fv%3D1
 *
 * Solución: leer todo lo que hay después de "target=" (para no romper con
 * '&' sin codificar en la URL cruda) y luego intentar decodificar.
 * decodeURIComponent es idempotente en strings sin secuencias %XX, por lo
 * que funciona correctamente en ambos casos.
 *
 * @param {string} search - window.location.search
 * @returns {string|null}
 */
function extractTargetUrl(search) {
    const targetIndex = search.indexOf('target=');
    if (targetIndex < 0) return null;

    // Tomamos todo desde 'target=' hacia adelante para preservar '&' crudos
    const rawValue = search.substring(targetIndex + 7);
    try {
        return decodeURIComponent(rawValue);
    } catch {
        // Si la decodificación falla (% mal formado), usar el valor crudo
        return rawValue;
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    const statusText = document.getElementById('status-text');
    const errorMsg = document.getElementById('error-msg');
    const spinner = document.getElementById('spinner');

    const targetUrl = extractTargetUrl(window.location.search);

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
        // Incluir credenciales para permitir la descarga de PDFs protegidos/autenticados que usen cookies
        const response = await fetch(targetUrl, { credentials: 'include' });
        
        if (!response.ok) {
            throw new Error(`Servidor denegó la descarga: Error ${response.status} ${response.statusText}`);
        }

        const blob = await response.blob();
        
        // Detectar si la respuesta es HTML (página web, posiblemente un error o inicio de sesión)
        if (blob.type.includes("text/html")) {
            throw new Error("El servidor devolvió una página web, posiblemente porque el PDF o la página requiere una sesión activa, está protegido o el enlace ha caducado. Intenta abrirlo en una ventana normal primero.");
        }

        if (blob.type !== "application/pdf" && !fileName.endsWith('.pdf')) {
             console.warn("La respuesta no tiene Type PDF explícito, pero procederemos de todas formas.");
        }

        const reader = new FileReader();
        reader.onloadend = async function(e) {
            const base64Data = e.target.result;
            
            const uniqueId = Date.now().toString();
            await cleanupOldPdfs();

            // Guardamos el PDF usando el ID temporal para evitar la sobrescritura de otra pestaña
            const dataKey = `pdf_bridge_data_${uniqueId}`;
            const nameKey = `pdf_bridge_name_${uniqueId}`;

            await chrome.storage.local.set({ 
                [dataKey]: base64Data, 
                [nameKey]: fileName 
            });
            
            // Validamos si hay conexión a Internet
            // ACTUALIZACIÓN PWA: Ahora SIEMPRE apuntamos a Netlify. 
            // Si el usuario está offline, el Service Worker de Netlify interceptará la petición.
            let viewerUrl = `https://reader01.netlify.app/web/viewer.html?file=localBridge&id=${uniqueId}`;
            
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
