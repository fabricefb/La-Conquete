"""
Script de remplacement massif : evangile (rouge) → accent (bleu)
dans les fichiers .tsx et .ts du projet.

Règles :
- text-evangile-500 → text-accent-400 (bleu moyen clair)
- text-evangile-600 → text-accent-500 (bleu principal)
- border-evangile-600/20 → border-accent-400/20
- border-evangile-600/30 → border-accent-400/30
- border-evangile-600/40 → border-accent-400/40
- border-evangile-600/50 → border-accent-400/50
- bg-evangile-600/5 → bg-accent-400/5
- bg-evangile-600/10 → bg-accent-400/10
- bg-evangile-600/15 → bg-accent-400/15
- bg-evangile-600/20 → bg-accent-400/20
- bg-evangile-600/3 → bg-accent-400/3
- bg-evangile-600/8 → bg-accent-400/8
- group-hover:bg-evangile-600 → group-hover:bg-accent-500
- group-hover:text-evangile-500 → group-hover:text-accent-300
- group-hover:text-evangile-600 → group-hover:text-accent-400
- group-hover:border-evangile-600 → group-hover:border-accent-500
- hover:border-evangile-600/40 → hover:border-accent-400/40
- hover:text-evangile-500 → hover:text-accent-400
- hover:text-evangile-600 → hover:text-accent-500
- shadow-evangile-600 → shadow-accent-500
- from-evangile-500 → from-accent-500 (dans les gradients non-CTA)
- to-evangile-700 → to-accent-700

PRÉSERVE (ne pas remplacer) :
- bg-evangile-600 sans opacity → CTA buttons (rouge)
- .btn-primary, .btn-gold, .btn-ember → CTA (déjà dans index.css, pas touché)
- text-red-* → gardé tel quel
- border-red-500 → gardé tel quel
- Les fichiers admin/ → on les change aussi pour cohérence
"""

import os
import re
from pathlib import Path

SRC_DIR = Path("/home/z/my-project/src")

# Fichiers à EXCLURE du remplacement (config, types, index.css déjà traité)
EXCLUDE_FILES = {
    "index.css",  # déjà traité manuellement
}

# Remplacements ordonnés du plus spécifique au moins spécifique
REPLACEMENTS = [
    # --- Text colors ---
    ("text-evangile-600", "text-accent-500"),
    ("text-evangile-500", "text-accent-400"),
    ("text-evangile-400", "text-accent-300"),

    # --- Border colors with opacity ---
    ("border-evangile-600/50", "border-accent-400/50"),
    ("border-evangile-600/40", "border-accent-400/40"),
    ("border-evangile-600/30", "border-accent-400/30"),
    ("border-evangile-600/20", "border-accent-400/20"),
    ("border-evangile-600/10", "border-accent-400/10"),

    # --- Background colors with opacity (subtle) ---
    ("bg-evangile-600/20", "bg-accent-400/20"),
    ("bg-evangile-600/15", "bg-accent-400/15"),
    ("bg-evangile-600/10", "bg-accent-400/10"),
    ("bg-evangile-600/8", "bg-accent-400/8"),
    ("bg-evangile-600/5", "bg-accent-400/5"),
    ("bg-evangile-600/3", "bg-accent-400/3"),

    # --- Hover states ---
    ("group-hover:bg-evangile-600", "group-hover:bg-accent-500"),
    ("group-hover:text-evangile-600", "group-hover:text-accent-400"),
    ("group-hover:text-evangile-500", "group-hover:text-accent-300"),
    ("group-hover:border-evangile-600", "group-hover:border-accent-500"),
    ("hover:border-evangile-600/40", "hover:border-accent-400/40"),
    ("hover:border-evangile-600/50", "hover:border-accent-400/50"),
    ("hover:text-evangile-600", "hover:text-accent-500"),
    ("hover:text-evangile-500", "hover:text-accent-400"),
    ("hover:bg-evangile-600/10", "hover:bg-accent-400/10"),
    ("hover:bg-evangile-600/15", "hover:bg-accent-400/15"),

    # --- Shadows ---
    ("shadow-evangile-600", "shadow-accent-500"),
    ("shadow-evangile-500", "shadow-accent-400"),

    # --- Gradient from/to in non-CTA contexts ---
    ("from-evangile-500", "from-accent-500"),
    ("to-evangile-700", "to-accent-700"),
    ("from-evangile-600", "from-accent-600"),

    # --- ring-focus ---
    ("ring-evangile-600", "ring-accent-500"),
    ("ring-evangile-500", "ring-accent-400"),
]

