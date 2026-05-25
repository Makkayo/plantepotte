"""
Final render: orientér riktig, vis dimensjoner og detaljer.
"""

import trimesh
import numpy as np
import matplotlib.pyplot as plt
from mpl_toolkits.mplot3d.art3d import Poly3DCollection
import os

PATH = r"C:\Users\marku\Desktop\AI\Plantepotte\3d-modell\Plantekassa.3mf"
OUT = r"C:\Users\marku\Desktop\AI\Plantepotte\3d-modell"

scene = trimesh.load(PATH, force='scene')

# Mappingstrategi: kategoriser per dimensjon
def classify(name, geom):
    d = np.round(geom.bounds[1] - geom.bounds[0], 1)
    dims_sorted = tuple(sorted(d, reverse=True))
    # IKEA box
    if 310 < d.max() < 320 and 110 < sorted(d)[1] < 115:
        return 'ikea', (0.55, 0.78, 0.92)
    # Stolpe — 200mm langsides, 22-23mm kort
    if 195 < d.max() < 205 and sorted(d)[1] < 25:
        return 'stolpe', (0.55, 0.55, 0.6)
    # Boks kortside — 100×125×235 (rundet)
    if abs(d.max() - 235) < 2 and 95 < sorted(d)[0] < 130 and 95 < sorted(d)[1] < 130:
        return 'boks_kortside', (0.72, 0.55, 0.4)
    # Boks langside (perforert) — 220×10×225
    if abs(d.max() - 225) < 2 and sorted(d)[0] < 12:
        return 'boks_langside', (0.6, 0.45, 0.32)
    # Tak/Gulv — 250×125×10
    if 245 < d.max() < 255 and sorted(d)[0] < 12:
        return 'gulv_tak', (0.5, 0.4, 0.3)
    # Endelokk på tank — 170×10×225
    if 165 < d.max() < 175 or (220 < d.max() < 230 and sorted(d)[0] < 12 and abs(sorted(d)[1] - 170) < 5):
        return 'endelokk', (0.4, 0.7, 0.4)
    # Lokk på tank — 235×39×100
    if 230 < d.max() < 240 and 95 < sorted(d)[1] < 105:
        return 'lokk', (0.45, 0.78, 0.5)
    # Tynne plater 50×39×225
    if abs(d.max() - 225) < 3 and sorted(d)[0] < 50 and sorted(d)[1] < 50:
        return 'lokk_alt', (0.5, 0.85, 0.55)
    # Klips
    if d.max() < 35 and sorted(d)[0] < 5:
        return 'klips', (0.3, 0.3, 0.3)
    return 'other', (0.7, 0.7, 0.7)

# Bygg ut classification dict
classifications = {}
for n, g in scene.geometry.items():
    cls, color = classify(n, g)
    classifications[n] = (cls, color)

print("Klassifisering:")
for n, (cls, _) in classifications.items():
    d = np.round(scene.geometry[n].bounds[1] - scene.geometry[n].bounds[0], 1)
    print(f"  {n}: {cls}  ({d[0]:.0f}×{d[1]:.0f}×{d[2]:.0f})")


def transformed(scene, name):
    g = scene.geometry[name].copy()
    try:
        nodes = scene.graph.geometry_nodes.get(name, [])
        if nodes:
            tf, _ = scene.graph.get(nodes[0])
            g.apply_transform(tf)
    except Exception:
        pass
    return g

# Modellen er orientert slik at i 3MF: X×Y×Z = 450×535×235
# Fra Fusion screenshot vet vi at høyden er 535mm = Y-aksen i 3MF
# La oss rotere så Y blir Z (vertikalt opp)
ROT_Y_TO_Z = trimesh.transformations.rotation_matrix(np.deg2rad(-90), [1, 0, 0])


def render(ax, azim, elev, title, only_cls=None, hide_cls=None, alpha=1.0):
    only_cls = set(only_cls) if only_cls else None
    hide_cls = set(hide_cls or [])
    all_v = []
    for n, g_orig in scene.geometry.items():
        cls, base = classifications[n]
        if only_cls and cls not in only_cls:
            continue
        if cls in hide_cls:
            continue
        g = transformed(scene, n)
        g.apply_transform(ROT_Y_TO_Z)
        all_v.append(g.vertices)

        normals = g.face_normals
        az_r = np.deg2rad(azim); el_r = np.deg2rad(elev)
        light = np.array([np.cos(el_r)*np.cos(az_r), np.cos(el_r)*np.sin(az_r), np.sin(el_r)])
        shade = np.clip(np.abs(normals @ light) * 0.7 + 0.3, 0, 1)

        tri = g.vertices[g.faces]
        col = np.tile(np.array(base), (len(g.faces), 1)) * shade[:, None]
        col = np.clip(col, 0, 1)
        rgba = np.column_stack([col, np.full(len(col), alpha)])
        coll = Poly3DCollection(tri, facecolors=rgba, edgecolors=(0, 0, 0, 0.18), linewidths=0.1)
        ax.add_collection3d(coll)

    if all_v:
        v = np.vstack(all_v)
        bb_min, bb_max = v.min(axis=0), v.max(axis=0)
        cx, cy, cz = (bb_min + bb_max) / 2
        mr = (bb_max - bb_min).max() / 2 * 1.05
        ax.set_xlim(cx - mr, cx + mr); ax.set_ylim(cy - mr, cy + mr); ax.set_zlim(cz - mr, cz + mr)
    ax.set_box_aspect([1, 1, 1])
    ax.view_init(elev=elev, azim=azim)
    ax.set_title(title, fontsize=12)
    ax.set_xlabel('X (bredde, mm)', fontsize=8)
    ax.set_ylabel('Y (dybde, mm)', fontsize=8)
    ax.set_zlabel('Z (høyde, mm)', fontsize=8)
    ax.tick_params(labelsize=7)


