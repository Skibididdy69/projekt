# StudyTurbo AI

En modern Flask-webbsida redo att kora direkt pa Replit.

## Projektstruktur

```text
.
├── app.py
├── requirements.txt
├── README.md
├── .replit
├── templates/
│   ├── index.html
│   └── privacy.html
└── static/
    ├── style.css
    └── script.js
```

## Funktioner

- Klistra in text och valj mellan `Sammanfatta`, `Quiz` eller `Flashcards`
- Resultat visas i moderna cards
- Freemium-demo med 3 gratis anvandningar per dag
- Fake `Upgrade to Premium`-knapp
- Google AdSense placeholders i header och mitt pa sidan
- Cookie-banner som styr om annonser visas
- Privacy Policy-sida under `/privacy`

## Kora pa Replit

1. Skapa ett nytt Replit-projekt med Python.
2. Lagg in alla filer i samma struktur som ovan.
3. Se till att `requirements.txt` innehaller Flask.
4. Tryck pa `Run`.

Replit kommer att starta `app.py` via `.replit` och Flask lyssnar pa `0.0.0.0` samt `PORT` fran miljo variabler.

## Lokal korning

```bash
pip install -r requirements.txt
python app.py
```

## Byta ut placeholder-AI mot OpenAI senare

All placeholder-logik finns i funktionen `build_placeholder_response()` i `app.py`.

Nar du vill koppla in riktig AI:

1. Ersatt innehallet i `build_placeholder_response()` eller skapa en ny funktion bredvid.
2. Skicka `text` och `mode` till OpenAI API.
3. Returnera samma JSON-format som frontend redan forvantar sig:

```json
{
  "mode": "summary",
  "title": "Titel",
  "subtitle": "Undertitel",
  "items": []
}
```

Det gor att du kan byta backendlogik utan att skriva om frontend.
