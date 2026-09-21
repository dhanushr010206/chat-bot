/**
 * voice.js — Speech-to-Text Voice Commands & Text-to-Speech Audio Output
 * Powered by Web Speech API with dynamic audio wave feedback and Web Audio chimes.
 */

class CosmicVoiceController {
  constructor() {
    this.recognition = null;
    this.isRecording = false;
    this.autoSpeak = false;
    this.synth = window.speechSynthesis;
    this.currentUtterance = null;

    this.voiceBtn = document.getElementById('voice-input-btn');
    this.textarea = document.getElementById('prompt-textarea');
    this.speakToggleBtn = document.getElementById('voice-speak-toggle');

    this.initSpeechRecognition();
    this.initAudioSynthesizer();
    this.bindEvents();
  }

  initSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('Web Speech API is not supported in this browser.');
      if (this.voiceBtn) {
        this.voiceBtn.title = 'Speech-to-text not supported in this browser';
      }
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = false;
    this.recognition.interimResults = true;
    this.recognition.lang = 'en-US';

    this.recognition.onstart = () => {
      this.isRecording = true;
      if (this.voiceBtn) this.voiceBtn.classList.add('recording');
    };

    this.recognition.onresult = (event) => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      if (this.textarea) {
        this.textarea.value = transcript;
        this.textarea.dispatchEvent(new Event('input', { bubbles: true }));
      }
    };

    this.recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      this.stopRecording();
    };

    this.recognition.onend = () => {
      this.stopRecording();
    };
  }

  toggleRecording() {
    if (!this.recognition) {
      alert('Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.');
      return;
    }

    if (this.isRecording) {
      this.recognition.stop();
      this.stopRecording();
    } else {
      try {
        this.recognition.start();
        this.playCosmicChime(440, 'sine');
      } catch (e) {
        console.error('Failed to start recognition:', e);
      }
    }
  }

  stopRecording() {
    this.isRecording = false;
    if (this.voiceBtn) this.voiceBtn.classList.remove('recording');
  }

  speakText(text, onEndCallback) {
    if (!this.synth) return;

    this.stopSpeaking();

    // Clean markdown symbols for natural speech
    const cleanText = text
      .replace(/```[\s\S]*?```/g, 'Code block omitted.')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/[*#_>~-]/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .slice(0, 1000); // Read up to first 1000 chars

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.05;
    utterance.pitch = 0.95; // Slightly deeper, authoritative dragon tone

    // Attempt to select a clear English voice
    const voices = this.synth.getVoices();
    const preferredVoice = voices.find(v => v.lang.includes('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('David')));
    if (preferredVoice) utterance.voice = preferredVoice;

    utterance.onstart = () => {
      if (this.voiceBtn) this.voiceBtn.classList.add('speaking');
    };

    utterance.onend = () => {
      if (this.voiceBtn) this.voiceBtn.classList.remove('speaking');
      if (onEndCallback) onEndCallback();
    };

    utterance.onerror = () => {
      if (this.voiceBtn) this.voiceBtn.classList.remove('speaking');
    };

    this.currentUtterance = utterance;
    this.synth.speak(utterance);
  }

  stopSpeaking() {
    if (this.synth && this.synth.speaking) {
      this.synth.cancel();
    }
    if (this.voiceBtn) this.voiceBtn.classList.remove('speaking');
  }

  initAudioSynthesizer() {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.audioCtx = new AudioContext();
    } catch (e) {
      this.audioCtx = null;
    }
  }

  playCosmicChime(freq = 580, type = 'sine') {
    const soundEnabled = document.getElementById('sound-effects-toggle')?.checked ?? true;
    if (!soundEnabled || !this.audioCtx) return;

    try {
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.5, this.audioCtx.currentTime + 0.3);

      gain.gain.setValueAtTime(0.08, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.4);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start();
      osc.stop(this.audioCtx.currentTime + 0.4);
    } catch (e) {
      console.warn('Audio chime error:', e);
    }
  }

  bindEvents() {
    if (this.voiceBtn) {
      this.voiceBtn.addEventListener('click', () => this.toggleRecording());
    }

    if (this.speakToggleBtn) {
      this.speakToggleBtn.addEventListener('click', () => {
        this.autoSpeak = !this.autoSpeak;
        this.speakToggleBtn.classList.toggle('active', this.autoSpeak);
        this.speakToggleBtn.title = this.autoSpeak 
          ? 'Voice response readout: ACTIVE' 
          : 'Voice response readout: MUTED';
      });
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.voiceController = new CosmicVoiceController();
  window.playCosmicChime = (freq) => {
    if (window.voiceController) window.voiceController.playCosmicChime(freq);
  };
});
