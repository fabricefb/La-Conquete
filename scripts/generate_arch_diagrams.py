#!/usr/bin/env python3
"""Generate architecture diagrams for Church ERP document."""
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch
import numpy as np

# Font setup
fm = matplotlib.font_manager
fm.fontManager.addfont('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf')
fm.fontManager.addfont('/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf')

plt.rcParams['font.sans-serif'] = ['Liberation Sans', 'DejaVu Sans']
plt.rcParams['axes.unicode_minus'] = False

OUTPUT = '/home/z/my-project/download/'

# Colors
DARK_BG = '#0F172A'
CARD_BG = '#1E293B'
ACCENT = '#38BDF8'
GOLD = '#F59E0B'
EMERALD = '#10B981'
ROSE = '#F43F5E'
PURPLE = '#A78BFA'
WHITE = '#F8FAFC'
GRAY = '#94A3B8'
LIGHT_BG = '#F1F5F9'

# ============================================================
# DIAGRAM 1: Role Hierarchy
# ============================================================
def draw_role_hierarchy():
    fig, ax = plt.subplots(1, 1, figsize=(12, 7), facecolor=LIGHT_BG)
    ax.set_facecolor(LIGHT_BG)
    ax.set_xlim(0, 12)
    ax.set_ylim(0, 7)
    ax.axis('off')

    roles = [
        (6, 6.0, 'Super-Admin', '#7C3AED', 3.2, 0.7),
        (6, 4.8, 'Pasteur', '#2563EB', 2.8, 0.65),
        (3.5, 3.5, 'Chef de\nDepartement', '#0891B2', 2.6, 0.9),
        (8.5, 3.5, 'Chef de\nDepartement', '#0891B2', 2.6, 0.9),
        (3.5, 2.2, 'Serviteur', '#059669', 2.2, 0.6),
        (8.5, 2.2, 'Serviteur', '#059669', 2.2, 0.6),
        (6, 1.0, 'Membre', '#D97706', 2.2, 0.6),
        (6, -0.2, 'Visiteur', '#64748B', 2.0, 0.55),
    ]

    for (x, y, label, color, w, h) in roles:
        box = FancyBboxPatch((x - w/2, y - h/2), w, h,
                             boxstyle="round,pad=0.1", facecolor=color,
                             edgecolor='white', linewidth=2, alpha=0.9)
        ax.add_patch(box)
        ax.text(x, y, label, ha='center', va='center',
                fontsize=11, fontweight='bold', color='white',
                fontfamily='Liberation Sans')

    # Arrows
    arrows = [
        (6, 5.65, 6, 5.13),
        (6, 4.47, 3.5, 3.95),
        (6, 4.47, 8.5, 3.95),
        (3.5, 3.05, 3.5, 2.5),
        (8.5, 3.05, 8.5, 2.5),
        (3.5, 1.9, 6, 1.3),
        (8.5, 1.9, 6, 1.3),
        (6, 0.7, 6, 0.08),
    ]
    for (x1, y1, x2, y2) in arrows:
        ax.annotate('', xy=(x2, y2), xytext=(x1, y1),
                    arrowprops=dict(arrowstyle='->', color=GRAY, lw=2))

    # Validation labels
    ax.text(1.0, 4.6, 'Validation\nSuper-Admin', ha='center', va='center',
            fontsize=8, color=ROSE, fontstyle='italic', fontweight='bold')
    ax.text(11.0, 4.6, 'Validation\nSuper-Admin', ha='center', va='center',
            fontsize=8, color=ROSE, fontstyle='italic', fontweight='bold')

    # Auto-promotion
    ax.text(11.0, 1.0, 'Auto ou\nValidation', ha='center', va='center',
            fontsize=8, color=EMERALD, fontstyle='italic', fontweight='bold')

    ax.set_title('Hierarchie des Roles — Church ERP La Conquete',
                 fontsize=16, fontweight='bold', color=DARK_BG, pad=20,
                 fontfamily='Liberation Sans')

    plt.tight_layout()
    plt.savefig(OUTPUT + 'diag_roles_hierarchy.png', dpi=200, bbox_inches='tight',
                facecolor=LIGHT_BG)
    plt.close()
    print("OK: diag_roles_hierarchy.png")


