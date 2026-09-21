import os
import json
import time

def get_groq_client():
    from groq import Groq
    api_key = os.environ.get("GROQ_API_KEY", "").strip()
    if not api_key or api_key.startswith("your_groq_api_key"):
        return None
    try:
        return Groq(api_key=api_key)
    except:
        return None

class AIService:
    @staticmethod
    def get_mode_prompt(mode: str) -> str:
        """Returns the base system prompt persona for different AI modes."""
        prompts = {
            "mode_general": "You are Naruto, an intellectually formidable and highly capable AI assistant.",
            "mode_teacher": "You are Naruto, an expert teacher. Explain concepts patiently, use analogies, check for understanding, and provide constructive feedback.",
            "mode_coding": "You are Naruto, a senior software engineer. Provide robust, clean, and well-documented code. Focus on edge cases, security, and performance. Explain your technical choices clearly.",
            "mode_data": "You are Naruto, a Senior Data Scientist. Analyze data structures, provide statistical insights, detect anomalies, and suggest data visualizations or predictive modeling approaches.",
            "mode_study": "You are Naruto, a dedicated study companion. Help the user memorize facts using spaced repetition concepts, generate quizzes, and summarize large texts into digestible flashcard notes.",
            "mode_business": "You are Naruto, a top-tier Management Consultant. Provide strategic, actionable, and analytical business advice. Focus on ROI, market trends, scalability, and operational bottlenecks.",
            "mode_interviewer": "You are Naruto, a strict but fair technical and behavioral Interviewer. Ask challenging questions one by one. Evaluate the user's answers rigorously and provide constructive feedback.",
            "mode_eli5": "You are Naruto. Your task is to explain complex topics as if the user is 5 years old. Use extremely simple words, fun analogies, and short sentences."
        }
        return prompts.get(mode, prompts["mode_general"])

    @staticmethod
    def stream_chat(model: str, messages: list, temperature: float = 0.7):
        """Generator for streaming chat responses from Groq."""
        client = get_groq_client()
        start_time = time.time()
        token_count = 0
        
        if not client:
            # Fallback mock mode
            mock_resp = "I am operating in Mock/Simulation mode because the Groq API key is missing. Please add it in settings."
            words = mock_resp.split(" ")
            for i, word in enumerate(words):
                token_count += 1
                elapsed = time.time() - start_time
                speed = round(token_count / elapsed, 1) if elapsed > 0 else 0
                chunk = word + (" " if i < len(words) - 1 else "")
                payload = json.dumps({
                    "type": "chunk",
                    "content": chunk,
                    "speed": speed,
                    "tokens": token_count
                })
                yield f"data: {payload}\n\n"
                time.sleep(0.05)
            total_time = round(time.time() - start_time, 2)
            yield f"data: {json.dumps({'type': 'done', 'total_time': total_time, 'tokens': token_count})}\n\n"
            return

        try:
            stream = client.chat.completions.create(
                model=model,
                messages=messages,
                temperature=temperature,
                stream=True
            )
            for chunk in stream:
                delta = chunk.choices[0].delta.content or ""
                if delta:
                    token_count += 1
                    elapsed = time.time() - start_time
                    speed = round(token_count / elapsed, 1) if elapsed > 0 else 0
                    payload = json.dumps({
                        "type": "chunk",
                        "content": delta,
                        "speed": speed,
                        "tokens": token_count
                    })
                    yield f"data: {payload}\n\n"
            
            total_time = round(time.time() - start_time, 2)
            yield f"data: {json.dumps({'type': 'done', 'total_time': total_time, 'tokens': token_count})}\n\n"
        except Exception as e:
            err_msg = f"\n\n*(API Error: {str(e)})*"
            yield f"data: {json.dumps({'type': 'error', 'content': err_msg})}\n\n"

    @staticmethod
    def generate_completion(model: str, messages: list, temperature: float = 0.7, max_tokens: int = 1000) -> str:
        """Non-streaming completion for internal tasks (summaries, translation, tasks)."""
        client = get_groq_client()
        if not client:
            return "Simulated non-streaming response due to missing API key."
        
        try:
            response = client.chat.completions.create(
                model=model,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens
            )
            return response.choices[0].message.content
        except Exception as e:
            return f"Error: {str(e)}"
