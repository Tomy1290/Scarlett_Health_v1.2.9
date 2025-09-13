# 🚀 Scarletts Gesundheitstracking - Backend Deployment Guide

## Chat-API Online Deployment (v1.2.6)

### Option 1: Railway (Empfohlen) ⭐

1. **Repository vorbereiten**:
   ```bash
   # Bereits bereit mit:
   - Dockerfile
   - railway.json
   - server_production.py (ohne MongoDB)
   - requirements.txt
   ```

2. **Bei Railway deployen**:
   - Gehe zu https://railway.app
   - "Deploy from GitHub repo" auswählen
   - Repository: `https://github.com/Tomy1290/Scarlett_Health_v1.2.6.git`
   - Railway erkennt automatisch das Dockerfile

3. **Environment Variables setzen**:
   ```
   EMERGENT_LLM_KEY=sk-emergent-e34Af18EdBf12063f7
   PORT=8000
   ```

4. **Nach Deployment**:
   - Railway gibt Ihnen eine URL wie: `https://your-app.railway.app`
   - Chat-API verfügbar unter: `https://your-app.railway.app/api/chat`

### Option 2: Render.com

1. **Bei Render anmelden**: https://render.com
2. **New Web Service** → GitHub Repository verbinden
3. **Settings**:
   - Build Command: `cd backend && pip install -r requirements.txt`
   - Start Command: `cd backend && uvicorn server_production:app --host 0.0.0.0 --port $PORT`
   - Environment Variables:
     ```
     EMERGENT_LLM_KEY=sk-emergent-e34Af18EdBf12063f7
     ```

### Option 3: Heroku

1. **Heroku CLI installieren** und anmelden
2. **App erstellen**:
   ```bash
   heroku create scarlett-health-api
   heroku config:set EMERGENT_LLM_KEY=sk-emergent-e34Af18EdBf12063f7
   git push heroku main
   ```

3. **Procfile erstellen** (falls nicht automatisch erkannt):
   ```
   web: cd backend && uvicorn server_production:app --host 0.0.0.0 --port $PORT
   ```

## 🧪 API-Endpunkte testen

### Basis-Check:
```bash
curl https://your-deployed-url.com/
```

### Chat-Test:
```bash
curl -X POST "https://your-deployed-url.com/api/chat" \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "greeting",
    "language": "de",
    "summary": {
      "water": "3 Gläser heute",
      "pills": "morgens genommen"
    }
  }'
```

### Health-Check:
```bash
curl https://your-deployed-url.com/api/health
```

## 📱 Frontend-Integration

Nach dem Deployment müssen Sie die Backend-URL in der Frontend-App aktualisieren:

### Frontend/.env aktualisieren:
```bash
EXPO_PUBLIC_BACKEND_URL=https://your-deployed-url.com
```

## 🔧 Features der Production-API:

✅ **Chat-Endpunkt**: `/api/chat` mit Emergent LLM Integration  
✅ **Fallback-System**: Funktioniert auch ohne LLM-Service  
✅ **CORS aktiviert**: Für Frontend-Integration  
✅ **Health-Checks**: `/api/health` für Monitoring  
✅ **Multi-Language**: Deutsch, Englisch, Polnisch  
✅ **Kontextbewusst**: Nutzt Gesundheitsdaten für personalisierte Antworten  

## ⚡ Quick-Start (Railway):

1. Fork das Repository: https://github.com/Tomy1290/Scarlett_Health_v1.2.6.git
2. Gehe zu https://railway.app → "Deploy from GitHub"
3. Wähle das Repository aus
4. Setze `EMERGENT_LLM_KEY=sk-emergent-e34Af18EdBf12063f7`
5. Deploy! 🚀

Die API ist dann unter der Railway-URL verfügbar und Ihre App kann die Cloud-LLM Funktionalität nutzen.

## 📊 Production Features:

- **In-Memory Storage**: Status-Checks werden temporär gespeichert
- **LLM Integration**: Emergent Integration mit GPT-4o-mini
- **Smart Fallbacks**: Kontextuelle Antworten auch ohne LLM
- **Health Data Aware**: Versteht Gesundheitskontext der App
- **Robust Error Handling**: Graceful Degradation bei Fehlern