# ============================================================
# DIAGRAM 2: Registration Flow
# ============================================================
def draw_registration_flow():
    fig, ax = plt.subplots(1, 1, figsize=(14, 8), facecolor=LIGHT_BG)
    ax.set_facecolor(LIGHT_BG)
    ax.set_xlim(0, 14)
    ax.set_ylim(0, 8)
    ax.axis('off')

    steps = [
        (2.5, 6.5, 'Etape 1\nInscription\n(Email + MDP)', '#7C3AED'),
        (6.0, 6.5, 'Etape 2\nProfil de base\n(Nom, Tel)', '#2563EB'),
        (9.5, 6.5, 'Etape 3\nInterets\n(Departements)', '#0891B2'),
        (2.5, 3.5, 'Visiteur\n(role par defaut)', '#64748B'),
        (6.0, 3.5, 'Demande\nMembre\n(auto ou manuelle)', '#D97706'),
        (9.5, 3.5, 'Demande\nServiteur\n+ Dept + Poste', '#059669'),
        (6.0, 1.0, 'File d\'approbation\nSuper-Admin', '#DC2626'),
    ]

    for (x, y, label, color) in steps:
        if 'File' in label:
            box = FancyBboxPatch((x - 2.0, y - 0.45), 4.0, 0.9,
                                 boxstyle="round,pad=0.12", facecolor=color,
                                 edgecolor='white', linewidth=2, alpha=0.9)
        else:
            box = FancyBboxPatch((x - 1.5, y - 0.55), 3.0, 1.1,
                                 boxstyle="round,pad=0.12", facecolor=color,
                                 edgecolor='white', linewidth=2, alpha=0.9)
        ax.add_patch(box)
        ax.text(x, y, label, ha='center', va='center',
                fontsize=9, fontweight='bold', color='white',
                fontfamily='Liberation Sans', linespacing=1.3)

    # Top flow arrows
    for i in range(2):
        x1 = steps[i][0] + 1.5
        x2 = steps[i+1][0] - 1.5
        ax.annotate('', xy=(x2, 6.5), xytext=(x1, 6.5),
                    arrowprops=dict(arrowstyle='->', color=GRAY, lw=2.5))

    # Down arrows from steps to roles
    down_arrows = [(2.5, 5.95, 2.5, 4.05), (6.0, 5.95, 6.0, 4.05), (9.5, 5.95, 9.5, 4.05)]
    for (x1, y1, x2, y2) in down_arrows:
        ax.annotate('', xy=(x2, y2), xytext=(x1, y1),
                    arrowprops=dict(arrowstyle='->', color=GRAY, lw=2))

    # Arrows to approval queue
    ax.annotate('', xy=(4.0, 1.45), xytext=(2.5, 2.95),
                arrowprops=dict(arrowstyle='->', color=ROSE, lw=2, linestyle='dashed'))
    ax.annotate('', xy=(6.0, 1.45), xytext=(6.0, 2.95),
                arrowprops=dict(arrowstyle='->', color=ROSE, lw=2, linestyle='dashed'))
    ax.annotate('', xy=(8.0, 1.45), xytext=(9.5, 2.95),
                arrowprops=dict(arrowstyle='->', color=ROSE, lw=2, linestyle='dashed'))

    # Labels
    ax.text(0.5, 4.0, 'Automatique\n(trigger)', ha='center', va='center',
            fontsize=8, color=EMERALD, fontstyle='italic')
    ax.text(13.5, 4.0, 'Validation\nrequise', ha='center', va='center',
            fontsize=8, color=ROSE, fontstyle='italic', fontweight='bold')

    ax.set_title('Flux d\'Inscription Progressif — Church ERP',
                 fontsize=16, fontweight='bold', color=DARK_BG, pad=20,
                 fontfamily='Liberation Sans')

    plt.tight_layout()
    plt.savefig(OUTPUT + 'diag_registration_flow.png', dpi=200, bbox_inches='tight',
                facecolor=LIGHT_BG)
    plt.close()
    print("OK: diag_registration_flow.png")


