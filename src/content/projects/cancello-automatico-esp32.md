---
title: "CancelloAutomatico: Smart Gate Controller ESP32 con Visione AI"
description: "Centralina domotica basata su ESP32 e relè optoisolati per il controllo del cancello carraio, integrata con Frigate NVR per l'apertura intelligente su riconoscimento veicoli e persone."
pubDate: 2026-07-15
technologies: ["ESP32", "C++", "ESPHome", "Frigate NVR", "MQTT", "Hardware PCB", "Home Assistant"]
status: "completed"
featured: false
githubUrl: "https://github.com/alessandrocaliciotti"
---

## Il Problema

I radiocomandi tradizionali per cancelli automatici hanno portata limitata, le batterie si scaricano e non permettono di sapere se il cancello è effettivamente chiuso, bloccato o rimasto socchiuso. I moduli Wi-Fi commerciali per cancelli si appoggiano a server cloud cinesi con latenze inaccettabili e nessun controllo sui dati di accesso all'abitazione.

## La Soluzione Progettata

Un'unità di controllo locale basata su **ESP32** montata all'interno del quadro automazione del cancello:

1. **Interfaccia Elettromeccanica Sicura:** Modulo a relè optoisolati per intercettare i contatti puliti di apertura parziale (pedonale) e totale (carraio), con ingressi a optoisolatore per verificare i finecorsa magnetici di stato (cancello aperto/chiuso/in movimento).
2. **Integrazione con Frigate AI Vision:** Collegamento con il server NVR Frigate tramite broker MQTT. Quando una telecamera IP perimetrale rileva l'arrivo dell'auto autorizzata o una persona riconosciuta, l'automazione locale predispone l'apertura senza necessità di estrarre lo smartphone o usare telecomandi.
3. **Firmware Locale ad Alta Affidabilità:** Sviluppato con ESPHome/C++, con fallback manuale tramite pulsanti fisici in caso di assenza temporanea di rete Wi-Fi.
4. **Protezione e Sicurezza:** Timeout automatici di sicurezza, allarme sonoro/notifica se il cancello resta aperto oltre una soglia configurabile e registro accessi locale salvato su database temporale.
