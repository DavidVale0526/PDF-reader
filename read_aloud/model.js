class ReadAloudModel {
    constructor() {
        this.synth = window.speechSynthesis;
        this.utterance = null;
        this.isPlaying = false;
        this.isPaused = false;
        this.voices = [];
        this.selectedVoice = null;
        this.onStateChange = null;
        this.onBoundary = null;
        
        this._initVoices();
    }

    _initVoices() {
        const populateVoices = () => {
            this.voices = this.synth.getVoices();
            // 1. Buscar primero "Microsoft Ryan" especificada por el usuario
            // 2. Si no, buscar una voz natural en inglés
            // 3. Fallback a español u a la primera disponible.
            this.selectedVoice = this.voices.find(v => v.name.toLowerCase().includes("ryan") && v.name.includes("Natural"))
                || this.voices.find(v => v.name.includes("Natural") && v.lang.startsWith("en"))
                || this.voices.find(v => v.name.includes("Natural") && v.lang.startsWith("es")) 
                || this.voices.find(v => v.lang.startsWith("es"))
                || this.voices[0];
        };
        
        populateVoices();
        if (speechSynthesis.onvoiceschanged !== undefined) {
            // Se triggerea cuando Chrome/Edge termina de cargar el motor TTS cloud
            speechSynthesis.onvoiceschanged = () => {
                populateVoices();
                if (this.onVoicesLoaded) this.onVoicesLoaded(this.voices);
            };
        }
    }

    getVoices() {
        return this.voices;
    }

    setVoice(voiceURI) {
        const found = this.voices.find(v => v.voiceURI === voiceURI);
        if (found) {
            this.selectedVoice = found;
        }
    }

    setCallbacks(onStateChange, onBoundary, onVoicesLoaded = null) {
        this.onStateChange = onStateChange;
        this.onBoundary = onBoundary;
        this.onVoicesLoaded = onVoicesLoaded;
    }

    play(text) {
        if (this.synth.speaking && this.isPaused) {
            this.synth.resume();
            this.isPlaying = true;
            this.isPaused = false;
            this._notifyStateChange();
            return;
        }

        if (this.synth.speaking) {
            this.synth.cancel();
        }

        this.utterance = new SpeechSynthesisUtterance(text);
        if (this.selectedVoice) {
            this.utterance.voice = this.selectedVoice;
        }
        
        this.utterance.onstart = () => {
            this.isPlaying = true;
            this.isPaused = false;
            this._notifyStateChange();
        };

        this.utterance.onend = () => {
            this.isPlaying = false;
            this.isPaused = false;
            this._notifyStateChange();
        };

        this.utterance.onerror = (e) => {
            console.error("[ReadAloud] Error en SpeechSynthesis", e);
            this.isPlaying = false;
            this.isPaused = false;
            this._notifyStateChange();
        };
        
        this.utterance.onpause = () => {
             this.isPlaying = false;
             this.isPaused = true;
             this._notifyStateChange();
        };
        
        this.utterance.onresume = () => {
             this.isPlaying = true;
             this.isPaused = false;
             this._notifyStateChange();
        };

        this.utterance.onboundary = (e) => {
            if (this.onBoundary) {
                this.onBoundary(e);
            }
        };

        this.synth.speak(this.utterance);
    }

    pause() {
        if (this.synth.speaking && !this.isPaused) {
            this.synth.pause();
        }
    }

    stop() {
        if (this.synth.speaking) {
            this.synth.cancel();
            this.isPlaying = false;
            this.isPaused = false;
            this._notifyStateChange();
        }
    }
    
    _notifyStateChange() {
        if (this.onStateChange) {
            this.onStateChange({
                isPlaying: this.isPlaying,
                isPaused: this.isPaused
            });
        }
    }
}
window.ReadAloudModel = ReadAloudModel;