# ============================================================
# DIAGRAM 3: Data Model ER (Simplified)
# ============================================================
def draw_data_model():
    fig, ax = plt.subplots(1, 1, figsize=(14, 10), facecolor=LIGHT_BG)
    ax.set_facecolor(LIGHT_BG)
    ax.set_xlim(0, 14)
    ax.set_ylim(0, 10)
    ax.axis('off')

    tables = [
        # (x, y, w, h, title, fields, color)
        (7, 9.0, 3.5, 1.5, 'user_profiles',
         ['id (PK)', 'email, full_name', 'role (ENUM)', 'phone, gender, birth_date'],
         '#7C3AED'),
        (2, 6.5, 3.2, 1.4, 'departments',
         ['id (PK)', 'name, slug', 'icon_name, accent_color'],
         '#2563EB'),
        (7, 6.5, 3.2, 1.2, 'positions',
         ['id (PK)', 'department_id (FK)', 'name, description'],
         '#0891B2'),
        (12, 7.5, 3.2, 1.4, 'department_members',
         ['user_id (FK)', 'department_id (FK)', 'position_id (FK)'],
         '#059669'),
        (2, 4.0, 3.2, 1.2, 'role_requests',
         ['user_id (FK)', 'requested_role', 'status, reviewed_by'],
         '#DC2626'),
        (7, 4.0, 3.2, 1.2, 'prayer_requests',
         ['user_id (FK)', 'content', 'is_anonymous, status'],
         '#D97706'),
        (12, 4.0, 3.2, 1.4, 'daily_thoughts',
         ['author_id (FK)', 'verse_reference', 'verse_text, reflection'],
         '#7C3AED'),
        (2, 1.5, 3.5, 1.2, 'service_plannings',
         ['department_id (FK)', 'service_date', 'service_type, notes'],
         '#0891B2'),
        (7, 1.5, 3.5, 1.4, 'service_assignments',
         ['planning_id (FK)', 'user_id (FK)', 'position_id, status'],
         '#059669'),
        (12, 1.5, 3.2, 1.2, 'department_posts',
         ['author_id (FK)', 'department_id (FK)', 'content, post_type'],
         '#2563EB'),
        (5.0, 0.0, 3.5, 0.9, 'visitor_followups',
         ['visitor_id (FK)', 'assigned_to (FK)', 'status, notes'],
         '#D97706'),
    ]

    for (x, y, w, h, title, fields, color) in tables:
        # Table header
        header = FancyBboxPatch((x - w/2, y - 0.05), w, 0.4,
                                boxstyle="round,pad=0.05", facecolor=color,
                                edgecolor='white', linewidth=1.5)
        ax.add_patch(header)
        ax.text(x, y + 0.15, title, ha='center', va='center',
                fontsize=9, fontweight='bold', color='white',
                fontfamily='Liberation Sans')

        # Table body
        body = FancyBboxPatch((x - w/2, y - h + 0.35), w, h - 0.4,
                              boxstyle="round,pad=0.05", facecolor='white',
                              edgecolor=color, linewidth=1.2, alpha=0.95)
        ax.add_patch(body)
        for i, field in enumerate(fields):
            fy = y + 0.1 - (i + 1) * 0.25
            ax.text(x, fy, field, ha='center', va='center',
                    fontsize=7.5, color='#334155', fontfamily='Liberation Sans')

    # Relations (simplified arrows)
    relations = [
        (7, 8.25, 12, 8.15, GRAY),      # profiles → dept_members
        (7, 8.25, 3.5, 7.15, GRAY),      # profiles → departments
        (7, 8.25, 7, 7.1, GRAY),        # profiles → positions (indirect)
        (3.6, 6.5, 5.4, 6.5, '#94A3B8'), # departments → positions
        (7, 8.25, 2, 5.15, GRAY),       # profiles → role_requests
        (7, 8.25, 7, 5.15, GRAY),       # profiles → prayer_requests
        (7, 8.25, 12, 5.15, GRAY),      # profiles → daily_thoughts
        (3.6, 6.5, 2, 2.7, '#94A3B8'),  # departments → service_plannings
        (3.6, 4.0, 5.25, 2.15, '#94A3B8'), # role_requests → service_assignments (indirect)
    ]

    for (x1, y1, x2, y2, color) in relations:
        ax.annotate('', xy=(x2, y2), xytext=(x1, y1),
                    arrowprops=dict(arrowstyle='->', color=color, lw=1.2,
                                    connectionstyle="arc3,rad=0.05"))

    ax.set_title('Modele de Donnes — Schema ERP (12 Tables)',
                 fontsize=16, fontweight='bold', color=DARK_BG, pad=20,
                 fontfamily='Liberation Sans')

    plt.tight_layout()
    plt.savefig(OUTPUT + 'diag_data_model.png', dpi=200, bbox_inches='tight',
                facecolor=LIGHT_BG)
    plt.close()
    print("OK: diag_data_model.png")


