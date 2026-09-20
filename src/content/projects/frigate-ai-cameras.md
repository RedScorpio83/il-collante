---
title: "Frigate NVR AI & Reverse Engineering Firmware Telecamere IP"
description: "Infrastruttura di videosorveglianza locale con intelligenza artificiale accelerata (Frigate NVR) e hacking del firmware su telecamere IP commerciali per sbloccare flussi RTSP locali."
pubDate: 2026-07-17
technologies: ["Frigate NVR", "RTSP", "Embedded Linux", "Firmware Hacking", "Docker", "Object Detection AI"]
status: "active"
featured: false
githubUrl: "https://github.com/alessandrocaliciotti"
---

## Il Problema

La maggior parte delle telecamere di videosorveglianza economiche sul mercato (come le GNCC GT1 Pro e simili modelli basati su SoC Ingenic o Anyka) viene venduta con firmware blindati che obbligano l'utente a passare per app per smartphone proprietarie e cloud cinesi in abbonamento, senza fornire un flusso RTSP standard o accesso locale diretto.

## La Soluzione Realizzata

### 1. Reverse Engineering e Flashing Firmware al Banco
- Apertura delle telecamere e individuazione delle linee seriali di debug UART (TX/RX/GND).
- Dump del bootloader U-Boot e del file system originale via porta seriale e lettore SPI flash.
- Installazione di firmware open-source alternativi leggeri capaci di avviare un server RTSP H.264/H.265 puro sulla porta 554, bloccando alla radice ogni connessione verso l'esterno a livello di firewall di rete.

### 2. Pipeline NVR con Frigate AI
- Integrazione dei flussi video ad altissima risoluzione in un'istanza dedicata di **Frigate NVR** su container Proxmox VE.
- Accelerazione hardware per il rilevamento di oggetti in tempo reale (persone, veicoli, animali), abbattendo del 99% i falsi positivi causati da ombre, rami o pioggia rispetto ai sensori PIR tradizionali.
- Notifiche immediate con ritaglio dell'oggetto rilevato e trigger verso i sistemi di automazione perimetrale (luci, cancello automatico).
