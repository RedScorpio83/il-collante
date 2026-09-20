---
title: "ESP32-P4 Voice Assistant: Dispositivo Vocale Locale & AI Audio"
description: "Prototipo di assistente vocale da scrivania basato sul microcontroller ESP32-P4, con streaming audio bidirezionale a bassa latenza, display touch e integrazione con modelli linguistici."
pubDate: 2026-07-04
technologies: ["ESP32-P4", "C++", "Audio Streaming", "WebSockets", "Python", "Gemini Audio API", "I2S"]
status: "in-progress"
featured: false
githubUrl: "https://github.com/alessandrocaliciotti"
---

## Il Concetto

Gli assistenti vocali commerciali (Alexa, Google Home) dipendono interamente dai server cloud dei big tech, registrano costantemente l'ambiente domestico e hanno limitate capacità di comprensione del contesto rispetto ai moderni modelli di intelligenza artificiale generativa multimodale.

## L'Architettura Sperimentale

1. **Hardware Core (ESP32-P4):** Sfruttamento del nuovo processore RISC-V dual-core ad alte frequenze con supporto esteso alla grafica MIPI-DSI e gestione nativa di flussi audio digitali.
2. **Codec Audio I2S & Microfoni MEMS:** Campionamento audio in tempo reale con filtraggio del rumore di fondo locale.
3. **Pipeline di Comunicazione WebSocket:** Canale duplex bidirezionale compresso verso un microservizio Python locale su Proxmox VE.
4. **Interazione Multimodale:** Streaming dell'audio direttamente verso endpoint con capacità audio native (Gemini Audio / LLM) e sintesi vocale di ritorno riprodotta dall'altoparlante integrato con latenza sub-secondo.
