# 🎵 Rhythmus-Lern-App - Installation & Setup

## 📦 Dateien-Übersicht

Diese App besteht aus **5 Hauptdateien**:

1. **teacher.html** - Lehrer-Interface (Spielsteuerung)
2. **teacher_v3.js** - Lehrer-Logik (JavaScript)
3. **student.html** - Schüler-Interface (mobil-optimiert)
4. **student_v3.js** - Schüler-Logik (JavaScript)
5. **rhythms-database.json** - Rhythmen-Datenbank (270+ Rhythmen)

---

## 🚀 GitHub Setup (Schritt für Schritt)

### 1️⃣ Repository erstellen
1. Gehe zu https://github.com und logge dich ein
2. Klicke auf **"New Repository"** (grüner Button oben rechts)
3. Name: `rhythmus-app` (oder beliebiger Name)
4. ✅ Haken bei **"Public"** setzen (wichtig für GitHub Pages!)
5. ✅ Haken bei **"Add a README file"** (optional)
6. Klicke **"Create repository"**

### 2️⃣ Dateien hochladen
1. In deinem neuen Repository: Klicke **"Add file" → "Upload files"**
2. Ziehe alle 5 Dateien in das Upload-Feld:
   - `teacher.html`
   - `teacher_v3.js`
   - `student.html`
   - `student_v3.js`
   - `rhythms-database.json`
3. Commit Message: "Initial commit - Rhythmus-App v3"
4. Klicke **"Commit changes"**

### 3️⃣ GitHub Pages aktivieren
1. Gehe zu **Settings** (Zahnrad-Symbol oben im Repo)
2. Scrolle runter zu **"Pages"** (linke Sidebar)
3. Bei **"Source"**: Wähle **"main"** branch
4. Klicke **"Save"**
5. Nach ~1 Minute ist deine App online unter:
   ```
   https://DEIN-GITHUB-USERNAME.github.io/rhythmus-app/teacher.html
   ```

### 4️⃣ JavaScript-Dateien verlinken
**WICHTIG:** In `student_v3.js` musst du die GitHub-URL anpassen!

1. Öffne `student_v3.js` in GitHub (klicke auf die Datei)
2. Klicke auf **das Stift-Symbol** (Edit)
3. Finde **Zeile 69** (ca.):
   ```javascript
   const response = await fetch('https://raw.githubusercontent.com/YOUR_USERNAME/YOUR_REPO/main/rhythms-database.json');
   ```
4. Ersetze durch deine echte URL:
   ```javascript
   const response = await fetch('https://raw.githubusercontent.com/DEIN-USERNAME/rhythmus-app/main/rhythms-database.json');
   ```
5. Klicke **"Commit changes"**

**Dasselbe in `teacher_v3.js` Zeile 52!**

---

## 🔧 Firebase ist bereits konfiguriert

Die Firebase-Config ist bereits in beiden JS-Dateien eingebaut:
```javascript
const firebaseConfig = {
    apiKey: "AIzaSyDLAxah2nlomC5yP35h9M-s73xrr9QCr3A",
    authDomain: "rhythmuslehrer.firebaseapp.com",
    databaseURL: "https://rhythmuslehrer-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "rhythmuslehrer",
    storageBucket: "rhythmuslehrer.firebasestorage.app",
    messagingSenderId: "673658087151",
    appId: "1:673658087151:web:0d4dfb46bf94e0dd896e1f"
};
```

✅ **DSGVO-konform** (Server: Frankfurt, europe-west1)  
✅ **Realtime Database** aktiviert  
✅ **Authentifizierung** optional (aktuell anonym)

---

## 🎯 Nutzung im Unterricht

### Als Lehrer:
1. Öffne: `https://DEIN-USERNAME.github.io/rhythmus-app/teacher.html`
2. Wähle Einstellungen (Taktart, Level, Anzahl Fragen)
3. Klicke **"Spiel starten"**
4. QR-Code wird angezeigt → Schüler scannen lassen
5. Wenn alle beigetreten sind: **"Spiel starten"**
6. Rhythmen werden automatisch abgespielt
7. Am Ende: **"Spiel beenden"** → Ergebnisse sehen

### Als Schüler:
1. QR-Code scannen ODER manuell eingeben:
   `https://DEIN-USERNAME.github.io/rhythmus-app/student.html?game=ABCD`
2. Namen eingeben → **"Beitreten"**
3. Warten bis Lehrer startet
4. Rhythmus anhören → 4 Audio-Optionen durchhören
5. Richtige Antwort auswählen
6. Zwischenbildschirm zeigt Feedback + Motivation
7. Am Ende: Gesamtergebnis mit Prozent

---

## 🎨 Features (alle umgesetzt!)

