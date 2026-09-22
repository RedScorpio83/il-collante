---
title: "CancelloAutomatico Dual-MCU: Automazione Elettromeccanica con Arduino, ESP32 e Visione AI"
description: "Centralina su misura per cancelli a due ante battenti: architettura Dual-MCU (Arduino Nano + ESP32), ponti H BTS7960 con rilevamento di sforzo ADC, web UI dark in tempo reale e visione artificiale Frigate."
pubDate: 2026-07-15
technologies: ["Arduino Nano", "ESP32", "C++", "BTS7960", "ESPHome", "Frigate NVR", "MQTT", "Hardware KiCad PCB", "Optoisolatori", "Home Assistant"]
status: "completed"
featured: true
githubUrl: "https://github.com/RedScorpio83"
---

![Schema di Cablaggio Elettrico Completo Dual-MCU](/images/projects/cancello/schematic_diagram.png)

## Il Problema: Le Centraline Commerciali Sono Scatole Nere

Le schede elettroniche per cancelli automatici vendute dai grandi marchi soffrono di gravi limiti:
1. **Scarsa flessibilità:** Rallentamenti a scatti, parametri di sforzo rigidi e assenza di telemetria reale sulle correnti assorbite dai motori.
2. **Dipendenza da telecomandi fisici obsoleti:** I telecomandi a 433 MHz hanno portata incostante, batterie che si esauriscono e non danno alcun feedback sullo stato fisico delle ante (aperto, chiuso, socchiuso o bloccato da un ramo o dalla neve).
3. **App cloud lente e insicure:** I moduli Wi-Fi aftermarket spesso transitano da server esteri con latenze inaccettabili e nessun rispetto per la sicurezza perimetrale.

---

## L'Architettura Hardware: Perché Due Microcontrollori (Dual-MCU)?

La gestione di un cancello carrabile pesante a due ante battenti richiede sia **reattività deterministica hard real-time** (per arrestare un motore da 24V 50W entro pochi millisecondi se rileva un ostacolo), sia **connettività di rete ad alto livello** (Web Server, protocollo MQTT, streaming telecamere).

Per questo abbiamo adottato un'architettura **Dual-MCU disaccoppiata**:

```text
┌────────────────────────────────────────────────────────┐
│                      ESP32 (3.3V)                      │
│   • Web Server v3.0 Glassmorphism Dark (WebSockets)   │
│   • Broker MQTT & Integrazione Telecamere Frigate AI   │
│   • Relè Ausiliari (Garage, Cancelletto Pedonale)      │
└───────────────────────────▲────────────────────────────┘
                            │ Level Shifter LLC (3.3V ◄► 5.0V)
                            │ SoftwareSerial Bidirezionale (19200 baud)
┌───────────────────────────▼────────────────────────────┐
│                   ARDUINO NANO (5.0V)                  │
│   • Hard Real-Time Motor Control Loop (Zero Lag)       │
│   • 2x Driver Ponte H BTS7960 (PWM Soft Start/Stop)   │
│   • Current Sensing ADC (A1/A2): Anticalpestio Continuo│
│   • Fotocellule Fisiche NC & Relè Eco-Mode            │
│   • Ricevitore Radio RF Hardware                       │
└────────────────────────────────────────────────────────┘
```

1. **Arduino Nano (5V Logic):** Dedicato esclusivamente al ferro. Esegue il loop di controllo motori a frequenza fissa, genera le rampe di accelerazione PWM per i driver BTS7960 e legge continuamente la corrente assorbita su pin analogici `A1` e `A2`. Se si verifica un picco di sforzo o si interrompe il fascio infrarosso, arresta l'alimentazione in **meno di 2 millisecondi**, senza dipendere dallo stato del Wi-Fi o del sistema operativo di rete.
2. **ESP32 (3.3V Logic):** Gestisce lo stack di rete, la Web UI reattiva, l'interfacciamento con Home Assistant e il ponte seriale bidirezionale isolato con convertitore di livello logico (LLC).
3. **Distribuzione dell'Alimentazione:** Linea primaria a **24V DC** con alimentatore industriale stabilizzato da 240W per i motori a battente, affiancata da un convertitore step-down **LM2596 calibrato a 5.0V continui** con bus di massa comune equipotenziale.

---

![Scheda Madre GateMaster e PCB](/images/projects/cancello/esp32_board_original.png)

## Snippet di Codice: Rampa PWM e Rilevamento Sforzo (Anticalpestio)

Questo estratto dal firmware `cancello_nano.ino` mostra come l'Arduino Nano modula la velocità in apertura e chiusura monitorando la corrente analogica in tempo reale per arrestare immediatamente le ante in caso di ostacolo:

```cpp
// Gestione della corrente analogica e anticalpestio (cancello_nano.ino)
void check_current_safety() {
  int raw_m1 = analogRead(PIN_M1_CURRENT);
  int raw_m2 = analogRead(PIN_M2_CURRENT);

  // Applicazione dei moltiplicatori di sensibilità calibrati per anta
  int effort_m1 = (raw_m1 * m1_multiplier) / 100;
  int effort_m2 = (raw_m2 * m2_multiplier) / 100;

  // Se l'assorbimento supera la soglia di sicurezza durante il moto
  if (effort_m1 > force_limit || effort_m2 > force_limit) {
    emergency_stop_obstacle();
    // Notifica immediata al supervisore ESP32 via seriale
    espSerial.println("EVT:OBSTACLE_CURRENT");
  }
}

// Rampa di accelerazione Soft Start
void ramp_up_motors(int target_speed, unsigned long duration_ms) {
  unsigned long start = millis();
  while (millis() - start < duration_ms) {
    float progress = (float)(millis() - start) / (float)duration_ms;
    int current_pwm = (int)(progress * target_speed);
    
    analogWrite(PIN_M1_OPEN, current_pwm);
    analogWrite(PIN_M2_OPEN, current_pwm);
    
    check_current_safety(); // Monitoraggio attivo anche durante la rampa
    delay(10);
  }
}
```

---

![Quadro Elettrico e Cablaggio sul Campo](/images/projects/cancello/physical_wiring_1.jpg)

## Funzionalità della Web UI v3.0 & Integrazione Visione AI

* **Sinottico Dinamico delle Ante (0° &rarr; 90°):** Rendering in tempo reale delle ante animate con stile glassmorphism scuro che riflette la percentuale di apertura e lo stato dei finecorsa.
* **Oscilloscopio Correnti Real-Time:** Grafico delle correnti assorbite dai due motori con auto-scaling per diagnosticare usura meccanica dei cardini, attriti da ghiaia o vento contrario.
* **Integrazione Frigate AI:** La centralina riceve via MQTT gli eventi di rilevamento persona e veicolo. Quando una telecamera perimetrale riconosce l'auto autorizzata in avvicinamento, la centralina predispone l'apertura automatica.
* **Frequenza Snapshot Adattiva:** La telecamera integrata nella UI campiona a 1 fotogramma ogni 10 secondi a cancello fermo, salendo automaticamente a **1 fotogramma al secondo (1 fps)** durante la manovra per il monitoraggio fluido del varco.
* **Eco-Mode Fotocellule:** Un relè ausiliario disalimenta i trasmettitori IR delle fotocellule quando il cancello è chiuso e inattivo da più di 5 minuti, azzerando i consumi parassiti a riposo.
