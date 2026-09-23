---
title: "Zero latenza tra Proxmox e silicio: IPC in RAM condivisa per il cockpit touch ESP32-P4"
description: "Dall'errore 13 della sandbox LXC alla memoria condivisa /dev/shm: come visualizzare telemetria industriale in tempo reale su 6 schermate senza lag."
pubDate: 2026-09-22
tags: ["proxmox", "linux", "esp32", "ipc", "hems", "sistemi"]
---

Risolto il problema della decodifica video a 20 FPS con l'hardware JPEG dell'ESP32-P4, è emersa una seconda sfida molto più insidiosa: **la veridicità e la freschezza dei dati visualizzati**.

In un impianto fotovoltaico ed energetico industriale non puoi permetterti grafici che visualizzano dati simulati, setpoint disallineati rispetto ai termostati o curve del solutore matematico non aggiornate. Peggio ancora: avviando un browser Chromium in modalità kiosk headless all'interno di un container Proxmox LXC non privilegiato, i permessi di sicurezza del kernel possono bloccare l'accesso alla rete interna!

Ecco come abbiamo superato l'errore 13 della sandbox Linux e implementato un canale **IPC (Inter-Process Communication) a zero latenza basato su memoria condivisa (`/dev/shm`)**, garantendo che ogni pixel del display rifletta lo stato fisico reale dell'impianto.

---

## 1. L'Incidente della Sandbox LXC: L'Errore 13 di Chromium

Solar Hub opera su Proxmox VE all'interno del container `CT 110`, configurato come **LXC unprivileged** per ragioni di sicurezza sistemistica. In questa modalità, l'utente root del container è mappato su un UID non privilegiato dell'host Proxmox.

Quando Chromium viene avviato in modalità kiosk automatica su Xvfb (`DISPLAY=:99`), il suo Network Service interno tenta di allocare socket ad alto livello:
```text
[FATAL:network_service_instance_impl.cc] Network service process crashed!
Error 13: Permission Denied (LXC namespace sandbox restriction)
```

La soluzione non era rendere il container insicuro (*privileged*), ma isolare il browser facendolo dialogare tramite memoria condivisa:
1. Disabilitazione della sandbox interna di rete con i flag dedicati `--no-sandbox --disable-setuid-sandbox --disable-dev-shm-usage`.
2. Sostituzione delle chiamate HTTP locali con un file mapper atomico in memoria RAM.

---

## 2. L'Architettura IPC a Zero Latenza (`/dev/shm`)

Invece di far compiere alle metriche il percorso tortuoso *Python → Socket TCP HTTP → Chromium Network Process → JavaScript Fetch → DOM*, abbiamo creato un ponte diretto attraverso la memoria RAM del container:

```text
┌────────────────────────────────────────────────────────┐
│             Python Backend Core (Solar Hub)            │
│   Ingestione Modbus Huawei + Seriale PI30 Datouboss    │
└───────────────────────────┬────────────────────────────┘
                            │ Scrittura Atomica (os.replace)
                            ▼
┌────────────────────────────────────────────────────────┐
│             Memoria RAM Condivisa: /dev/shm/           │
│   /dev/shm/cockpit_live_state.json (Aggiornato a 1 Hz) │
└───────────────────────────┬────────────────────────────┘
                            │ Lettura Memory-Mapped (<0.1 ms)
                            ▼
┌────────────────────────────────────────────────────────┐
│           Renderer Xvfb + Chromium Headless            │
│   Rendering Web 1024×600 a 60 FPS senza rete interna   │
└────────────────────────────────────────────────────────┘
```

Scrivere lo stato del sistema in `/dev/shm` (memoria RAM volatile montata su Linux) abbatte la latenza a **frazioni di microsecondo**, elimina qualsiasi carico di I/O su disco SSD/ZFS e garantisce che il browser legga sempre uno snapshot consistente e privo di corruzioni.

---

## 3. Le 6 Schermate Live sul Display Waveshare 7"

Con questo canale diretto abbiamo eliminato ogni singolo mockup dall'interfaccia:
1. **Schermata 0 (Sinottico Unifilare):** Diagramma SCADA vettoriale con frecce animate che indicano i flussi tra Tetto, Pergola, Batterie Huawei/Humsi, Rete e Casa.
2. **Schermata 1 (Mobilità Elettrica):** Stato di carica reale (SoC) della Dacia Spring, potenza modulata in tempo reale e curva di carica.
3. **Schermata 2 (Climatizzazione & VMC):** Temperature delle 4 sonde nei condotti dell'aria, stato del by-pass e setpoint termici attivi.
4. **Schermata 3 (Planner HiGHS MILP 48h):** Curva oraria di allocazione energetica ricalcolata ogni 60 minuti su base previsioni Solcast.
5. **Schermata 4 (AI Jev-like Scorer):** Decisioni probabilistiche del motore System 1 ad alta velocità con visualizzazione del ranking delle strategie.
6. **Schermata 5 (Storico & Autoconsumo):** Bilancio cumulato giornaliero con percentuale di autosufficienza energetica.

La combinazione tra containerizzazione Proxmox, memoria condivisa Linux e accelerazione silicio ESP32-P4 permette di avere la robustezza di uno SCADA industriale al costo di componenti consumer.