# ============================================================
# DIAGRAM 4: Dashboard per Role
# ============================================================
def draw_dashboards():
    fig, axes = plt.subplots(1, 3, figsize=(15, 7), facecolor=LIGHT_BG)

    dashboards = [
        ('Tableau de Bord\nPasteur (Berger)', '#7C3AED', [
            'Flux Requetes de Priere',
            'Bouton "J\'ai prie pour cela"',
            'Generateur Pensée du Jour',
            'Indicateur Sante de l\'Eglise',
            'Suivi Visiteurs',
            'Validation Demandes de Rôle'
        ]),
        ('Tableau de Bord\nChef de Dept (Manager)', '#0891B2', [
            'Communiqués de Department',
            'Planning des Services',
            'Rotations / Calendrier',
            'Gestion Equipe',
            'Accepter / Refuser Services',
            'Fil Actualité Department'
        ]),
        ('Espace Communauté\nServiteurs & Membres', '#059669', [
            'Fil d\'Actualité du Dept',
            'Mon Agenda de Service',
            'Demande de Prière',
            'Pensée du Jour',
            'Annuaire des Membres',
            'Mes Preferences'
        ]),
    ]

    for idx, (title, color, items) in enumerate(dashboards):
        ax = axes[idx]
        ax.set_facecolor('white')
        ax.set_xlim(0, 10)
        ax.set_ylim(0, 10)
        ax.axis('off')

        # Header bar
        header = FancyBboxPatch((0.3, 8.5), 9.4, 1.2,
                                boxstyle="round,pad=0.15", facecolor=color,
                                edgecolor='none', alpha=0.9)
        ax.add_patch(header)
        ax.text(5, 9.1, title, ha='center', va='center',
                fontsize=11, fontweight='bold', color='white',
                fontfamily='Liberation Sans', linespacing=1.3)

        # Items
        for i, item in enumerate(items):
            y = 7.5 - i * 1.1
            box = FancyBboxPatch((0.5, y - 0.35), 9.0, 0.7,
                                 boxstyle="round,pad=0.1", facecolor=LIGHT_BG,
                                 edgecolor=color, linewidth=1.5, alpha=0.8)
            ax.add_patch(box)
            # Bullet
            circle = plt.Circle((1.2, y), 0.12, color=color, alpha=0.8)
            ax.add_patch(circle)
            ax.text(1.8, y, item, ha='left', va='center',
                    fontsize=9.5, color='#334155', fontfamily='Liberation Sans')

    fig.suptitle('Tableaux de Bord Differenties par Rôle',
                 fontsize=16, fontweight='bold', color=DARK_BG, y=0.98,
                 fontfamily='Liberation Sans')

    plt.tight_layout(rect=[0, 0, 1, 0.95])
    plt.savefig(OUTPUT + 'diag_dashboards.png', dpi=200, bbox_inches='tight',
                facecolor=LIGHT_BG)
    plt.close()
    print("OK: diag_dashboards.png")


