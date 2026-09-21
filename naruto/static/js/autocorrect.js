/**
 * autocorrect.js — Real-Time Word Suggester, Autocomplete & Typo Corrector
 * Features comprehensive dictionary, Levenshtein distance typo detection, and Tab completion.
 */

class CosmicAutoCorrect {
  constructor() {
    this.textarea = document.getElementById('prompt-textarea');
    this.overlay = document.getElementById('autocorrect-overlay');
    this.chipsContainer = document.getElementById('autocorrect-chips');
    this.ghostBox = document.getElementById('ghost-autocomplete');

    // Rich vocabulary encompassing tech, logic, critical analysis, and cosmos
    this.dictionary = [
      // Reasoning & Critical Thinking
      "argument", "assumption", "assertion", "bottleneck", "causation", "counterargument",
      "critique", "criticism", "correlation", "deduction", "dialectics", "dichotomy",
      "epistemology", "empirical", "evaluation", "fallacy", "hypothesis", "implication",
      "inference", "methodology", "objective", "paradox", "perspective", "philosophy",
      "premise", "refutation", "rigorous", "skepticism", "socratic", "syllogism",
      "synthesis", "tautology", "validity", "verifiable", "vulnerability",

      // Tech & Programming
      "algorithm", "architecture", "asynchronous", "backend", "concurrency", "cryptography",
      "database", "distributed", "docker", "endpoint", "framework", "frontend",
      "fullstack", "infrastructure", "javascript", "kubernetes", "microservices",
      "multithreading", "optimization", "pipeline", "postgresql", "python", "quantum",
      "scalability", "serverless", "streaming", "throughput", "typescript", "websocket",

      // Cosmic & General
      "astronomy", "blackhole", "celestial", "dimension", "dragon", "entropy",
      "expansion", "galaxy", "gravitational", "horizon", "interstellar", "multiverse",
      "nebula", "particle", "planetary", "pulsar", "quantum", "relativity",
      "singularity", "spacetime", "supernova", "starlight", "universe", "vortex"
    ];

    // Common typo corrections
    this.typoMap = {
      "critise": "critique",
      "ineract": "interact",
      "futer": "future",
      "algoritm": "algorithm",
      "teh": "the",
      "probelm": "problem",
      "becuase": "because",
      "recieved": "received",
      "definately": "definitely",
      "seperate": "separate",
      "occured": "occurred",
      "arugment": "argument",
      "premis": "premise",
      "analys": "analysis"
    };

    this.activeSuggestions = [];
    this.bindEvents();
  }

  bindEvents() {
    if (!this.textarea) return;

    this.textarea.addEventListener('input', () => this.handleInput());
    this.textarea.addEventListener('keydown', (e) => this.handleKeyDown(e));

    // Hide suggestions when clicking outside
    document.addEventListener('click', (e) => {
      if (!this.overlay.contains(e.target) && e.target !== this.textarea) {
        this.hideSuggestions();
      }
    });
  }

  handleInput() {
    const text = this.textarea.value;
    const cursorPos = this.textarea.selectionStart;

    // Get the word immediately preceding the cursor
    const textBeforeCursor = text.slice(0, cursorPos);
    const words = textBeforeCursor.split(/[\s,.;!?]+/);
    const currentWord = words[words.length - 1].toLowerCase();

    if (!currentWord || currentWord.length < 2) {
      this.hideSuggestions();
      return;
    }

    // 1. Check direct typo corrections
    const typoCorrection = this.typoMap[currentWord];

    // 2. Find prefix matches in dictionary
    const prefixMatches = this.dictionary.filter(w => 
      w.startsWith(currentWord) && w !== currentWord
    ).slice(0, 5);

    // 3. Find fuzzy Levenshtein matches if no direct prefix
    let fuzzyMatches = [];
    if (prefixMatches.length < 3 && currentWord.length >= 4) {
      fuzzyMatches = this.dictionary
        .map(w => ({ word: w, dist: this.levenshtein(currentWord, w) }))
        .filter(item => item.dist <= 2 && item.word !== currentWord)
        .sort((a, b) => a.dist - b.dist)
        .map(item => item.word)
        .slice(0, 3);
    }

    // Combine distinct suggestions
    const suggestions = [];
    if (typoCorrection) suggestions.push({ word: typoCorrection, type: 'typo' });
    prefixMatches.forEach(w => {
      if (!suggestions.some(s => s.word === w)) suggestions.push({ word: w, type: 'autocomplete' });
    });
    fuzzyMatches.forEach(w => {
      if (!suggestions.some(s => s.word === w)) suggestions.push({ word: w, type: 'correction' });
    });

    if (suggestions.length > 0) {
      this.showSuggestions(suggestions, currentWord);
    } else {
      this.hideSuggestions();
    }
  }

  handleKeyDown(e) {
    // If user presses Tab or Enter while suggestions are visible, apply top suggestion
    if (e.key === 'Tab' && this.activeSuggestions.length > 0) {
      e.preventDefault();
      this.applySuggestion(this.activeSuggestions[0].word);
    } else if (e.key === 'Escape') {
      this.hideSuggestions();
    }
  }

  showSuggestions(suggestions, currentWord) {
    this.activeSuggestions = suggestions;
    this.chipsContainer.innerHTML = '';

    suggestions.forEach((item, index) => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'suggest-word-chip';
      
      let badge = '';
      if (item.type === 'typo') badge = ' <small style="color: #f43f5e">(typo fix)</small>';
      else if (item.type === 'correction') badge = ' <small style="color: #fbbf24">(fix)</small>';
      else if (index === 0) badge = ' <small style="color: #00f2fe">[Tab]</small>';

      chip.innerHTML = `${item.word}${badge}`;
      chip.addEventListener('click', () => {
        this.applySuggestion(item.word);
        this.textarea.focus();
      });
      this.chipsContainer.appendChild(chip);
    });

    this.overlay.style.display = 'block';
  }

  hideSuggestions() {
    this.activeSuggestions = [];
    if (this.overlay) this.overlay.style.display = 'none';
  }

  applySuggestion(chosenWord) {
    const text = this.textarea.value;
    const cursorPos = this.textarea.selectionStart;
    const textBefore = text.slice(0, cursorPos);
    const textAfter = text.slice(cursorPos);

    // Replace the last word before cursor
    const replacedBefore = textBefore.replace(/[\w]+$/, chosenWord + ' ');
    this.textarea.value = replacedBefore + textAfter;
    this.textarea.selectionStart = this.textarea.selectionEnd = replacedBefore.length;

    this.hideSuggestions();
    this.textarea.dispatchEvent(new Event('input', { bubbles: true }));
  }

  levenshtein(a, b) {
    const matrix = [];
    for (let i = 0; i <= b.length; i++) matrix[i] = [i];
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          );
        }
      }
    }
    return matrix[b.length][a.length];
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.autoCorrect = new CosmicAutoCorrect();
});
