import os
import json
import re
from pathlib import Path

BASE_DIR = Path(__file__).parent.parent
TRANSLATIONS_DIR = BASE_DIR / "translations"

SUPPORTED_LANGUAGES = [
    {"code": "en", "name": "English", "native": "English", "rtl": False, "locale": "en-US"},
    {"code": "hi", "name": "Hindi", "native": "हिन्दी", "rtl": False, "locale": "hi-IN"},
    {"code": "kn", "name": "Kannada", "native": "ಕನ್ನಡ", "rtl": False, "locale": "kn-IN"},
    {"code": "ta", "name": "Tamil", "native": "தமிழ்", "rtl": False, "locale": "ta-IN"},
    {"code": "te", "name": "Telugu", "native": "తెలుగు", "rtl": False, "locale": "te-IN"},
    {"code": "ml", "name": "Malayalam", "native": "മലയാളം", "rtl": False, "locale": "ml-IN"},
    {"code": "mr", "name": "Marathi", "native": "मराठी", "rtl": False, "locale": "mr-IN"},
    {"code": "bn", "name": "Bengali", "native": "বাংলা", "rtl": False, "locale": "bn-IN"},
    {"code": "gu", "name": "Gujarati", "native": "ગુજરાતી", "rtl": False, "locale": "gu-IN"},
    {"code": "pa", "name": "Punjabi", "native": "ਪੰਜਾਬੀ", "rtl": False, "locale": "pa-IN"},
    {"code": "ur", "name": "Urdu", "native": "اردو", "rtl": True, "locale": "ur-PK"},
    {"code": "or", "name": "Odia", "native": "ଓଡ଼ିଆ", "rtl": False, "locale": "or-IN"},
    {"code": "es", "name": "Spanish", "native": "Español", "rtl": False, "locale": "es-ES"},
    {"code": "fr", "name": "French", "native": "Français", "rtl": False, "locale": "fr-FR"},
    {"code": "de", "name": "German", "native": "Deutsch", "rtl": False, "locale": "de-DE"},
    {"code": "pt", "name": "Portuguese", "native": "Português", "rtl": False, "locale": "pt-BR"},
    {"code": "ar", "name": "Arabic", "native": "العربية", "rtl": True, "locale": "ar-SA"},
    {"code": "ja", "name": "Japanese", "native": "日本語", "rtl": False, "locale": "ja-JP"},
    {"code": "ko", "name": "Korean", "native": "한국어", "rtl": False, "locale": "ko-KR"},
    {"code": "zh", "name": "Chinese", "native": "中文", "rtl": False, "locale": "zh-CN"},
]

UNICODE_RANGES = [
    (re.compile(r'[\u0C80-\u0CFF]'), "kn"),  # Kannada
    (re.compile(r'[\u0900-\u097F]'), "hi"),  # Devanagari (Hindi/Marathi)
    (re.compile(r'[\u0B80-\u0BFF]'), "ta"),  # Tamil
    (re.compile(r'[\u0C00-\u0C7F]'), "te"),  # Telugu
    (re.compile(r'[\u0D00-\u0D7F]'), "ml"),  # Malayalam
    (re.compile(r'[\u0980-\u09FF]'), "bn"),  # Bengali
    (re.compile(r'[\u0A80-\u0AFF]'), "gu"),  # Gujarati
    (re.compile(r'[\u0A00-\u0A7F]'), "pa"),  # Punjabi
    (re.compile(r'[\u0B00-\u0B7F]'), "or"),  # Odia
    (re.compile(r'[\u0600-\u06FF]'), "ar"),  # Arabic / Urdu script
    (re.compile(r'[\u3040-\u309F\u30A0-\u30FF]'), "ja"), # Japanese Kana
    (re.compile(r'[\uAC00-\uD7AF]'), "ko"),  # Korean Hangul
    (re.compile(r'[\u4E00-\u9FFF]'), "zh"),  # CJK Unified Ideographs
]

