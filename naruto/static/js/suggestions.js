/**
 * suggestions.js — Global Search & Trending Suggestion Prompts
 * Manages dynamic prompt exploration, category filtering, and one-click prompt injection.
 */

class CosmicSuggestionsManager {
  constructor() {
    this.welcomeGrid = document.getElementById('welcome-suggestions-grid');
    this.catalogGrid = document.getElementById('suggestions-catalog-grid');
    this.searchModalInput = document.getElementById('global-prompt-search');
    this.suggestionsModal = document.getElementById('suggestions-modal');
    this.openModalBtn = document.getElementById('open-suggestions-modal-btn');
    this.closeModalBtn = document.getElementById('close-suggestions-modal-btn');

    this.allSuggestions = [];
    this.init();
    this.bindEvents();
  }

  async init() {
    await this.fetchSuggestions();
    this.renderWelcomeCards();
  }

  async fetchSuggestions(query = '') {
    try {
      const url = query ? `/api/suggestions?q=${encodeURIComponent(query)}` : '/api/suggestions';
      const res = await fetch(url);
      const data = await res.json();
      if (!query) {
        this.allSuggestions = data;
      }
      return data;
    } catch (e) {
      console.error('Failed to load suggestions:', e);
      return [];
    }
  }

  renderWelcomeCards() {
    if (!this.welcomeGrid) return;
    this.welcomeGrid.innerHTML = '';

    // Take top 4 suggestions for welcome stage
    const topPicks = this.allSuggestions.slice(0, 4);
    topPicks.forEach(item => {
      const card = document.createElement('div');
      card.className = 'suggestion-card';
      card.innerHTML = `
        <div class="suggestion-icon">${item.icon || '⚔️'}</div>
        <div class="suggestion-info">
          <div class="suggestion-title">${this.escapeHtml(item.title)}</div>
          <div class="suggestion-desc">${this.escapeHtml(item.prompt.slice(0, 95))}...</div>
        </div>
      `;
      card.addEventListener('click', () => {
        this.injectPrompt(item.prompt);
      });
      this.welcomeGrid.appendChild(card);
    });
  }

  renderCatalog(items) {
    if (!this.catalogGrid) return;
    this.catalogGrid.innerHTML = '';

    if (items.length === 0) {
      this.catalogGrid.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 30px;">
          <i class="fa-solid fa-satellite" style="font-size: 2rem; margin-bottom: 10px; display: block;"></i>
          No cosmic inquiries match your query.
        </div>
      `;
      return;
    }

    items.forEach(item => {
      const card = document.createElement('div');
      card.className = 'lib-card';
      card.style.cursor = 'pointer';
      card.innerHTML = `
        <div class="lib-card-header">
          <div class="lib-card-title">${item.icon || '🌌'} ${this.escapeHtml(item.title)}</div>
          <span class="lib-card-badge">${this.escapeHtml(item.category)}</span>
        </div>
        <div class="lib-card-desc">${this.escapeHtml(item.prompt)}</div>
        <div class="lib-card-footer">
          <span>Click to launch inquiry</span>
          <i class="fa-solid fa-arrow-right" style="color: var(--accent-cyan);"></i>
        </div>
      `;
      card.addEventListener('click', () => {
        this.injectPrompt(item.prompt);
        this.closeModal();
      });
      this.catalogGrid.appendChild(card);
    });
  }

  injectPrompt(promptText) {
    const textarea = document.getElementById('prompt-textarea');
    if (textarea) {
      textarea.value = promptText;
      textarea.focus();
      textarea.dispatchEvent(new Event('input', { bubbles: true }));

      // Scroll to input dock
      textarea.scrollIntoView({ behavior: 'smooth' });
    }
  }

  openModal() {
    if (this.suggestionsModal) {
      this.suggestionsModal.classList.add('active');
      this.renderCatalog(this.allSuggestions);
      if (this.searchModalInput) {
        this.searchModalInput.value = '';
        this.searchModalInput.focus();
      }
    }
  }

  closeModal() {
    if (this.suggestionsModal) {
      this.suggestionsModal.classList.remove('active');
    }
  }

  bindEvents() {
    if (this.openModalBtn) {
      this.openModalBtn.addEventListener('click', () => this.openModal());
    }

    if (this.closeModalBtn) {
      this.closeModalBtn.addEventListener('click', () => this.closeModal());
    }

    // Quick chips in bottom dock
    document.querySelectorAll('.quick-chip').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const prompt = e.currentTarget.getAttribute('data-prompt');
        if (prompt) this.injectPrompt(prompt);
      });
    });

    // Real-time search inside modal
    if (this.searchModalInput) {
      this.searchModalInput.addEventListener('input', async (e) => {
        const query = e.target.value.trim();
        const results = await this.fetchSuggestions(query);
        this.renderCatalog(results);
      });
    }

    // Close on backdrop click
    if (this.suggestionsModal) {
      this.suggestionsModal.addEventListener('click', (e) => {
        if (e.target === this.suggestionsModal) this.closeModal();
      });
    }
  }

  escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.suggestionsManager = new CosmicSuggestionsManager();
});
