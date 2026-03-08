class TranslatorController {
    constructor(model, view) {
        this.model = model;
        this.view = view;

        const initialSettings = {
            apiKey: this.model.apiKey,
            model: this.model.model,
            sourceLang: this.model.sourceLang,
            targetLang: this.model.targetLang
        };

        this.view.createButton(() => this.handleOpenTranslate());
        this.view.createModal(
            () => this.handleTranslateLarge(),
            () => this.handleTranslateGoogle(),
            (apiKey, model, sourceLang, targetLang) => this.model.saveSettings(apiKey, model, sourceLang, targetLang),
            initialSettings
        );
    }

    async handleOpenTranslate() {
        this.view.showModal();
        // Ya no es necesario mostrar en un textarea si hubo texto o no al abrir.
    }

    async handleTranslateLarge() {
        this.view.setLoading(true, 'btn-trans-large');
        this.view.showReader();
        this.view.setReaderText("Extrayendo texto y traduciendo con Gemini...\n\nPor favor espera un momento.");
        
        try {
            const text = await this.model.getPageText();
            if (!text || text.trim() === '') {
                throw new Error("No hay texto para traducir.");
            }
            const translation = await this.model.translateWithGemini(text);
            this.view.setReaderText(translation);
        } catch (error) {
            this.view.setReaderText("Error de Traducción: " + error.message, true);
        } finally {
            this.view.setLoading(false, 'btn-trans-large');
        }
    }

    async handleTranslateGoogle() {
        try {
            const text = await this.model.getPageText();
            if (!text || text.trim() === '') {
                alert("No hay texto para traducir en esta página.");
                return;
            }
            const url = this.model.getGoogleTranslateUrl(text);
            window.open(url, '_blank');
        } catch (error) {
            alert("Error: " + error.message);
        }
    }
}

// Bootstrap
console.log("[Translator] Inicializando MVC...");
setTimeout(() => {
    const model = new TranslatorModel();
    const view = new TranslatorView();
    const controller = new TranslatorController(model, view);
}, 1000);
