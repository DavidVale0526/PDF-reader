class LiquidView {
    constructor() {
        this.container = null;
        this.contentArea = null;
        this.toggleBtn = null;
    }

    createButton(onClick) {
        console.log("[LiquidView] Esperando toolbar...");
        const checkToolbar = setInterval(() => {
            const toolbar = document.getElementById('toolbarViewerRight');
            if (toolbar) {
                console.log("[LiquidView] Toolbar encontrado. Inyectando botón...");
                clearInterval(checkToolbar);
                this.toggleBtn = document.createElement('button');
                this.toggleBtn.className = 'toolbarButton liquid-btn';
                this.toggleBtn.title = 'Liquid Mode (Vista Móvil)';
                this.toggleBtn.innerHTML = '<span>📱 Liquid</span>';
                this.toggleBtn.addEventListener('click', onClick);
                
                // Insertarlo antes del traductor o al inicio
                toolbar.prepend(this.toggleBtn);
            }
        }, 500);
    }

    createModal(onSaveSettings, initialSettings) {
        this.container = document.createElement('div');
        this.container.id = 'liquid-mode-container';
        this.container.className = `liquid-container hidden theme-${initialSettings.theme}`;
        
        this.container.innerHTML = `
            <div class="liquid-header">
                <div class="liquid-controls">
                    <button id="lq-font-decrease" class="lq-btn" title="Reducir Texto">A-</button>
                    <button id="lq-font-increase" class="lq-btn" title="Aumentar Texto">A+</button>
                    <div class="lq-themes">
                        <button class="lq-theme-btn light" data-theme="light"></button>
                        <button class="lq-theme-btn sepia" data-theme="sepia"></button>
                        <button class="lq-theme-btn dark" data-theme="dark"></button>
                    </div>
                </div>
                <button id="liquid-close" class="lq-close-btn">&times;</button>
            </div>
            <div id="liquid-content-area" class="liquid-content" style="font-size: ${initialSettings.fontSize}px;">
                <!-- El contenido dinámico se inyectará aquí -->
            </div>
            <div class="liquid-footer">
                <button id="liquid-prev-page" class="lq-nav-btn">Página Anterior</button>
                <span id="liquid-page-info">Pág --</span>
                <button id="liquid-next-page" class="lq-nav-btn">Siguiente Página</button>
            </div>
        `;

        document.body.appendChild(this.container);
        this.contentArea = document.getElementById('liquid-content-area');

        // Eventos Base
        document.getElementById('liquid-close').addEventListener('click', () => this.hide());
        
        // Eventos de Settings
        const updateFontSize = (delta) => {
            let currentSize = parseInt(this.contentArea.style.fontSize) || 18;
            currentSize = Math.max(12, Math.min(48, currentSize + delta));
            this.contentArea.style.fontSize = currentSize + 'px';
            
            const currentTheme = Array.from(this.container.classList)
                                     .find(c => c.startsWith('theme-'))?.replace('theme-', '') || 'light';
                                     
            onSaveSettings(currentSize, currentTheme);
        };

        document.getElementById('lq-font-decrease').addEventListener('click', () => updateFontSize(-2));
        document.getElementById('lq-font-increase').addEventListener('click', () => updateFontSize(2));

        const themeBtns = this.container.querySelectorAll('.lq-theme-btn');
        themeBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const newTheme = e.target.dataset.theme;
                const currentSize = parseInt(this.contentArea.style.fontSize) || 18;
                
                this.container.classList.remove('theme-light', 'theme-sepia', 'theme-dark');
                this.container.classList.add(`theme-${newTheme}`);
                
                onSaveSettings(currentSize, newTheme);
            });
        });
    }

    renderBlocks(blocks, pageNum) {
        this.contentArea.innerHTML = '';
        
        if (blocks.length === 0) {
            this.contentArea.innerHTML = '<p class="lq-empty">No se encontró texto estructurado en esta página.</p>';
        } else {
            blocks.forEach(block => {
                const el = document.createElement(block.type === 'heading' ? 'h2' : 'p');
                el.className = `lq-${block.type}`;
                el.textContent = block.text;
                this.contentArea.appendChild(el);
            });
        }
        
        document.getElementById('liquid-page-info').textContent = `Pág ${pageNum}`;
    }

    showLoading() {
        this.contentArea.innerHTML = '<div class="lq-loading">Extrayendo texto de la página...</div>';
    }

    showError(msg) {
        this.contentArea.innerHTML = `<div class="lq-error">${msg}</div>`;
    }

    show() {
        if (this.container) {
            this.container.classList.remove('hidden');
            document.body.style.overflow = 'hidden'; // Evitar scroll del PDF debajo
        }
    }

    hide() {
        if (this.container) {
            this.container.classList.add('hidden');
            document.body.style.overflow = '';
        }
    }
    
    isActive() {
        return this.container && !this.container.classList.contains('hidden');
    }
}