# Regex patterns pour les remplacements qui nécessitent un contexte
# bg-evangile-600 SANS /opacity → on ne remplace PAS (ce sont les CTA)
# Mais on remplace certains contextes spécifiques

def should_skip_bg_evangile_full(line: str, match_start: int) -> bool:
    """Vérifie si bg-evangile-600 (sans opacity) est dans un contexte CTA."""
    # Vérifie s'il y a un / après bg-evangile-600
    after = line[match_start + len("bg-evangile-600"):match_start + len("bg-evangile-600") + 2]
    if after.startswith("/"):
        return False  # Il y a une opacity, on laisse les REPLACEMENTS gérer
    
    # bg-evangile-600 sans opacity — vérifier le contexte
    # On le remplace SEULEMENT si ce n'est pas un bouton CTA
    # Check if line contains btn-related patterns before this match
    before = line[:match_start]
    cta_contexts = [
        "btn-primary", "btn-gold", "btn-ember", "btn-accent",
        "cursor-pointer", "onClick", "type=\"submit\"",
        "bg-gradient-to-r from-evangile-500 to-evangile-700",
    ]
    for ctx in cta_contexts:
        if ctx in before:
            return True  # CTA context → keep red
    
    # Check if it's used as a solid bg for a CTA-like element
    # (badge, active tab, status indicator — keep red for alerts/danger)
    alert_contexts = ["danger", "error", "urgent", "red-", "bg-red"]
    for ctx in alert_contexts:
        if ctx in before or ctx in line[match_start:match_start + 50]:
            return True
    
    return False  # Not a CTA → safe to replace


def process_file(filepath: Path) -> tuple[int, list[str]]:
    """Traite un fichier et retourne (nombre de remplacements, détails)."""
    try:
        content = filepath.read_text(encoding="utf-8")
    except Exception as e:
        return 0, [f"  ERROR: {e}"]
    
    original = content
    changes = []
    total_replacements = 0
    
    for old, new in REPLACEMENTS:
        count = content.count(old)
        if count > 0:
            content = content.replace(old, new)
            total_replacements += count
            changes.append(f"  {old} → {new} ({count}x)")
    
    # Traitement spécial pour bg-evangile-600 sans opacity
    # Pattern: bg-evangile-600 suivi d'un espace, guillemet, ou fin de classe
    pattern = re.compile(r'bg-evangile-600(?![/\w])')
    
    def replace_bg_evangile(match):
        nonlocal total_replacements
        start = match.start()
        if should_skip_bg_evangile_full(content, start):
            return match.group(0)  # Keep as-is
        total_replacements += 1
        return "bg-accent-500"
    
    new_content = pattern.sub(replace_bg_evangile, content)
    if new_content != content:
        bg_count = len(pattern.findall(content)) - len(pattern.findall(new_content))
        if bg_count > 0:
            changes.append(f"  bg-evangile-600 → bg-accent-500 ({bg_count}x, non-CTA only)")
        content = new_content
    
    if content != original:
        filepath.write_text(content, encoding="utf-8")
        return total_replacements, changes
    
    return 0, []


def main():
    total_files = 0
    total_changes = 0
    
    # Collect all .tsx and .ts files
    files = []
    for ext in ("*.tsx", "*.ts"):
        files.extend(SRC_DIR.rglob(ext))
    
    # Sort for deterministic output
    files.sort()
    
    for filepath in files:
        if filepath.name in EXCLUDE_FILES:
            continue
        
        count, details = process_file(filepath)
        if count > 0:
            total_files += 1
            total_changes += count
            rel = filepath.relative_to(SRC_DIR)
            print(f"\n{rel} ({count} changes):")
            for d in details:
                print(d)
    
    print(f"\n{'='*60}")
    print(f"Total: {total_changes} remplacements dans {total_files} fichiers")


if __name__ == "__main__":
    main()