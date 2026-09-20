---
title: "Cluster Proxmox VE & Homelab Multi-Nodo ad Alte Prestazioni"
description: "Infrastruttura di virtualizzazione bare-metal con Proxmox VE, storage pool ZFS ridondati, GPU Passthrough NVIDIA, container LXC isolati e automazione sistemistica."
pubDate: 2026-09-19
technologies: ["Proxmox VE", "Linux Debian", "ZFS", "LXC", "NVIDIA GPU Passthrough", "WireGuard", "Bash"]
status: "active"
featured: true
githubUrl: "https://github.com/alessandrocaliciotti"
---

## Obiettivo dell'Infrastruttura

Costruire un'infrastruttura di virtualizzazione casalinga (Homelab) di livello professionale in grado di erogare 24/7 servizi critici (HEMS, EnergyLife, NVR di sicurezza, database temporali, LLM locali e ambienti di test) con massima efficienza energetica, ridondanza dei dati e isolamento di sicurezza.

## Componenti e Architettura

### 1. Multi-Nodo & Gestione delle Risorse
- Installazione multi-server Proxmox VE basata su Debian Linux.
- Suddivisione rigorosa tra container **LXC unprivileged** (per compiti leggeri come broker MQTT, reverse proxy Caddy/Nginx, server Node/Python) e **Virtual Machine KVM** dedicate a compiti pesanti o ambienti non-Linux.

### 2. GPU Passthrough & Accelerazione Hardware
- Configurazione avanzata di `vfio-pci` e IOMMU su schede grafiche NVIDIA dedicate.
- Passthrough diretto verso VM e container per inferenza AI locale, transcodifica video e virtualizzazione grafica avanzata (es. istanze Android remote ad alto framerate).

### 3. Storage & Disaster Recovery ZFS
- Pool ZFS su dischi enterprise con snapshot automatiche ad alta frequenza e scrubbing periodico per prevenire il silent data corruption (bit rot).
- Replication tra nodi e backup crittografati off-site su storage secondario.

### 4. Networking & Sicurezza
- Segmentazione tramite VLAN per isolare i dispositivi IoT insicuri dalla rete server e di gestione.
- Accesso remoto cifrato point-to-point tramite tunnel WireGuard e Cloudflare Zero Trust.
