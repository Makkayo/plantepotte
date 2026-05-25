"""
Detaljert analyse med faktiske komponentnavn fra Fusion.
"""

import trimesh
import numpy as np
import matplotlib.pyplot as plt
from mpl_toolkits.mplot3d.art3d import Poly3DCollection
import os
import zipfile
import re

PATH = r"C:\Users\marku\Desktop\AI\Plantepotte\3d-modell\Plantekassa.3mf"
OUT = r"C:\Users\marku\Desktop\AI\Plantepotte\3d-modell"

# Trekk ut komponentnavn fra 3MF (XML inni ZIP)
print("Ekstraherer komponentnavn fra 3MF...")
names_in_xml = []
with zipfile.ZipFile(PATH, 'r') as z:
    for n in z.namelist():
        if n.endswith('.model') or 'model' in n.lower():
            with z.open(n) as f:
                content = f.read().decode('utf-8', errors='ignore')
                # Finn både <object name="..." og <item ... name="..."
                matches = re.findall(r'(?:object|item|component)[^>]+name="([^"]+)"', content)
                names_in_xml.extend(matches)

print(f"Funnet {len(names_in_xml)} navn i XML:")
for n in names_in_xml:
    print(f"  - {n}")


scene = trimesh.load(PATH, force='scene')

# Manuell mapping basert på bbox-størrelse + brukerens komponentnavn fra Fusion
# (Den faktiske mappingen kommer fra brukerens browser-screenshot)
FUSION_NAMES = {
    # bbox_dims (rundet til 1 desimal): "navn"
    (313.0, 112.0, 213.0): "IKEA 365+ 5.2L (referanse)",
    (100.0, 125.0, 235.0): "Boks kortside (rundet)",
    (220.1, 9.9, 225.2): "Boks langside (perforert)",
    (250.0, 125.0, 10.0): "Gulv / Tak",
    (170.0, 10.0, 225.0): "Endelokk på tank",
    (235.0, 39.3, 100.0): "Lokk på tank",
    (50.0, 39.3, 225.0): "Lokk på tank (alt)",
    (23.0, 200.0, 23.0): "Stolpe 200mm",
    (31.8, 9.9, 2.0): "Klips",
}

def name_for(name, geom):
    bb = geom.bounds
    d = tuple(np.round(bb[1] - bb[0], 1))
    return FUSION_NAMES.get(d, name)


def transformed_geom(scene, name):
    g = scene.geometry[name].copy()
    try:
        nodes = scene.graph.geometry_nodes.get(name, [])
        if nodes:
            tf, _ = scene.graph.get(nodes[0])
            g.apply_transform(tf)
    except Exception:
        pass
    return g


# Definer farger basert på funksjon, ikke bare distinkt
COLOR_BY_FUNCTION = {
    'IKEA': (0.6, 0.8, 0.9),       # lysblå - vannreservoar
    'Boks kortside': (0.8, 0.6, 0.4),  # brun - sider
    'Boks langside': (0.7, 0.5, 0.3),  # mørk brun - perforerte sider
    'Gulv': (0.5, 0.4, 0.3),       # gulvfarge
    'Tak': (0.5, 0.4, 0.3),        # samme som gulv
    'Endelokk': (0.4, 0.7, 0.4),   # grønn - tanklokk
    'Lokk på tank': (0.5, 0.8, 0.5),
    'Stolpe': (0.7, 0.7, 0.7),     # grå - metallisk
    'Klips': (0.3, 0.3, 0.3),      # mørk grå
}


def color_for(named):
    for key, c in COLOR_BY_FUNCTION.items():
        if key in named:
            return np.array(c)
    return np.array([0.6, 0.6, 0.6])


