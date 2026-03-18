from __future__ import annotations

import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from flask import Flask, jsonify, render_template, request


# Flask app for Replit and local development.
app = Flask(__name__)


# Free plan users get three requests per UTC day.
FREE_DAILY_LIMIT = 3


def create_app() -> Flask:
    """Application factory kept simple for future scaling."""
    return app


def get_today_key() -> str:
    """Return a stable day key used by the frontend usage counter."""
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


def build_placeholder_response(text: str, mode: str) -> dict[str, Any]:
    """
    Generate placeholder AI output.

    Replace this function with a real OpenAI call later if needed.
    Keep the response format stable so the frontend does not need changes.
    """
    cleaned_text = " ".join(text.split())
    preview = cleaned_text[:280]
    normalized = cleaned_text.replace("!", ".").replace("?", ".")
    sentences = [part.strip() for part in normalized.split(".") if part.strip()]

    if mode == "summary":
        points = sentences[:3] or [
            "Texten verkar kort, men huvudidén handlar om att förstå innehållet snabbare.",
            "Sammanfattningsläget lyfter fram det viktigaste i ett lättläst format.",
        ]
        return {
            "mode": "summary",
            "title": "Smart sammanfattning",
            "subtitle": "Placeholder-svar från backend. Här kan du koppla in OpenAI senare.",
            "items": [
                {"type": "summary", "heading": f"Nyckelpoäng {index}", "content": point}
                for index, point in enumerate(points, start=1)
            ],
            "meta": {"sourcePreview": preview, "estimatedReadingTime": "1 min"},
        }

    if mode == "quiz":
        chunks = sentences[:3] or [
            "Vilken huvudidé presenteras i texten",
            "Vilket problem försöker innehållet lösa",
            "Vilken del verkar viktigast att komma ihåg",
        ]
        return {
            "mode": "quiz",
            "title": "Quizgenerator",
            "subtitle": "Tre övningsfrågor för snabb repetition.",
            "items": [
                {
                    "type": "quiz",
                    "heading": f"Fråga {index}",
                    "content": f"Vad är den viktigaste lärdomen från: \"{chunk[:80]}\"?",
                    "answer": "Ett bra svar bör förklara kärnpoängen och varför den är viktig i sammanhanget.",
                }
                for index, chunk in enumerate(chunks, start=1)
            ],
            "meta": {"difficulty": "Medium", "recommendedUse": "Självtest efter läsning"},
        }

    if mode == "flashcards":
        chunks = sentences[:4] or [
            "Textens huvudämne",
            "Viktig definition eller koncept",
            "Praktiskt exempel",
            "Viktig slutsats",
        ]
        return {
            "mode": "flashcards",
            "title": "Flashcards",
            "subtitle": "Kompakta kort för repetition och memorering.",
            "items": [
                {
                    "type": "flashcard",
                    "heading": f"Kort {index}",
                    "front": f"Vad betyder eller innebär: {chunk[:70]}?",
                    "back": "Detta kort sammanfattar den centrala poängen i enkel, repeterbar form.",
                }
                for index, chunk in enumerate(chunks, start=1)
            ],
            "meta": {"cardCount": len(chunks), "studyTip": "Repetera korten i korta pass för bättre minne."},
        }

    raise ValueError("Ogiltigt läge")


@app.get("/")
def index():
    """Render the landing page."""
    return render_template("index.html", free_daily_limit=FREE_DAILY_LIMIT)


@app.get("/privacy")
def privacy():
    """Render the privacy policy page."""
    return render_template("privacy.html")


@app.post("/api/process")
def process_text():
    """
    Main API endpoint.

    The frontend sends:
    - text: user input
    - mode: summary | quiz | flashcards
    - isPremium: client-side premium toggle
    - usageCount and usageDate: client-side freemium tracking
    """
    payload = request.get_json(silent=True) or {}
    text = (payload.get("text") or "").strip()
    mode = (payload.get("mode") or "").strip().lower()
    is_premium = bool(payload.get("isPremium"))
    usage_count = int(payload.get("usageCount", 0))
    usage_date = payload.get("usageDate")
    today_key = get_today_key()

    if not text:
        return jsonify({"error": "Klistra in text innan du kör analysen."}), 400

    if mode not in {"summary", "quiz", "flashcards"}:
        return jsonify({"error": "Ogiltigt läge valt."}), 400

    if not is_premium and usage_date == today_key and usage_count >= FREE_DAILY_LIMIT:
        return jsonify(
            {
                "error": "Gratisplanen har nått dagsgränsen.",
                "limitReached": True,
                "freeDailyLimit": FREE_DAILY_LIMIT,
            }
        ), 429

    result = build_placeholder_response(text, mode)
    result["provider"] = "placeholder"
    result["usage"] = {
        "todayKey": today_key,
        "freeDailyLimit": FREE_DAILY_LIMIT,
        "remaining": None if is_premium else max(FREE_DAILY_LIMIT - usage_count - 1, 0),
    }
    result["plan"] = "premium" if is_premium else "free"
    return jsonify(result)


if __name__ == "__main__":
    # Ensure folders exist before startup.
    Path(app.template_folder or "templates").mkdir(parents=True, exist_ok=True)
    Path(app.static_folder or "static").mkdir(parents=True, exist_ok=True)

    # Replit exposes the port via environment variable.
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)
