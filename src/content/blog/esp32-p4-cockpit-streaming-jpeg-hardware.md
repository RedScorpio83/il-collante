---
title: "Come portare una dashboard su ESP32-P4 a 20 FPS con decodifica JPEG hardware"
description: "Abbandonare VNC per il silicio RISC-V: decodifica JPEG in 6.5 ms, streaming da 0.9 MB/s e allineamento a 16 pixel su display Waveshare 7 pollici."
pubDate: 2026-09-21
tags: ["esp32", "embedded", "hardware", "risc-v", "hems", "c++"]
---

Avere un cruscotto fisico touch sul comodino o nel quadro della sala tecnica per controllare in tempo reale la produzione solare, le batterie e l'auto elettrica è il sogno di ogni appassionato di domotica. Quando però provi a visualizzare una moderna dashboard web ricca di grafici SVG e flussi animati su un display compatto, ti scontri subito con la cruda realtà dei microcontrollori: **i browser consumano troppa RAM e lo streaming remoto standard scatta in modo ingestibile**.

Abbiamo risolto questo problema trasformando il nuovo chip **ESP32-P4** in un monitor industriale ad altissime prestazioni: ecco come siamo passati da un flusso VNC pesante e bloccato a **20 fotogrammi al secondo fluidi**, sfruttando l'acceleratore hardware JPEG integrato nel silicio.

---

## 1. Il Problema: Il Collasso dello Streaming VNC Tradizionale

Per monitorare il nostro ecosistema **Solar Hub HEMS** (25 kWp di fotovoltaico e 36 kWh di batterie), avevamo sviluppato un'interfaccia web reattiva con diagrammi unifilari SVG, curve Solcast e telemetria BMS al secondo. 

La prima idea per visualizzarla su un display touch da banco **Waveshare 7" (1024×600)** pilotato da ESP32-P4 sembrava banale: avviare un server VNC sul container Proxmox ed eseguire un client VNC leggero sull'ESP32.

I risultati sono stati disastrosi:
* **Throughput ingestibile:** Trasmettere il framebuffer grezzo non compresso a 1024×600 a 16 bit richiedeva oltre **30 MB/s** di traffico continuo sulla rete Wi-Fi.
* **CPU al 100%:** I due core RISC-V a 400 MHz dell'ESP32-P4 erano costantemente saturati dalla decodifica software dei pacchetti RFB.
* **Frame rate ridicolo:** Il display aggiornava a malapena **2-3 FPS**, con un ritardo al tocco di oltre 1,5 secondi.

---

## 2. La Svolta: L'Acceleratore Hardware JPEG nel Silicio dell'ESP32-P4

L'architettura **ESP32-P4** nasconde nel silicio una periferica dedicata che la maggior parte degli sviluppatori ignora: un **coprocessore di decodifica hardware JPEG** ad accesso DMA diretto.

Invece di trasferire pixel grezzi, abbiamo ripensato il canale di trasmissione:

```text
┌────────────────────────────────────────────────────────┐
│             Container Proxmox LXC (CT 110)             │
│   Chromium Headless (1024×600) su Xvfb                 │
│   Cattura Framebuffer + Encoding TurboJPEG (Quality 75)│
└───────────────────────────┬────────────────────────────┘
                            │ Stream HTTP Chunked (~0.9 MB/s)
                            ▼
┌────────────────────────────────────────────────────────┐
│            Waveshare ESP32-P4 (RISC-V 400 MHz)         │
│   1. Ricezione buffer DMA Wi-Fi 6                      │
│   2. Decodifica Hardware JPEG integrata (6.5 ms)       │
│   3. Direct Rendering su bus MIPI-DSI / RGB a 20 FPS   │
└────────────────────────────────────────────────────────┘
```

1. Sul server Proxmox, un processo cattura lo schermo virtuale Xvfb e lo comprime istantaneamente usando **libjpeg-turbo** con sottocampionamento cromatico `4:2:0`.
2. Il flusso compresso occupa appena **0.8 - 0.9 MB/s** (un abbattimento del 97% della banda di rete).
3. L'ESP32-P4 riceve il pacchetto JPEG e lo invia direttamente all'hardware decoder interno. Il tempo di decodifica a fotogramma è sceso da 180 ms (via software) a soli **6.5 millisecondi**.

---

## 3. La Trappola del Silicio: L'Allineamento a 16 Pixel

Durante i primi test con il decoder hardware, lo schermo mostrava artefatti violacei e righe diagonali spezzate. 

Studiando i registri interni del chip abbiamo scoperto il motivo: **l'hardware decoder dell'ESP32-P4 richiede che larghezza e altezza del frame siano multipli esatti della MCU (Minimum Coded Unit), ovvero 16 pixel.**

La risoluzione nativa del display era $1024 \times 600$:
* $1024 / 16 = 64$ (Perfetto, multiplo intero).
* $600 / 16 = 37.5$ (Non intero! Il decoder generava un buffer corrotto).

È bastato configurare il canvas di cattura virtuale a **1024×608 pixel** (multiplo esatto di 16) e ritagliare le 8 righe nere invisibili a livello di sincronizzazione hardware per ottenere un'immagine nitida al pixel.

---

## 4. Benchmark di Campo: Prima vs Dopo

| Parametro Operativo | Streaming VNC Tradizionale | Pipeline JPEG Hardware ESP32-P4 | Miglioramento |
| :--- | :---: | :---: | :---: |
| **Banda di Rete Locale** | $\sim 31.5\text{ MB/s}$ | **$0.88\text{ MB/s}$** | **-97.2% di traffico** |
| **Tempo di Decodifica Frame** | $\sim 185\text{ ms}$ (software) | **$6.5\text{ ms}$ (hardware DMA)** | **28 volte più veloce** |
| **Frame Rate Effettivo** | $2.5\text{ FPS}$ (a scatti) | **$20.0\text{ FPS}$ (fluido)** | **+700% di fluidità** |
| **Latenza del Tocco Touch** | $\sim 1500\text{ ms}$ | **$< 45\text{ ms}$** | **Reattività istantanea** |
| **Carico CPU Microcontrollore** | $98\%$ (surriscaldamento) | **$18\%$ (core freddo)** | **Silicio a riposo** |

---

## 5. Lezioni per Sviluppatori Embedded

Non tentate di reinventare la grafica vettoriale complessa direttamente su microcontrollori poveri di memoria quando avete a disposizione una macchina Linux sul server locale. 

Disegnare la dashboard su un motore web moderno (HTML5, SVG, CSS) ed effettuare lo **streaming compresso con decodifica hardware accelerata** permette di avere interfacce grafiche sbalorditive mantenendo il microcontrollore freddo, reattivo e stabile nel tempo.
