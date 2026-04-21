/**
 * popup.js — Lógica del popup de la extensión
 *
 * Expone dos modos de apertura:
 *
 *  Modo 1 — Upload:
 *    El usuario selecciona un PDF local. Se codifica en Base64, se guarda
 *    en chrome.storage.local y se abre el visor de Netlify (PWA) como destino.
 *    Funciona bien en desktop. En Android puede presentar problemas de CORS/descarga.
 *
 *  Modo 2 — Visor Directo:
 *    Abre directamente web/viewer.html (PDF.js local empaquetado en la extensión)
 *    sin ningún archivo precargado. El usuario usa el botón nativo "Abrir archivo"
 *    del propio visor para cargar un PDF desde el sistema de archivos del dispositivo.
 *    Solución recomendada en Android: evita cualquier intercepción de red o descarga.
 */

// ─── Utilidades comunes ────────────────────────────────────────────────────────

const statusEl     = document.getElementById('status');
const errorEl      = document.getElementById('error-status');

/** Muestra un mensaje de error en el popup. */
function showError(msg) {
    errorEl.innerText = msg;
    errorEl.style.display = 'block';
    statusEl.style.display = 'none';
}

/** Muestra un mensaje de éxito y cierra el popup tras un breve delay. */
function showSuccess(msg) {
    statusEl.innerText = msg;
    statusEl.style.display = 'block';
    errorEl.style.display = 'none';
    setTimeout(() => window.close(), 1200);
}

/**
 * Elimina del storage entradas antiguas de PDFs, conservando solo las 5 más recientes.
 * Evita que el storage crezca indefinidamente con archivos Base64 pesados.
 */
async function cleanupOldPdfs() {
    return new Promise((resolve) => {
        chrome.storage.local.get(null, (items) => {
            const pdfKeys = Object.keys(items)
                .filter(key => key.startsWith('pdf_bridge_data_'))
                .map(key => ({
                    key:     key,
                    nameKey: key.replace('data', 'name'),
                    time:    parseInt(key.split('_').pop(), 10) || 0
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


// ─── Modo 1: Upload de archivo (Visor Netlify PWA) ────────────────────────────

document.getElementById('pdfUpload').addEventListener('change', async (event) => {
    const file = event.target.files[0];

    statusEl.style.display = 'none';
    errorEl.style.display  = 'none';

    if (!file || file.type !== 'application/pdf') {
        showError('Por favor, selecciona un archivo PDF válido.');
        return;
    }

    statusEl.innerText     = 'Procesando archivo...';
    statusEl.style.display = 'block';

    const reader = new FileReader();

    reader.onload = async (e) => {
        try {
            const base64Data = e.target.result;
            const uniqueId   = Date.now().toString();

            await cleanupOldPdfs();

            await chrome.storage.local.set({
                [`pdf_bridge_data_${uniqueId}`]: base64Data,
                [`pdf_bridge_name_${uniqueId}`]: file.name
            });

            const viewerUrl = `https://reader01.netlify.app/web/viewer.html?file=localBridge&id=${uniqueId}`;
            await chrome.tabs.create({ url: viewerUrl });

            showSuccess(navigator.onLine ? '¡Visualizador abierto!' : '¡Visualizador (Caché Offline) activado!');

        } catch (err) {
            showError('Error al procesar el PDF: ' + err.message);
        }
    };

    reader.onerror = () => {
        showError('No se pudo leer el archivo seleccionado.');
    };

    reader.readAsDataURL(file);
});


// ─── Modo 2: Visor Directo (PDF.js local, ideal para Android) ─────────────────

document.getElementById('btnOpenViewer').addEventListener('click', async () => {
    try {
        // Abre el visor PDF.js empaquetado en la extensión sin ningún archivo
        // precargado. El usuario usará el botón "Abrir archivo" nativo del visor.
        const viewerUrl = chrome.runtime.getURL('web/viewer.html');
        await chrome.tabs.create({ url: viewerUrl });
        window.close();
    } catch (err) {
        showError('No se pudo abrir el visor: ' + err.message);
    }
});
