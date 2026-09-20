---
title: "SRVMana: Cross-Platform SSH Infrastructure Orchestrator in Go"
description: "Tool di orchestrazione sistemistica ad alte prestazioni scritto in Golang per la discovery automatica, inventory e dispatch concorrente di comandi e script su flotte di server Linux."
pubDate: 2026-07-02
technologies: ["Go (Golang)", "SSH", "Linux RHEL", "Debian", "CLI", "Concurrency"]
status: "completed"
featured: false
githubUrl: "https://github.com/alessandrocaliciotti"
---

## Il Problema

Gestire decine di server e nodi Linux distribuiti tra ambienti di sviluppo, produzione e homelab tramite connessioni SSH manuali è lento, prono ad errori e dispendioso. Strumenti complessi come Ansible richiedono runtime pesanti (Python, moduli complessi) e spesso risultano sovradimensionati per compiti rapidi di diagnostica, inventory e verifica dello stato dei nodi.

## La Soluzione: SRVMana in Go

**SRVMana** è una CLI compatta e portatile (un singolo binario compilato staticamente senza alcuna dipendenza esterna) pensata per sysadmin ed ingegneri di sistema:

### Funzionalità Chiave

1. **Esecuzione Parallela con Goroutine:** Esecuzione concorrente di comandi diagnostici e script su gruppi mirati di server con throttling configurabile e visualizzazione streaming dell'output.
2. **Autenticazione SSH Robusta:** Gestione nativa di chiavi crittografiche SSH (ed25519, RSA con passphrase), agent forwarding e jump host (bastion server).
3. **Hardware & OS Discovery:** Riconoscimento automatico della distribuzione host (RHEL, Rocky Linux, CentOS, Debian, Ubuntu), architettura CPU, memoria, dischi e interfacce di rete, con output strutturato in formato JSON o tabelle ASCII pulite.
4. **Resilienza ai Timeout:** Gestione intelligente dei nodi offline con graceful degradation e retry esponenziale.
