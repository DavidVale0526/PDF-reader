class TranslatorView {
    constructor() {
        this.modal = null;
        this.translateBtn = null;
    }

    createButton(onClick) {
        // Wait for PDF.js toolbar to be ready
        const checkToolbar = setInterval(() => {
            const toolbar = document.getElementById('toolbarViewerRight');
            if (toolbar) {
                clearInterval(checkToolbar);
                this.translateBtn = document.createElement('button');
                this.translateBtn.className = 'toolbarButton translator-btn';
                this.translateBtn.title = 'Traducir página actual';
                this.translateBtn.innerHTML = '<span>🌐 Traducir</span>';
                this.translateBtn.addEventListener('click', onClick);
                
                toolbar.prepend(this.translateBtn);
            }
        }, 500);
    }

    createModal(onTranslateLarge, onTranslateGoogle, onSaveSettings, initialSettings) {
        this.modal = document.createElement('div');
        this.modal.id = 'translator-modal';
        this.modal.className = 'translator-modal hidden';
        
        this.modal.innerHTML = `
            <div class="translator-content">
                <div class="translator-header">
                    <h3>Traductor MVC</h3>
                    <button class="close-btn" id="translator-close">&times;</button>
                </div>
                <div class="translator-body">
                    <div class="settings-section">
                        <h4>Configuración</h4>
                        <div class="input-group">
                            <label>API Key (Gemini):</label>
                            <input type="password" id="trans-api-key" value="${initialSettings.apiKey}" placeholder="AIzaSy...">
                        </div>
                        <div class="input-group">
                            <label>Modelo:</label>
                            <select id="trans-model">
                                <option value="gemini-3-flash-preview" ${initialSettings.model === 'gemini-3-flash-preview' ? 'selected' : ''}>Gemini 3 Flash Preview</option>
                                <option value="gemini-flash-latest" ${initialSettings.model === 'gemini-flash-latest' ? 'selected' : ''}>Gemini Flash Latest</option>
                                <option value="gemini-2.0-flash-lite" ${initialSettings.model === 'gemini-2.0-flash-lite' ? 'selected' : ''}>Gemini 2.0 Flash Lite</option>
                            </select>
                        </div>
                        <div class="input-group row">
                            <div>
                                <label>Origen:</label>
                                <select id="trans-source">
                                    <option value="auto" ${initialSettings.sourceLang === 'auto' ? 'selected' : ''}>Detectar</option>
                                    <option value="en" ${initialSettings.sourceLang === 'en' ? 'selected' : ''}>Inglés</option>
                                    <option value="es" ${initialSettings.sourceLang === 'es' ? 'selected' : ''}>Español</option>
                                    <option value="fr" ${initialSettings.sourceLang === 'fr' ? 'selected' : ''}>Francés</option>
                                    <option value="de" ${initialSettings.sourceLang === 'de' ? 'selected' : ''}>Alemán</option>
                                    <option value="it" ${initialSettings.sourceLang === 'it' ? 'selected' : ''}>Italiano</option>
                                    <option value="pt" ${initialSettings.sourceLang === 'pt' ? 'selected' : ''}>Portugués</option>
                                    <option value="ru" ${initialSettings.sourceLang === 'ru' ? 'selected' : ''}>Ruso</option>
                                    <option value="zh-CN" ${initialSettings.sourceLang === 'zh-CN' ? 'selected' : ''}>Chino</option>
                                    <option value="ja" ${initialSettings.sourceLang === 'ja' ? 'selected' : ''}>Japonés</option>
                                </select>
                            </div>
                            <div>
                                <label>Destino:</label>
                                <select id="trans-target">
                                    <option value="es" ${initialSettings.targetLang === 'es' ? 'selected' : ''}>Español</option>
                                    <option value="en" ${initialSettings.targetLang === 'en' ? 'selected' : ''}>Inglés</option>
                                    <option value="fr" ${initialSettings.targetLang === 'fr' ? 'selected' : ''}>Francés</option>
                                    <option value="de" ${initialSettings.targetLang === 'de' ? 'selected' : ''}>Alemán</option>
                                    <option value="it" ${initialSettings.targetLang === 'it' ? 'selected' : ''}>Italiano</option>
                                    <option value="pt" ${initialSettings.targetLang === 'pt' ? 'selected' : ''}>Portugués</option>
                                    <option value="ru" ${initialSettings.targetLang === 'ru' ? 'selected' : ''}>Ruso</option>
                                    <option value="zh-CN" ${initialSettings.targetLang === 'zh-CN' ? 'selected' : ''}>Chino</option>
                                    <option value="ja" ${initialSettings.targetLang === 'ja' ? 'selected' : ''}>Japonés</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    <div class="actions-section">
                        <button id="btn-trans-large" class="btn primary">📖 Traducir en Modo Lectura</button>
                        <button id="btn-trans-google" class="btn outline">Abrir Google Translate</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(this.modal);

        // Add reader modal
        this.readerModal = document.createElement('div');
        this.readerModal.id = 'translator-reader-modal';
        this.readerModal.className = 'translator-modal hidden';
        this.readerModal.innerHTML = `
            <div class="translator-reader-content">
                <div class="translator-header">
                    <h3>Traducción - Modo Lectura</h3>
                    <button class="close-btn" id="reader-close">&times;</button>
                </div>
                <div class="translator-reader-body">
                    <div id="reader-text" class="reader-text">La traducción aparecerá aquí...</div>
                </div>
            </div>
        `;
        document.body.appendChild(this.readerModal);

        // Events
        document.getElementById('translator-close').addEventListener('click', () => this.hideModal());
        document.getElementById('reader-close').addEventListener('click', () => this.hideReader());
        
        document.getElementById('btn-trans-large').addEventListener('click', () => {
            onSaveSettings(
                document.getElementById('trans-api-key').value,
                document.getElementById('trans-model').value,
                document.getElementById('trans-source').value,
                document.getElementById('trans-target').value
            );
            onTranslateLarge();
        });

        document.getElementById('btn-trans-google').addEventListener('click', () => {
            onSaveSettings(
                document.getElementById('trans-api-key').value,
                document.getElementById('trans-model').value,
                document.getElementById('trans-source').value,
                document.getElementById('trans-target').value
            );
            onTranslateGoogle();
        });
    }

    showReader() {
        if (this.readerModal) this.readerModal.classList.remove('hidden');
    }

    hideReader() {
        if (this.readerModal) this.readerModal.classList.add('hidden');
    }

    setReaderText(text, isError = false) {
        const readerText = document.getElementById('reader-text');
        if (readerText) {
            readerText.textContent = text;
            readerText.style.color = isError ? '#dc3545' : '#111111';
        }
    }

    showModal() {
        if (this.modal) this.modal.classList.remove('hidden');
    }

    hideModal() {
        if (this.modal) this.modal.classList.add('hidden');
    }

    setLoading(isLoading, btnId = 'btn-trans-large') {
        const btn = document.getElementById(btnId);
        if (btn) {
            btn.disabled = isLoading;
            if (isLoading) {
                btn.dataset.originalText = btn.innerHTML;
                btn.innerText = 'Traduciendo...';
            } else {
                btn.innerHTML = btn.dataset.originalText || 'Traducir';
            }
        }
    }
}
