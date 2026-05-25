"""
Detaljert render: hver komponent i forskjellig farge, separate visninger.
"""

import trimesh
import numpy as np
import matplotlib.pyplot as plt
from mpl_toolkits.mplot3d.art3d import Poly3DCollection
import matplotlib.colors as mcolors
import os

PATH = r"C:\Users\marku\Desktop\AI\Plantepotte\3d-modell\Plantekassa.3mf"
OUT = r"C:\Users\marku\Desktop\AI\Plantepotte\3d-modell"

scene = trimesh.load(PATH, force='scene')


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


# Lag distinkte farger
n_geoms = len(scene.geometry)
cmap = plt.cm.get_cmap('tab20', n_geoms)
names = list(scene.geometry.keys())
colors_by_name = {name: cmap(i)[:3] for i, name in enumerate(names)}


def render_scene_colored(ax, scene, azim, elev, title, hide=None, only=None, alpha=1.0, label_components=False):
    hide = set(hide or [])
    only = set(only) if only else None

    all_verts = []
    for name in scene.geometry.keys():
        if only and name not in only:
            continue
        if name in hide:
            continue

        g = transformed_geom(scene, name)
        all_verts.append(g.vertices)

        normals = g.face_normals
        az_rad = np.deg2rad(azim)
        el_rad = np.deg2rad(elev)
        light_dir = np.array([
            np.cos(el_rad) * np.cos(az_rad),
            np.cos(el_rad) * np.sin(az_rad),
            np.sin(el_rad),
        ])
        shade = np.clip(np.abs(normals @ light_dir) * 0.75 + 0.25, 0, 1)

        base = np.array(colors_by_name[name])
        tri = g.vertices[g.faces]
        colors = np.repeat(base[None, :], len(g.faces), axis=0) * shade[:, None]
        colors = np.clip(colors, 0, 1)
        rgba = np.column_stack([colors, np.full(len(colors), alpha)])

        coll = Poly3DCollection(tri, facecolors=rgba, edgecolors=(0, 0, 0, 0.15), linewidths=0.15)
        ax.add_collection3d(coll)

        if label_components:
            center = g.vertices.mean(axis=0)
            ax.text(*center, name, fontsize=6, color='black', ha='center', alpha=0.7)

    if all_verts:
        v = np.vstack(all_verts)
        bb_min = v.min(axis=0)
        bb_max = v.max(axis=0)
        cx, cy, cz = (bb_min + bb_max) / 2
        max_range = (bb_max - bb_min).max() / 2 * 1.05
        ax.set_xlim(cx - max_range, cx + max_range)
        ax.set_ylim(cy - max_range, cy + max_range)
        ax.set_zlim(cz - max_range, cz + max_range)

    ax.set_box_aspect([1, 1, 1])
    ax.view_init(elev=elev, azim=azim)
    ax.set_title(title, fontsize=11, pad=4)
    ax.set_xlabel('X (mm)', fontsize=7)
    ax.set_ylabel('Y (mm)', fontsize=7)
    ax.set_zlabel('Z (mm)', fontsize=7)
    ax.tick_params(labelsize=6)


# ===== FIGUR 1: STORE OVERSIKTSRENDRINGER =====
print("Renderer oversikt...")
fig = plt.figure(figsize=(20, 14), facecolor='white')
views = [
    (35, 25, "Isometrisk forfra"),
    (-145, 25, "Isometrisk bakfra"),
    (0, 5, "Front"),
    (90, 5, "Side"),
    (0, 89, "Topp"),
    (0, -89, "Bunn"),
]
for i, (az, el, name) in enumerate(views, 1):
    ax = fig.add_subplot(2, 3, i, projection='3d')
    render_scene_colored(ax, scene, az, el, name)

plt.tight_layout()
plt.savefig(os.path.join(OUT, "render-oversikt-stor.png"), dpi=140, bbox_inches='tight', facecolor='white')
plt.close()
print("  -> render-oversikt-stor.png")


# ===== FIGUR 2: KOMPONENT-SEPARASJON =====
print("Renderer komponenter individuelt...")
# Grupper bodies som er identiske (samme bbox-størrelse)
groups = {}
for name, g in scene.geometry.items():
    bb = g.bounds
    d = tuple(np.round(bb[1] - bb[0], 1))
    groups.setdefault(d, []).append(name)

unique_groups = list(groups.items())
n = len(unique_groups)
cols = 4
rows = (n + cols - 1) // cols

fig = plt.figure(figsize=(20, 4.5 * rows), facecolor='white')
for i, (dim, members) in enumerate(unique_groups, 1):
    ax = fig.add_subplot(rows, cols, i, projection='3d')
    title = f"{dim[0]:.0f} × {dim[1]:.0f} × {dim[2]:.0f} mm ({len(members)} stk)\n" + ", ".join(members[:3])
    render_scene_colored(ax, scene, 35, 25, title, only=members)

plt.tight_layout()
plt.savefig(os.path.join(OUT, "render-komponenter.png"), dpi=130, bbox_inches='tight', facecolor='white')
plt.close()
print("  -> render-komponenter.png")


# ===== FIGUR 3: VED Å SKJULE NOEN BODIES, SE INNVENDIG =====
print("Renderer innvendig (skjuler ytterskall)...")
# Finn de største flate bodyene (sannsynligvis ytre vegger/topp) og skjul dem
bodies_by_size = sorted(scene.geometry.items(), key=lambda x: -(x[1].bounds[1] - x[1].bounds[0]).prod())

fig = plt.figure(figsize=(20, 14), facecolor='white')
# Vis alt
ax1 = fig.add_subplot(2, 2, 1, projection='3d')
render_scene_colored(ax1, scene, 35, 25, "Alle komponenter, isometrisk")

# Skjul de største 2 (sannsynligvis topp/bunn-paneler)
hidden = [bodies_by_size[0][0], bodies_by_size[1][0]]
ax2 = fig.add_subplot(2, 2, 2, projection='3d')
render_scene_colored(ax2, scene, 35, 25, f"Uten de 2 største: {', '.join(hidden)}", hide=hidden)

# Bare det største (sannsynligvis vannreservoaret/IKEA-boksen?)
ax3 = fig.add_subplot(2, 2, 3, projection='3d')
biggest_name, biggest = bodies_by_size[0]
render_scene_colored(ax3, scene, 35, 25, f"Bare det største: {biggest_name}", only=[biggest_name])

# Med transparens
ax4 = fig.add_subplot(2, 2, 4, projection='3d')
render_scene_colored(ax4, scene, 35, 25, "Alle, halvtransparent", alpha=0.35)

plt.tight_layout()
plt.savefig(os.path.join(OUT, "render-innvendig.png"), dpi=130, bbox_inches='tight', facecolor='white')
plt.close()
print("  -> render-innvendig.png")

print("\nFerdig.")
