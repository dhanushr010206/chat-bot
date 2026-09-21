import os
import sys
import json
import time
import io
from pathlib import Path
from flask import Flask, request, jsonify, render_template, Response, stream_with_context
from dotenv import load_dotenv, set_key

# Import modular services
from services.language_manager import LanguageManager
from services.ai_service import AIService, get_groq_client
from services.search_service import SearchService
from services.document_service import DocumentService
from services.data_analyst_service import DataAnalystService
from services.productivity_service import ProductivityService

# Ensure UTF-8 output on Windows consoles
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

ENV_PATH = Path(__file__).parent / ".env"
load_dotenv(dotenv_path=ENV_PATH)

app = Flask(__name__, static_folder="static", template_folder="templates")
app.config['MAX_CONTENT_LENGTH'] = 32 * 1024 * 1024  # 32 MB max file upload

DATA_DIR = Path(__file__).parent / "data"
DATA_DIR.mkdir(exist_ok=True)
CHATS_FILE = DATA_DIR / "chats.json"
LIBRARY_FILE = DATA_DIR / "library.json"

def read_json_file(file_path, default):
    if not file_path.exists():
        return default
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            return json.load(f)
    except:
        return default

def write_json_file(file_path, data):
    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/api/status", methods=["GET"])
def get_status():
    client = get_groq_client()
    return jsonify({
        "status": "online",
        "has_groq_key": client is not None,
        "default_model": os.environ.get("DEFAULT_MODEL", "openai/gpt-oss-120b")
    })

@app.route("/api/languages", methods=["GET"])
def get_languages():
    return jsonify(LanguageManager.get_supported_languages())

@app.route("/api/translations/<lang>", methods=["GET"])
def get_translations(lang):
    return jsonify(LanguageManager.get_translations(lang))

@app.route("/api/settings/key", methods=["POST"])
def set_api_key():
    data = request.get_json() or {}
    new_key = data.get("api_key", "").strip()
    if not new_key:
        return jsonify({"success": False, "error": "API key cannot be empty"}), 400
    try:
        from groq import Groq
        test_client = Groq(api_key=new_key)
        test_client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[{"role": "user", "content": "ping"}],
            max_tokens=5
        )
        set_key(str(ENV_PATH), "GROQ_API_KEY", new_key)
        os.environ["GROQ_API_KEY"] = new_key
        return jsonify({"success": True, "message": "Groq API key validated successfully!"})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 400

@app.route("/api/chat/stream", methods=["POST"])
def chat_stream():
    data = request.get_json() or {}
    messages = data.get("messages", [])
    model = data.get("model", os.environ.get("DEFAULT_MODEL", "openai/gpt-oss-120b"))
    temperature = float(data.get("temperature", 0.7))
    mode = data.get("mode", "mode_general")
    language = data.get("language", "auto")
    use_web_search = data.get("use_web_search", False)
    file_context = data.get("file_context", "")

    # Build base prompt from mode
    system_content = AIService.get_mode_prompt(mode)

    # Inject Multilingual instructions
    last_user_msg = messages[-1]["content"] if messages else ""
    system_content += LanguageManager.build_language_instruction(language, last_user_msg)

    # Inject File Context
    if file_context:
        system_content += f"\n\n[ATTACHED FILE CONTENT]\n{file_context}\n[END FILE CONTENT]\n"

    # Inject Web Search Context
    if use_web_search and last_user_msg:
        search_ctx = SearchService.build_search_context(last_user_msg)
        if search_ctx:
            system_content += search_ctx

    formatted_messages = [{"role": "system", "content": system_content}]
    for m in messages:
        if m.get("role") in ["user", "assistant"]:
            formatted_messages.append({"role": m["role"], "content": m["content"]})

    return Response(stream_with_context(AIService.stream_chat(model, formatted_messages, temperature)), mimetype="text/event-stream")

