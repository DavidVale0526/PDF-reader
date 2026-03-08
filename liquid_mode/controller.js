class LiquidController {
    constructor(model, view) {
        this.model = model;
        this.view = view;

        const initialSettings = {
            fontSize: this.model.fontSize,
            theme: this.model.theme
        };

        this.view.createButton(() => this.toggleLiquidMode());
        this.view.createModal(
            (fontSize, theme) => this.model.saveSettings(fontSize, theme),
            initialSettings
        );
        
        this.bindNavigationEvents();
    }
    
    bindNavigationEvents() {
        // Enlazar botones prev/next del PDF nativo a la UI de Liquid Mode
        document.getElementById('liquid-prev-page').addEventListener('click', async () => {
            if (window.PDFViewerApplication.page > 1) {
                window.PDFViewerApplication.page--;
                await this.refreshPage();
            }
        });
        
        document.getElementById('liquid-next-page').addEventListener('click', async () => {
            if (window.PDFViewerApplication.page < window.PDFViewerApplication.pagesCount) {
                window.PDFViewerApplication.page++;
                await this.refreshPage();
            }
        });
        
        // Opcional: Escuchar cambio de página desde el visor PDF si Liquid mode está activo
        window.addEventListener('pagechanging', async (evt) => {
            if (this.view.isActive()) {
                await this.refreshPage();
            }
        });
    }

    async toggleLiquidMode() {
        if (this.view.isActive()) {
            this.view.hide();
        } else {
            this.view.show();
            await this.refreshPage();
        }
    }
    
    async refreshPage() {
        this.view.showLoading();
        try {
            const blocks = await this.model.extractStructuredText();
            const currentPage = window.PDFViewerApplication.page;
            this.view.renderBlocks(blocks, currentPage);
        } catch (error) {
            console.error(error);
            this.view.showError("Error al procesar el visor PDF: " + error.message);
        }
    }
}

// Bootstrap
console.log("[LiquidMode] Inicializando MVC...");
setTimeout(() => {
    const model = new LiquidModel();
    const view = new LiquidView();
    const controller = new LiquidController(model, view);
}, 1100); // 100ms después del traductor
