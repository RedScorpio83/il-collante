---
title: "EnergyLife: Piattaforma di Intelligenza Energetica & OCR Bollette"
description: "Suite full-stack per la sintesi dei dati di consumo, analisi predittiva dei costi, scanner intelligente per bollette energetiche e architettura modulare su Proxmox."
pubDate: 2026-07-25
technologies: ["TypeScript", "Python", "OCR", "Proxmox", "FastAPI", "Docker", "MCP"]
status: "active"
featured: true
githubUrl: "https://github.com/alessandrocaliciotti"
---

## Il Problema

I consumatori e le piccole aziende affrontano una burocrazia tariffaria complessa: le bollette di luce e gas sono piene di voci opache (dispacciamento, quote fisse, spread, accise e scaglioni) che rendono quasi impossibile verificare se il fornitore sta applicando le tariffe promesse e se conviene cambiare offerta o investire in autoconsumo.

## La Soluzione

**EnergyLife** è una piattaforma progettata per automatizzare l'acquisizione, la decodifica e la simulazione energetica su scala micro e macro.

### Caratteristiche Fondamentali

1. **AI Document Scanner & OCR Avanzato:** Pipeline per estrarre in pochi secondi PUN, F1/F2/F3, costi di commercializzazione, potenza impegnata e consumi effettivi dai PDF delle bollette di qualsiasi gestore italiano.
2. **Motore di Simulazione Tariffaria:** Calcolo predittivo dell'impatto economico di un impianto fotovoltaico o di un sistema di accumulo sui consumi storici dell'utente.
3. **Data Synthesizer & Privacy-First (GDPR):** Esportazione conforme e anonimizzazione dei dati energetici sensibili con backup automatico locale.
4. **Architettura a Moduli Dinamici & MCP Server:** Integrazione con Model Context Protocol (MCP) per permettere ad agenti IA e copiloti di interrogare stato, schemi e parametri di sistema in tempo reale su cluster Proxmox VE.

## Impatto

EnergyLife consente di auditare al centesimo ogni fattura energetica, confrontare offerte di mercato senza intermediari commerciali e verificare il ritorno sull'investimento reale degli impianti solari ed elettrici.
