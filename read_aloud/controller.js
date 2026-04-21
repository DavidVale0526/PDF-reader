class ReadAloudController {
    constructor(model, view) {
        this.model = model;
        this.view = view;
        
        this.view.setCallbacks(
            () => this.handlePlayClick(),
            () => this.handleStopClick(),
            (voiceURI) => this.handleVoiceChange(voiceURI)
        );

        this.model.setCallbacks(
            (state) => this.view.updateState(state),
            (e) => this.handleBoundary(e),
            (voices) => {
                if(this.view.isRendered){
                    this.view.populateVoices(voices, this.model.selectedVoice?.voiceURI)
                }
            }
        );

        this.view.createButton(() => {
            this.view.show();
            // Llenar por primera vez al abrir
            this.view.populateVoices(this.model.getVoices(), this.model.selectedVoice?.voiceURI);
        });
    }

    handlePlayClick() {
        if (this.model.isPlaying) {
            this.model.pause();
        } else if (this.model.isPaused) {
            this.model.play(); // resume context
        } else {
            // New play context
            const textToRead = this.extractTextToRead();
            if (textToRead) {
                this.model.play(textToRead);
            } else {
                console.warn("[ReadAloud] No hay texto para leer.");
            }
        }
    }

    handleVoiceChange(voiceURI) {
        this.model.setVoice(voiceURI);
        // Si estaba leyendo, detenerlo para aplicar el cambio
        if (this.model.isPlaying || this.model.isPaused) {
             this.model.stop();
        }
    }

    extractTextToRead() {
        // 1. Prioridad: Texto seleccionado por el usuario
        const selection = window.getSelection();
        const selectedText = selection.toString().trim();
        
        if (selectedText.length > 0) {
            return selectedText;
        }

        // 2. Fallback: Extracción de página visible en PDF.js
        const activePages = document.querySelectorAll('.page[data-page-number]');
        const pagesToRead = Array.from(activePages);
        
        // Tratar de obtener la primera página visible en el viewport
        const visiblePage = pagesToRead.find(p => {
            const rect = p.getBoundingClientRect();
            // Comprobación simple de visibilidad
            return rect.top < window.innerHeight && rect.bottom > 0;
        });

        const targetPage = visiblePage || pagesToRead[0];
        
        if (targetPage) {
            const textLayer = targetPage.querySelector('.textLayer');
            if (textLayer) {
                return textLayer.innerText || textLayer.textContent;
            }
        }
        
        return null;
    }

    handleBoundary(event) {
        // Para implementación futura: resaltado dinámico de texto hablado
    }
}

window.ReadAloudController = ReadAloudController;

// Inicialización
console.log("[ReadAloud] Cargando script...");
setTimeout(() => {
    console.log("[ReadAloud] Inicializando MVC...");
    try {
        const model = new ReadAloudModel();
        const view = new ReadAloudView();
        const controller = new ReadAloudController(model, view);
    } catch(e) {
        console.error("[ReadAloud] Error al iniciar:", e);
    }
}, 1500);