# ============================================================
# DIAGRAM 5: RLS Security Matrix
# ============================================================
def draw_rls_matrix():
    fig, ax = plt.subplots(1, 1, figsize=(14, 8), facecolor='white')
    ax.set_facecolor('white')

    tables = ['user_profiles', 'departments', 'positions', 'dept_members',
              'role_requests', 'prayer_requests', 'daily_thoughts',
              'service_plannings', 'service_assignments', 'dept_posts',
              'post_comments', 'visitor_followups']

    roles = ['Visiteur', 'Membre', 'Serviteur', 'Chef', 'Pasteur', 'Super-Admin']

    # Access matrix: 0=none, 1=read own, 2=read dept, 3=read all, 4=write
    matrix = np.array([
        # VP  MB  SV  CH  PS  SA
        [1,  1,  2,  2,  3,  4],  # user_profiles
        [3,  3,  3,  3,  3,  4],  # departments (public read)
        [3,  3,  3,  3,  3,  4],  # positions (public read)
        [0,  1,  2,  3,  3,  4],  # dept_members
        [1,  1,  1,  1,  1,  4],  # role_requests
        [1,  1,  1,  2,  3,  4],  # prayer_requests
        [0,  0,  0,  0,  3,  3],  # daily_thoughts (published only for lower)
        [0,  2,  2,  3,  3,  4],  # service_plannings
        [0,  1,  1,  3,  3,  4],  # service_assignments
        [0,  1,  2,  3,  3,  4],  # dept_posts
        [0,  1,  2,  3,  3,  3],  # post_comments
        [0,  0,  0,  0,  3,  4],  # visitor_followups
    ])

    colors_map = {
        0: '#FEE2E2',  # none - light red
        1: '#FEF3C7',  # own - light yellow
        2: '#DBEAFE',  # dept - light blue
        3: '#D1FAE5',  # all read - light green
        4: '#E0E7FF',  # write - light purple
    }

    cell_text = {
        0: '—',
        1: 'Own',
        2: 'Dept',
        3: 'Read',
        4: 'RW',
    }

    data = []
    colors = []
    for i, table in enumerate(tables):
        row_data = []
        row_colors = []
        for j in range(len(roles)):
            val = matrix[i][j]
            row_data.append(cell_text[val])
            row_colors.append(colors_map[val])
        data.append(row_data)
        colors.append(row_colors)

    table = ax.table(cellText=data, rowLabels=tables, colLabels=roles,
                     cellColours=colors, loc='center', cellLoc='center')

    table.auto_set_font_size(False)
    table.set_fontsize(9)
    table.scale(1.0, 1.6)

    # Style headers
    for (row, col), cell in table.get_celld().items():
        if row == 0:
            cell.set_text_props(fontweight='bold', color='white', fontsize=9)
            cell.set_facecolor('#1E293B')
        if col == -1:
            cell.set_text_props(fontweight='bold', color='#334155', fontsize=8.5)
            cell.set_facecolor('#F8FAFC')
        cell.set_edgecolor('#E2E8F0')

    ax.set_title('Matrice de Securite RLS — Droits d\'Acces par Role et Table',
                 fontsize=14, fontweight='bold', color=DARK_BG, pad=30,
                 fontfamily='Liberation Sans')

    # Legend
    legend_items = [
        mpatches.Patch(color='#FEE2E2', label='Aucun acces'),
        mpatches.Patch(color='#FEF3C7', label='Lecture propres donnees'),
        mpatches.Patch(color='#DBEAFE', label='Lecture departement'),
        mpatches.Patch(color='#D1FAE5', label='Lecture globale'),
        mpatches.Patch(color='#E0E7FF', label='Lecture + Ecriture'),
    ]
    ax.legend(handles=legend_items, loc='lower center', ncol=5,
              fontsize=8, frameon=True, facecolor='white', edgecolor='#E2E8F0',
              bbox_to_anchor=(0.5, -0.08))

    ax.axis('off')
    plt.tight_layout()
    plt.savefig(OUTPUT + 'diag_rls_matrix.png', dpi=200, bbox_inches='tight',
                facecolor='white')
    plt.close()
    print("OK: diag_rls_matrix.png")


if __name__ == '__main__':
    draw_role_hierarchy()
    draw_registration_flow()
    draw_data_model()
    draw_dashboards()
    draw_rls_matrix()
    print("\nAll diagrams generated successfully!")