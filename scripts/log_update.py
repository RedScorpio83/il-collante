#!/usr/bin/env python3
"""
Script per aggiungere rapidamente un log di avanzamento a un progetto nel portfolio
Uso:
  python scripts/log_update.py --project hems-bi-inverter --title "Aggiunta lettura inverter via Modbus TCP" --desc "Risolto bug di timeout sui registri di potenza."
"""

import os
import sys
import argparse
from datetime import datetime

PROJECTS_DIR = os.path.join(os.path.dirname(__file__), "..", "src", "content", "projects")

def add_log_to_project(slug, title, description, new_tech=None):
    file_path = os.path.join(PROJECTS_DIR, f"{slug}.md")
    if not os.path.exists(file_path):
        print(f"Errore: il progetto {slug} non esiste in {PROJECTS_DIR}")
        return False

    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    today_str = datetime.now().strftime("%d/%m/%Y")
    entry = f"\n- **[{today_str}] {title}**: {description}\n"

    # Se c'è già una sezione "## Diario di Bordo / Changelog", appendi lì, altrimenti creala
    if "## Changelog / Diario di Bordo" in content:
        content = content.replace("## Changelog / Diario di Bordo", f"## Changelog / Diario di Bordo\n{entry}")
    elif "## Diario di Bordo" in content:
        content = content.replace("## Diario di Bordo", f"## Diario di Bordo\n{entry}")
    else:
        content += f"\n\n## Changelog / Diario di Bordo\n{entry}"

    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)

    print(f"Progetto {slug} aggiornato con successo!")
    return True

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Aggiunge un aggiornamento a una scheda di progetto.")
    parser.add_argument("--project", required=True, help="Slug del progetto (es. hems-bi-inverter)")
    parser.add_argument("--title", required=True, help="Titolo dell'aggiornamento")
    parser.add_argument("--desc", required=True, help="Descrizione di quanto fatto")
    args = parser.parse_args()

    add_log_to_project(args.project, args.title, args.desc)
