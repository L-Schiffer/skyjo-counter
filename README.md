# Skyjo Punkterechner

Mobile-optimierte Webanwendung zum Tracken von Skyjo-Spielen mit Login, Nutzerverwaltung, Spielstatistiken und Analysen.

## Features

- **Login-System** mit Session-basierter Authentifizierung
- **Nutzerverwaltung** (Admin kann Benutzer anlegen, löschen, Passwörter zurücksetzen)
- **Spieler verwalten** (globale Spielerliste, wiederverwendbar über Spiele hinweg)
- **Skyjo-Regeln**: Rundenbeender markieren, automatische Verdopplung
- **Statistiken**: Bestenliste, Durchschnittspunkte, Spielhistorie mit Detailansicht und Punkteverlauf-Chart
- **SQLite-Datenbank** mit Volume-Mount (Daten bleiben über Container-Neustarts erhalten)
- **Mobile-first** Design, optimiert für Handybrowser

## Deployment auf deinem Hetzner Server

### 1. Dateien auf den Server kopieren

```bash
scp -r skyjo-app/ root@dein-server:/opt/skyjo-app
```

### 2. Umgebungsvariablen anpassen

In `docker-compose.yml`:
```yaml
environment:
  - ADMIN_USER=admin          # Initialer Admin-Username
  - ADMIN_PASS=dein-passwort  # Initiales Admin-Passwort (bitte ändern!)
  - SESSION_SECRET=ein-langer-zufallsstring
```

### 3. Container starten

```bash
cd /opt/skyjo-app
docker compose up -d --build
```

### 4. Caddy-Eintrag hinzufügen

In deinem Caddyfile (z.B. `/etc/caddy/Caddyfile` oder im Caddy-Container):
```
skyjo.lfnlabs.de {
    reverse_proxy localhost:3200
}
```

Caddy neu laden:
```bash
docker exec caddy caddy reload --config /etc/caddy/Caddyfile
```

### 5. DNS-Eintrag

A-Record für `skyjo.lfnlabs.de` auf deine Server-IP setzen.

### 6. Fertig

Öffne `https://skyjo.lfnlabs.de` im Handybrowser und logge dich mit den Admin-Credentials ein.

## Architektur

```
Browser (SPA)
    ↓ HTTP/JSON
Express.js (server.js)
    ↓ SQL
SQLite (data/skyjo.db)
    ↓ Volume
Docker Volume (skyjo-data)
```

## API-Endpunkte

| Methode | Pfad | Beschreibung |
|---------|------|-------------|
| POST | /api/login | Login |
| POST | /api/logout | Logout |
| GET | /api/me | Session-Check |
| GET/POST/DELETE | /api/users | Nutzerverwaltung (Admin) |
| PUT | /api/users/:id/password | Passwort ändern (Admin) |
| GET/POST/DELETE | /api/players | Spieler verwalten |
| GET/POST/DELETE | /api/games | Spiele CRUD |
| POST | /api/games/:id/rounds | Runde hinzufügen |
| POST | /api/games/:id/finish | Spiel beenden |