print("\nRenderer korrekt orientering...")
fig = plt.figure(figsize=(18, 13), facecolor='white')

ax = fig.add_subplot(2, 3, 1, projection='3d'); render(ax, 35, 20, "Komplett, isometrisk forfra")
ax = fig.add_subplot(2, 3, 2, projection='3d'); render(ax, -145, 20, "Isometrisk bakfra")
ax = fig.add_subplot(2, 3, 3, projection='3d'); render(ax, 0, 5, "Front")
ax = fig.add_subplot(2, 3, 4, projection='3d'); render(ax, 90, 5, "Side")
ax = fig.add_subplot(2, 3, 5, projection='3d'); render(ax, 35, 20, "Uten tak og stolper (ser ned i base)",
                                                         hide_cls=['stolpe', 'gulv_tak'])
ax = fig.add_subplot(2, 3, 6, projection='3d'); render(ax, 35, 20, "Halvtransparent — ser IKEA-tank inni",
                                                         alpha=0.35)
plt.tight_layout()
out = os.path.join(OUT, "render-final.png")
plt.savefig(out, dpi=140, bbox_inches='tight', facecolor='white')
plt.close()
print(f"  -> {out}")

# Zoom på topp og bunn for å se detaljer
print("Renderer detalj-zoom...")
fig = plt.figure(figsize=(18, 10), facecolor='white')
ax = fig.add_subplot(1, 3, 1, projection='3d'); render(ax, 90, 60, "Sett ovenfra (skrå) - topplate med utskj.",
                                                         only_cls=['gulv_tak', 'stolpe'])
ax = fig.add_subplot(1, 3, 2, projection='3d'); render(ax, 35, -30, "Sett nedenfra - bunnplate",
                                                         only_cls=['gulv_tak'])
ax = fig.add_subplot(1, 3, 3, projection='3d'); render(ax, 35, 20, "Bare tank-lokket (heksagonale hull)",
                                                         only_cls=['lokk', 'lokk_alt'])
plt.tight_layout()
out2 = os.path.join(OUT, "render-detaljer.png")
plt.savefig(out2, dpi=140, bbox_inches='tight', facecolor='white')
plt.close()
print(f"  -> {out2}")

# Tabell over hver del og print-status
print("\n=== DELER OG PRINTBARHET (Bambu P2S = 256×256×256 mm) ===\n")
print(f"{'Komponent':<25} {'Antall':<7} {'Dimensjoner (mm)':<25} {'Print P2S':<20}")
print("-" * 80)

groups = {}
for n, (cls, _) in classifications.items():
    d = tuple(np.round(scene.geometry[n].bounds[1] - scene.geometry[n].bounds[0], 1))
    key = (cls, d)
    groups.setdefault(key, []).append(n)

CLS_NAMES = {
    'ikea': 'IKEA 365+ (referanse)',
    'stolpe': 'Stolpe',
    'boks_kortside': 'Boks kortside',
    'boks_langside': 'Boks langside',
    'gulv_tak': 'Gulv / Tak',
    'endelokk': 'Endelokk på tank',
    'lokk': 'Lokk på tank',
    'lokk_alt': 'Lokk på tank (alt)',
    'klips': 'Klips',
    'other': '?',
}
for (cls, d), members in groups.items():
    name = CLS_NAMES.get(cls, cls)
    dims_str = f"{d[0]:.0f} × {d[1]:.0f} × {d[2]:.0f}"
    if cls == 'ikea':
        printable = 'PRINTES IKKE'
    else:
        # Sjekk om hver akse passer
        fits = all(x <= 256 for x in d)
        if fits:
            printable = 'OK'
        else:
            over = max(d) - 256
            printable = f'FOR STORT (+{over:.0f} mm)'
    print(f"{name:<25} {len(members):<7} {dims_str:<25} {printable:<20}")

# Total høyde info
print("\n=== HØYDE-ANALYSE ===")
ikea_h = 100  # IKEA 365+ 5.2L er 100mm høy
base_h = 235  # base height (kort akse på tanken er 213, men base er 235)
stolpe_h = 200
tak_thick = 10
total_planning_h = base_h + stolpe_h + tak_thick
print(f"Base (rundt IKEA-tank): ~{base_h} mm")
print(f"Stolpe-høyde: {stolpe_h} mm — dette er plassen for plantene + plassen mellom plante og lys")
print(f"Tak-tykkelse: {tak_thick} mm")
print(f"Total høyde fra benk til topp: ~{total_planning_h} mm = {total_planning_h/10:.1f} cm")
print()
print("Plante-plass under taket: 200mm = 20cm")
print("  Vurdering per plantetype:")
print("    Babyleaf / salat (15cm): ✓ OK")
print("    Standard urter / basilikum (~25cm voksen): ❌ vokser inn i taket")
print("    Cherry-tomat «Tiny Tim» (30cm): ❌ for høy")
print("    Mikrogrønt (5-10cm): ✓ MASSE plass")