### Lehrer-Seite:
✅ QR-Code-Generierung (funktioniert!)  
✅ Rhythmen-Datenbank von GitHub laden  
✅ Live-Teilnehmerzahl-Anzeige  
✅ Metronom-Vorzählen (1 Takt vor Rhythmus)  
✅ Leises Rauschen in Pausen  
✅ Kompakte Notation in EINER Zeile  
✅ Tab-System (Spiel / Rhythmen verwalten)  
✅ 6 Instrumente (Holzblock, Kuhglocke, Snare, Becken, Conga, Claves)

### Schüler-Seite:
✅ Mobil-optimiert (Hochformat)  
✅ 4 farbige Buttons (Rot, Blau, Orange, Grün)  
✅ Keine störenden Feedback-Boxen mehr  
✅ Motivierende Phrasen ("50% richtig, dran bleiben!")  
✅ Richtig/Falsch erst auf Zwischenbildschirm  
✅ Prozentuale Fortschrittsanzeige  
✅ 10 verschiedene Motivations-Sprüche

### Rhythmen-Datenbank:
✅ 270+ Rhythmen  
✅ 3 Taktarten (4/4, 3/4, 6/8)  
✅ 3 Schwierigkeitsstufen (Anfänger, Fortgeschritten, Profi)  
✅ Mit/ohne Pausen  
✅ 15+ Rhythmen pro Kategorie  
✅ Online editierbar (GitHub JSON)

---

## 🔍 Troubleshooting

### QR-Code wird nicht angezeigt
- **Lösung:** Stelle sicher dass `qrcode.min.js` CDN geladen wird
- Check in Browser-Konsole (F12): Keine Fehler bei QRCode.js?

### Rhythmen-Datenbank lädt nicht
- **Lösung:** GitHub-URL in JS-Dateien anpassen (siehe Schritt 4️⃣)
- URL muss `raw.githubusercontent.com` enthalten!

### Metronom spielt nicht ab
- **Lösung:** Audio Context braucht User-Interaktion
- Erst nach dem ersten Click/Touch wird Audio aktiv

### Firebase-Fehler
- **Lösung:** Prüfe Firebase Console → Realtime Database → Rules

**⚠️ WICHTIG: Sichere Rules verwenden!**

**Für Tests (unsicher, nur für kurze Zeit!):**
```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```

**Für Produktion (EMPFOHLEN - sicher!):**
```json
{
  "rules": {
    "games": {
      "$gameCode": {
        ".read": true,
        ".write": "!data.exists() || data.child('status').val() !== 'finished'",
        "players": {
          ".write": "data.parent().child('status').val() === 'waiting'"
        },
        "answers": {
          ".write": "data.parent().child('status').val() === 'playing'"
        }
      }
    }
  }
}
```

**Was macht das?**
- ✅ Jeder kann Spiele lesen (QR-Code scannen)
- ✅ Neue Spiele können erstellt werden
- ✅ Spieler können nur im Status "waiting" beitreten
- ✅ Antworten können nur im Status "playing" abgegeben werden
- ✅ Beendete Spiele können nicht mehr geändert werden

### Schüler können nicht beitreten
- **Lösung:** Spiel muss im Status "waiting" sein
- Lehrer muss zuerst auf "Spiel starten" klicken

---

## 📱 Browser-Kompatibilität

✅ **Chrome/Edge** (Desktop + Mobile) - Voll unterstützt  
✅ **Safari** (iOS) - Funktioniert (Audio Context quirks beachten)  
✅ **Firefox** - Funktioniert  
⚠️ **Internet Explorer** - Nicht unterstützt (veraltet)

---

## 🎓 Technologie-Stack

- **Frontend:** Pure HTML5 + CSS3 + Vanilla JavaScript (kein Framework!)
- **Backend:** Firebase Realtime Database (DSGVO-konform, Frankfurt)
- **Audio:** Web Audio API (synthesized sounds)
- **QR-Code:** QRCode.js Library (MIT License)
- **Hosting:** GitHub Pages (kostenlos, zuverlässig)

---

## 📄 Lizenz & Credits

**Entwickelt für:** Jonathan Högg (Werkstattschule Jena)  
**Verwendung:** Frei für Bildungszwecke  
**Support:** Bei Fragen → GitHub Issues erstellen

---

## 🚀 Next Steps (optional für später)

- [ ] Leaderboard (Rangliste nach Punkten)
- [ ] Sound-Upload (eigene Instrumente hochladen)
- [ ] Export-Funktion (Ergebnisse als PDF)
- [ ] Multiplayer-Modi (Team vs Team)
- [ ] Rhythmus-Generator (zufällige neue Patterns)

---

**Viel Erfolg im Unterricht! 🎵🔥**
