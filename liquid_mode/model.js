class LiquidModel {
    constructor() {
        this.fontSize = parseInt(localStorage.getItem('liquid_font_size')) || 18;
        this.theme = localStorage.getItem('liquid_theme') || 'light';
    }

    saveSettings(fontSize, theme) {
        this.fontSize = fontSize;
        this.theme = theme;
        localStorage.setItem('liquid_font_size', fontSize);
        localStorage.setItem('liquid_theme', theme);
    }

    async extractStructuredText() {
        if (!window.PDFViewerApplication || !window.PDFViewerApplication.pdfDocument) {
            throw new Error("El documento PDF no está cargado.");
        }
        
        const pageNum = window.PDFViewerApplication.page;
        const page = await window.PDFViewerApplication.pdfDocument.getPage(pageNum);
        const textContent = await page.getTextContent();
        
        return this.parseHeuristics(textContent.items);
    }

    parseHeuristics(items) {
        if (!items || items.length === 0) return [];

        const blocks = [];
        let currentBlock = null;
        let lastY = null;
        
        // Calcular tamaño de fuente promedio para detectar encabezados
        let totalFontSize = 0;
        let validItemsCount = 0;
        
        items.forEach(item => {
            if (item.str.trim() !== '') {
                totalFontSize += item.transform[0];
                validItemsCount++;
            }
        });
        
        const avgFontSize = validItemsCount > 0 ? (totalFontSize / validItemsCount) : 12;

        items.forEach(item => {
            const text = item.str;
            const y = item.transform[5];
            const fontSize = item.transform[0];
            
            // Ignorar textos completamente vacíos
            if (text.trim() === '' && !item.hasEOL) {
                // Preservar espacios internos
                if (currentBlock && text === ' ') {
                    currentBlock.text += ' ';
                }
                return;
            }

            const isHeading = fontSize > avgFontSize * 1.2;
            const type = isHeading ? 'heading' : 'paragraph';

            // Si es un nuevo bloque (cambio brusco de Y, u obligamos inicio)
            if (!currentBlock) {
                currentBlock = { type: type, text: text, startY: y, lastY: y };
            } else {
                // Heurística de mismo párrafo: La diferencia de "Y" es pequeña y es del mismo tipo
                const diffY = Math.abs(currentBlock.lastY - y);
                
                // Asumimos un margen de error respecto al tamaño de la fuente para el interlineado
                if (diffY < (fontSize * 2) && currentBlock.type === type) {
                    currentBlock.text += (text.startsWith(' ') || currentBlock.text.endsWith(' ') || currentBlock.text.endsWith('-')) ? text : ' ' + text;
                    currentBlock.lastY = y;
                } else {
                    // Nuevo párrafo o encabezado
                    blocks.push({...currentBlock});
                    currentBlock = { type: type, text: text, startY: y, lastY: y };
                }
            }
        });

        if (currentBlock) {
            blocks.push(currentBlock);
        }

        // Limpieza de guiones de final de línea
        return blocks.map(b => ({
            ...b,
            text: b.text.replace(/-\s+/g, '')
        }));
    }
}