@app.route("/api/upload", methods=["POST"])
def upload_file():
    if 'file' not in request.files:
        return jsonify({"error": "No file uploaded"}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400
    
    filename = file.filename
    file_bytes = file.read()
    
    content = DocumentService.extract_text(filename, file_bytes)
    
    preview = content[:500] + ("..." if len(content) > 500 else "")
    return jsonify({
        "success": True,
        "filename": filename,
        "char_count": len(content),
        "preview": preview,
        "extracted_text": content[:15000] # Cap prompt injection to 15k chars for context
    })

@app.route("/api/data/analyze", methods=["POST"])
def analyze_data():
    if 'file' not in request.files:
        return jsonify({"error": "No file uploaded"}), 400
    file = request.files['file']
    filename = file.filename
    ext = filename.rsplit('.', 1)[-1].lower() if '.' in filename else ''
    file_bytes = file.read()
    
    analysis = DataAnalystService.analyze_dataset(file_bytes, ext)
    if "error" in analysis:
        return jsonify({"success": False, "error": analysis["error"]}), 400
    return jsonify(analysis)

# ----------------- CHATS ENDPOINTS -----------------
@app.route("/api/chats", methods=["GET"])
def get_chats():
    chats = read_json_file(CHATS_FILE, [])
    summaries = [{"id": c.get("id"), "title": c.get("title", "Untitled Session"), "created_at": c.get("created_at")} for c in chats]
    return jsonify(summaries)

@app.route("/api/chats/<chat_id>", methods=["GET"])
def get_chat(chat_id):
    chats = read_json_file(CHATS_FILE, [])
    for c in chats:
        if c.get("id") == chat_id:
            return jsonify(c)
    return jsonify({"error": "Chat not found"}), 404

@app.route("/api/chats", methods=["POST"])
def save_chat():
    payload = request.get_json() or {}
    chat_id = payload.get("id")
    title = payload.get("title", "Conversation")
    messages = payload.get("messages", [])
    chats = read_json_file(CHATS_FILE, [])
    
    found = False
    for i, c in enumerate(chats):
        if c.get("id") == chat_id:
            chats[i]["title"] = title
            chats[i]["messages"] = messages
            chats[i]["updated_at"] = time.strftime("%Y-%m-%dT%H:%M:%SZ")
            found = True
            break
            
    if not found:
        chats.insert(0, {
            "id": chat_id or f"chat-{int(time.time()*1000)}",
            "title": title,
            "created_at": time.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "messages": messages
        })
    write_json_file(CHATS_FILE, chats)
    return jsonify({"success": True, "chat_id": chat_id})

@app.route("/api/chats/<chat_id>", methods=["DELETE"])
def delete_chat(chat_id):
    chats = read_json_file(CHATS_FILE, [])
    chats = [c for c in chats if c.get("id") != chat_id]
    write_json_file(CHATS_FILE, chats)
    return jsonify({"success": True})

# ----------------- PRODUCTIVITY ENDPOINTS -----------------
@app.route("/api/tasks", methods=["GET", "POST"])
def tasks_api():
    if request.method == "GET":
        return jsonify(ProductivityService.get_tasks())
    elif request.method == "POST":
        data = request.get_json()
        task = ProductivityService.add_task(data.get("title"), data.get("category"), data.get("priority"), data.get("due_date"))
        return jsonify(task)

@app.route("/api/tasks/<task_id>", methods=["PUT", "DELETE"])
def task_detail_api(task_id):
    if request.method == "PUT":
        data = request.get_json()
        success = ProductivityService.update_task(task_id, data)
        return jsonify({"success": success})
    elif request.method == "DELETE":
        success = ProductivityService.delete_task(task_id)
        return jsonify({"success": success})

@app.route("/api/expenses", methods=["GET", "POST"])
def expenses_api():
    if request.method == "GET":
        return jsonify(ProductivityService.get_expenses())
    elif request.method == "POST":
        data = request.get_json()
        expense = ProductivityService.add_expense(data.get("title"), data.get("category"), data.get("amount"), data.get("currency", "INR"), data.get("date"), data.get("notes"))
        return jsonify(expense)

@app.route("/api/expenses/<exp_id>", methods=["DELETE"])
def delete_expense_api(exp_id):
    success = ProductivityService.delete_expense(exp_id)
    return jsonify({"success": success})

@app.route("/api/expenses/stats", methods=["GET"])
def expense_stats_api():
    return jsonify(ProductivityService.get_expense_stats())

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    print("\n=======================================================")
    print(">> NARUTO AI PRODUCTIVITY ASSISTANT INITIALIZING")
    print(f">> Server running at: http://localhost:{port}")
    print("=======================================================\n")
    app.run(host="0.0.0.0", port=port, debug=True)
