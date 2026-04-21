class ReadAloudView {
    constructor() {
        this.container = null;
        this.playBtn = null;
        this.stopBtn = null;
        this.voiceSelect = null;
        this.onPlayClick = null;
        this.onStopClick = null;
        this.onVoiceChange = null;
        this.isRendered = false;
    }

    render() {
        if (this.isRendered) return;

        this.container = document.createElement('div');
        this.container.id = 'read-aloud-container';
        this.container.className = 'read-aloud-panel';

        const header = document.createElement('div');
        header.className = 'read-aloud-header';
        
        const title = document.createElement('span');
        title.textContent = '🔊 Lectura en Voz Alta';
        
        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '✕';
        closeBtn.className = 'read-aloud-close-btn';
        closeBtn.onclick = () => this.hide();

        header.appendChild(title);
        header.appendChild(closeBtn);

        const settingsRow = document.createElement('div');
        settingsRow.className = 'read-aloud-settings';

        this.voiceSelect = document.createElement('select');
        this.voiceSelect.className = 'read-aloud-voice-select';
        this.voiceSelect.onchange = (e) => {
            if (this.onVoiceChange) this.onVoiceChange(e.target.value);
        };
        settingsRow.appendChild(this.voiceSelect);

        const controls = document.createElement('div');
        controls.className = 'read-aloud-controls';

        this.playBtn = document.createElement('button');
        this.playBtn.className = 'read-aloud-btn play-btn';
        this.playBtn.innerHTML = '▶ Play';
        this.playBtn.onclick = () => this.onPlayClick && this.onPlayClick();

        this.stopBtn = document.createElement('button');
        this.stopBtn.className = 'read-aloud-btn stop-btn';
        this.stopBtn.innerHTML = '⏹ Stop';
        this.stopBtn.disabled = true;
        this.stopBtn.onclick = () => this.onStopClick && this.onStopClick();

        controls.appendChild(this.playBtn);
        controls.appendChild(this.stopBtn);

        this.container.appendChild(header);
        this.container.appendChild(settingsRow);
        this.container.appendChild(controls);

        document.body.appendChild(this.container);
        this.isRendered = true;
    }

    updateState(state) {
        if (!this.isRendered) return;

        if (state.isPlaying) {
            this.playBtn.innerHTML = '⏸ Pausa';
            this.stopBtn.disabled = false;
        } else if (state.isPaused) {
            this.playBtn.innerHTML = '▶ Continuar';
            this.stopBtn.disabled = false;
        } else {
            this.playBtn.innerHTML = '▶ Play';
            this.stopBtn.disabled = true;
        }
    }

    show() {
        if (!this.isRendered) this.render();
        this.container.style.display = 'flex';
    }

    hide() {
        if (this.container) {
            this.container.style.display = 'none';
        }
        if (this.onStopClick) {
            this.onStopClick(); // Detener al ocultar el panel
        }
    }

    populateVoices(voices, defaultVoiceURI) {
        if (!this.isRendered || !this.voiceSelect) return;
        
        this.voiceSelect.innerHTML = '';
        
        // Priorizar voces Naturales y las que empiezan por ES/EN al principio
        const sortedVoices = [...voices].sort((a, b) => {
           const aNatural = a.name.includes("Natural") ? 1 : 0;
           const bNatural = b.name.includes("Natural") ? 1 : 0;
           return bNatural - aNatural; // Naturales primero
        });

        sortedVoices.forEach(voice => {
            const option = document.createElement('option');
            option.value = voice.voiceURI;
            // Mostrar nombre legible y código de lenguaje
            option.textContent = `${voice.name} (${voice.lang})`;
            
            if (defaultVoiceURI && voice.voiceURI === defaultVoiceURI) {
                option.selected = true;
            }
            this.voiceSelect.appendChild(option);
        });
    }

    setCallbacks(onPlayClick, onStopClick, onVoiceChange) {
        this.onPlayClick = onPlayClick;
        this.onStopClick = onStopClick;
        this.onVoiceChange = onVoiceChange;
    }
    
    createButton(onClick) {
        console.log("[ReadAloudView] Esperando toolbar...");
        const checkToolbar = setInterval(() => {
            const toolbar = document.getElementById('toolbarViewerRight');
            if (toolbar) {
                console.log("[ReadAloudView] Toolbar encontrado. Inyectando botón...");
                clearInterval(checkToolbar);
                const btn = document.createElement('button');
                btn.className = 'toolbarButton read-aloud-toolbar-btn';
                btn.title = 'Lectura en Voz Alta';
                btn.innerHTML = '<span>🔊 Lector</span>';
                btn.addEventListener('click', onClick);
                toolbar.prepend(btn);
            }
        }, 500);
    }
}
window.ReadAloudView = ReadAloudView;
