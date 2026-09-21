import os
import json
import time
from pathlib import Path

BASE_DIR = Path(__file__).parent.parent
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(exist_ok=True)

TASKS_FILE = DATA_DIR / "tasks.json"
EXPENSES_FILE = DATA_DIR / "expenses.json"
QUIZ_FILE = DATA_DIR / "quiz_results.json"

def read_json(path, default):
    if not path.exists():
        return default
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except:
        return default

def write_json(path, data):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)

class ProductivityService:
    # ------------------ TASKS ------------------
    @staticmethod
    def get_tasks():
        return read_json(TASKS_FILE, [])

    @staticmethod
    def add_task(title, category="Work", priority="Medium", due_date=""):
        tasks = read_json(TASKS_FILE, [])
        task = {
            "id": f"task-{int(time.time()*1000)}",
            "title": title,
            "category": category,
            "priority": priority,
            "due_date": due_date,
            "completed": False,
            "created_at": time.strftime("%Y-%m-%d %H:%M")
        }
        tasks.insert(0, task)
        write_json(TASKS_FILE, tasks)
        return task

    @staticmethod
    def update_task(task_id, updates):
        tasks = read_json(TASKS_FILE, [])
        for t in tasks:
            if t["id"] == task_id:
                for k, v in updates.items():
                    if k in t:
                        t[k] = v
                write_json(TASKS_FILE, tasks)
                return True
        return False

    @staticmethod
    def delete_task(task_id):
        tasks = read_json(TASKS_FILE, [])
        tasks = [t for t in tasks if t["id"] != task_id]
        write_json(TASKS_FILE, tasks)
        return True

    # ------------------ EXPENSES ------------------
    @staticmethod
    def get_expenses():
        return read_json(EXPENSES_FILE, [])

    @staticmethod
    def add_expense(title, category, amount, currency="INR", date="", notes=""):
        expenses = read_json(EXPENSES_FILE, [])
        if not date:
            date = time.strftime("%Y-%m-%d")
        
        try:
            amount = float(amount)
        except:
            amount = 0.0

        expense = {
            "id": f"exp-{int(time.time()*1000)}",
            "title": title,
            "category": category,
            "amount": amount,
            "currency": currency,
            "date": date,
            "notes": notes,
            "created_at": time.strftime("%Y-%m-%d %H:%M")
        }
        expenses.insert(0, expense)
        write_json(EXPENSES_FILE, expenses)
        return expense

    @staticmethod
    def delete_expense(expense_id):
        expenses = read_json(EXPENSES_FILE, [])
        expenses = [e for e in expenses if e["id"] != expense_id]
        write_json(EXPENSES_FILE, expenses)
        return True

    @staticmethod
    def get_expense_stats():
        expenses = read_json(EXPENSES_FILE, [])
        total = 0.0
        by_category = {}
        for e in expenses:
            amt = e.get("amount", 0.0)
            cat = e.get("category", "Other")
            total += amt
            by_category[cat] = by_category.get(cat, 0.0) + amt
            
        # Format for Chart.js
        labels = list(by_category.keys())
        data = list(by_category.values())
        
        return {
            "total": total,
            "chart": {
                "labels": labels,
                "data": data
            }
        }

    # ------------------ QUIZ RESULTS ------------------
    @staticmethod
    def save_quiz_result(topic, score, total):
        results = read_json(QUIZ_FILE, [])
        res = {
            "id": f"quiz-{int(time.time()*1000)}",
            "topic": topic,
            "score": score,
            "total": total,
            "date": time.strftime("%Y-%m-%d %H:%M")
        }
        results.insert(0, res)
        write_json(QUIZ_FILE, results)
        return res
        
    @staticmethod
    def get_quiz_results():
        return read_json(QUIZ_FILE, [])
