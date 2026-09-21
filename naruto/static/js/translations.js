let currentLang = 'en';

async function fetchLanguages() {
    try {
        const res = await fetch('/api/languages');
        const langs = await res.json();
        const select = document.getElementById('global-language-select');
        select.innerHTML = '<option value="auto">Auto-Detect</option>';
        langs.forEach(lang => {
            const opt = document.createElement('option');
            opt.value = lang.code;
            opt.textContent = `${lang.native} (${lang.name})`;
            opt.dataset.rtl = lang.rtl;
            select.appendChild(opt);
        });
        
        select.addEventListener('change', (e) => {
            const selected = e.target.value;
            if (selected !== 'auto') {
                setLanguage(selected);
            }
        });
    } catch (e) {
        console.error("Error fetching languages", e);
    }
}

async function setLanguage(langCode) {
    try {
        const res = await fetch(`/api/translations/${langCode}`);
        const translations = await res.json();
        
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (translations[key]) {
                if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                    el.placeholder = translations[key];
                } else {
                    el.textContent = translations[key];
                }
            }
        });
        
        const langOption = document.querySelector(`#global-language-select option[value="${langCode}"]`);
        if (langOption && langOption.dataset.rtl === 'true') {
            document.documentElement.dir = 'rtl';
        } else {
            document.documentElement.dir = 'ltr';
        }
        
        currentLang = langCode;
    } catch (e) {
        console.error("Error setting language", e);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    fetchLanguages();
});
