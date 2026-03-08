class TranslatorModel {
    constructor() {
        this.apiKey = localStorage.getItem('translator_api_key') || '';
        this.model = localStorage.getItem('translator_model') || 'gemini-3-flash-preview';
        this.sourceLang = localStorage.getItem('translator_source_lang') || 'auto';
        this.targetLang = localStorage.getItem('translator_target_lang') || 'es';
    }

    saveSettings(apiKey, model, sourceLang, targetLang) {
        this.apiKey = apiKey;
        this.model = model;
        this.sourceLang = sourceLang;
        this.targetLang = targetLang;
        localStorage.setItem('translator_api_key', apiKey);
        localStorage.setItem('translator_model', model);
        localStorage.setItem('translator_source_lang', sourceLang);
        localStorage.setItem('translator_target_lang', targetLang);
    }

    async getPageText() {
        if (!window.PDFViewerApplication || !window.PDFViewerApplication.pdfDocument) {
            throw new Error("El documento PDF no está cargado.");
        }
        const pageNum = window.PDFViewerApplication.page;
        const page = await window.PDFViewerApplication.pdfDocument.getPage(pageNum);
        const textContent = await page.getTextContent();
        const text = textContent.items.map(item => item.str).join(' ');
        return text;
    }

    async translateWithGemini(text) {
        if (!this.apiKey) {
            throw new Error("No hay API Key configurada para Gemini.");
        }
        const prompt = `Traducción del ${this.sourceLang === 'auto' ? 'idioma detectado automáticamente' : this.sourceLang} al ${this.targetLang}. Solo proporciona la traducción, sin texto adicional.\n\nTexto a traducir:\n${text}`;
        
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: prompt }]
                }]
            })
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error?.message || "Error en la API de Gemini");
        }

        const data = await response.json();
        return data.candidates[0].content.parts[0].text;
    }

    getGoogleTranslateUrl(text) {
        let sl = this.sourceLang;
        let tl = this.targetLang;
        const encodedText = encodeURIComponent(text);
        return `https://translate.google.com/?sl=${sl}&tl=${tl}&text=${encodedText}&op=translate`;
    }
}