def render(ax, azim, elev, title, only=None, hide=None, label=False, alpha=1.0):
    only_set = set(only) if only else None
    hide_set = set(hide or [])
    all_v = []
    for n, g_orig in scene.geometry.items():
        if only_set and n not in only_set:
            continue
        if n in hide_set:
            continue
        g = transformed_geom(scene, n)
        all_v.append(g.vertices)
        named = name_for(n, g)
        base = color_for(named)

        normals = g.face_normals
        az_r = np.deg2rad(azim); el_r = np.deg2rad(elev)
        light = np.array([np.cos(el_r)*np.cos(az_r), np.cos(el_r)*np.sin(az_r), np.sin(el_r)])
        shade = np.clip(np.abs(normals @ light) * 0.7 + 0.3, 0, 1)

        tri = g.vertices[g.faces]
        col = np.tile(base, (len(g.faces), 1)) * shade[:, None]
        col = np.clip(col, 0, 1)
        rgba = np.column_stack([col, np.full(len(col), alpha)])

        coll = Poly3DCollection(tri, facecolors=rgba, edgecolors=(0, 0, 0, 0.2), linewidths=0.1)
        ax.add_collection3d(coll)

        if label:
            c = g.vertices.mean(axis=0)
            ax.text(*c, named, fontsize=7, color='black', ha='center')

    if all_v:
        v = np.vstack(all_v)
        bb_min, bb_max = v.min(axis=0), v.max(axis=0)
        cx, cy, cz = (bb_min + bb_max) / 2
        mr = (bb_max - bb_min).max() / 2 * 1.05
        ax.set_xlim(cx - mr, cx + mr); ax.set_ylim(cy - mr, cy + mr); ax.set_zlim(cz - mr, cz + mr)

    ax.set_box_aspect([1, 1, 1])
    ax.view_init(elev=elev, azim=azim)
    ax.set_title(title, fontsize=11)
    ax.set_xlabel('X (mm)', fontsize=7); ax.set_ylabel('Y (mm)', fontsize=7); ax.set_zlabel('Z (mm)', fontsize=7)
    ax.tick_params(labelsize=6)


# Liste over hvilke bodies hører til hvilken funksjon
def bodies_matching(pred):
    return [n for n, g in scene.geometry.items() if pred(name_for(n, g))]

stolper = bodies_matching(lambda n: 'Stolpe' in n)
ikea = bodies_matching(lambda n: 'IKEA' in n)
base_alt = bodies_matching(lambda n: any(k in n for k in ['Boks', 'Gulv', 'Endelokk', 'Lokk på', 'IKEA', 'Klips']))
tak = bodies_matching(lambda n: n == 'Gulv / Tak')  # antar de 250×125×10 er gulv+tak

print(f"\nStolper: {stolper}")
print(f"IKEA-box ref: {ikea}")

print("\nRenderer komplet med navn...")
fig = plt.figure(figsize=(20, 12), facecolor='white')

ax = fig.add_subplot(2, 3, 1, projection='3d'); render(ax, 35, 20, "Hele kassa, isometrisk")
ax = fig.add_subplot(2, 3, 2, projection='3d'); render(ax, -45, 20, "Bakfra, isometrisk")
ax = fig.add_subplot(2, 3, 3, projection='3d'); render(ax, 0, 0, "Front (ren)")
ax = fig.add_subplot(2, 3, 4, projection='3d'); render(ax, 90, 0, "Side")
ax = fig.add_subplot(2, 3, 5, projection='3d'); render(ax, 0, 89, "Topp")
ax = fig.add_subplot(2, 3, 6, projection='3d'); render(ax, 35, 20, "Uten stolper og tak (se base)",
                                                       hide=stolper + tak)

plt.tight_layout()
out = os.path.join(OUT, "render-navngitt.png")
plt.savefig(out, dpi=140, bbox_inches='tight', facecolor='white')
plt.close()
print(f"  -> {out}")

# Cross-section: snitt gjennom modellen
print("Renderer snitt...")
fig = plt.figure(figsize=(20, 8), facecolor='white')

# Bare IKEA + base
ax = fig.add_subplot(1, 3, 1, projection='3d')
render(ax, 35, 20, "Bare IKEA-tank og base", only=base_alt)
ax = fig.add_subplot(1, 3, 2, projection='3d')
render(ax, 35, 20, "Bare IKEA-tank (referansegeometri)", only=ikea)
ax = fig.add_subplot(1, 3, 3, projection='3d')
render(ax, 35, 20, "Halvtransparent — se inni", alpha=0.4)

plt.tight_layout()
out2 = os.path.join(OUT, "render-snitt.png")
plt.savefig(out2, dpi=140, bbox_inches='tight', facecolor='white')
plt.close()
print(f"  -> {out2}")

# Dimensjoner og forhold
print("\n=== DIMENSJONER ===")
bb = scene.bounds
d = bb[1] - bb[0]
print(f"Total bounding box: {d[0]:.0f} × {d[1]:.0f} × {d[2]:.0f} mm")

# Finn hvilken akse er høyden ved å se på stolpene
for s in stolper[:1]:
    g = transformed_geom(scene, s)
    sb = g.bounds
    sd = sb[1] - sb[0]
    print(f"Stolpe dimensjoner: {sd[0]:.0f} × {sd[1]:.0f} × {sd[2]:.0f} mm")
    print(f"  Største akse er vertikalen — stolpens høyde")

# Total vertical extent
print(f"\nForhold til Bambu P2S byggeflate (256×256×256):")
for axis, dim in zip(['X', 'Y', 'Z'], d):
    fit = "OK" if dim <= 256 else f"FOR STORT med {dim-256:.0f} mm"
    print(f"  {axis} = {dim:.0f} mm — {fit}")