class LanguageManager:
    @staticmethod
    def get_supported_languages():
        return SUPPORTED_LANGUAGES

    @staticmethod
    def get_language_info(code):
        for lang in SUPPORTED_LANGUAGES:
            if lang["code"] == code:
                return lang
        return SUPPORTED_LANGUAGES[0]

    @staticmethod
    def detect_language(text: str) -> str:
        """Detect language from Unicode script or prominent patterns."""
        if not text or not isinstance(text, str):
            return "en"
        
        # Check explicit mentions e.g. "in hindi", "in kannada", "in spanish"
        low = text.lower()
        lang_keywords = {
            "kannada": "kn", "ಕನ್ನಡ": "kn",
            "hindi": "hi", "हिन्दी": "hi", "हिंदी": "hi",
            "tamil": "ta", "தமிழ்": "ta",
            "telugu": "te", "తెలుగు": "te",
            "malayalam": "ml", "മലയാളം": "ml",
            "marathi": "mr", "मराठी": "mr",
            "bengali": "bn", "বাংলা": "bn",
            "gujarati": "gu", "ગુજરાતી": "gu",
            "punjabi": "pa", "ਪੰਜਾਬੀ": "pa",
            "urdu": "ur", "اردو": "ur",
            "odia": "or", "ଓଡ଼ିଆ": "or",
            "spanish": "es", "español": "es",
            "french": "fr", "français": "fr",
            "german": "de", "deutsch": "de",
            "portuguese": "pt", "português": "pt",
            "arabic": "ar", "العربية": "ar",
            "japanese": "ja", "日本語": "ja",
            "korean": "ko", "한국어": "ko",
            "chinese": "zh", "中文": "zh"
        }
        for kw, code in lang_keywords.items():
            if kw in low:
                return code

        # Script counts
        counts = {}
        for pattern, code in UNICODE_RANGES:
            matches = len(pattern.findall(text))
            if matches > 0:
                counts[code] = counts.get(code, 0) + matches

        if counts:
            detected = max(counts, key=counts.get)
            return detected

        # Check common romance/germanic words
        if re.search(r'\b(que|como|para|por|está|hola|gracias)\b', low):
            return "es"
        if re.search(r'\b(le|la|les|pour|avec|bonjour|merci)\b', low):
            return "fr"
        if re.search(r'\b(der|die|das|und|ist|nicht|hallo|danke)\b', low):
            return "de"

        return "en"

    @staticmethod
    def get_translations(lang_code: str) -> dict:
        """Load translation JSON with fallback to English."""
        en_path = TRANSLATIONS_DIR / "en.json"
        base = {}
        if en_path.exists():
            try:
                with open(en_path, "r", encoding="utf-8") as f:
                    base = json.load(f)
            except Exception:
                pass

        if not lang_code or lang_code == "en":
            return base

        target_path = TRANSLATIONS_DIR / f"{lang_code}.json"
        if target_path.exists():
            try:
                with open(target_path, "r", encoding="utf-8") as f:
                    target_data = json.load(f)
                    # Merge on top of base
                    base.update(target_data)
            except Exception:
                pass
        return base

    @staticmethod
    def build_language_instruction(selected_lang: str, user_text: str = "") -> str:
        """
        Generate instructions for the LLM regarding language, code-switching,
        and preservation of code blocks and formulas.
        """
        target_code = selected_lang
        if not selected_lang or selected_lang == "auto":
            target_code = LanguageManager.detect_language(user_text)

        lang_info = LanguageManager.get_language_info(target_code)
        lang_name = lang_info["name"]
        native_name = lang_info["native"]

        if target_code == "en":
            return (
                "\nLANGUAGE DIRECTIVE:\n"
                "- Primary Response Language: English.\n"
                "- If the user asks or code-switches in another language (e.g. Kannada, Hindi, Spanish), "
                "address their intent naturally in that language or bilingual format as appropriate.\n"
                "- Preserve all programming code blocks, keywords, variable names, URLs, formulas, and file paths exactly as written.\n"
            )

        return (
            f"\nLANGUAGE DIRECTIVE - MULTILINGUAL ENFORCEMENT:\n"
            f"- TARGET LANGUAGE: Respond fluently and primarily in {lang_name} ({native_name}).\n"
            f"- CODE-SWITCHING & MIXED LANGUAGE: The user may use mixed phrasing (e.g. '{native_name} + English'). "
            f"Understand the question seamlessly and answer in natural, culturally authentic {lang_name}.\n"
            f"- STRICT UNTRANSLATED ITEMS: NEVER translate or alter:\n"
            f"  1. Programming code, syntax, variable names, function signatures, library imports, and code blocks.\n"
            f"  2. Mathematical formulas, technical specifications, and file names/extensions.\n"
            f"  3. API keys, URLs, and JSON keys.\n"
            f"- Explain technical, coding, or scientific concepts using clear {lang_name} explanations while retaining necessary standard English technical terms (e.g. 'recursion', 'API', 'Docker', 'DataFrame') alongside.\n"
            f"- Maintain Markdown formatting, bold headings, lists, and tables cleanly.\n"
        )
