"""
Analyser 3MF-fil fra Fusion 360.
Skriver ut struktur, dimensjoner og lagrer rendringer.
"""

import trimesh
import numpy as np
import matplotlib.pyplot as plt
from mpl_toolkits.mplot3d.art3d import Poly3DCollection
import sys
import os

PATH = r"C:\Users\marku\Desktop\AI\Plantepotte\3d-modell\Plantekassa.3mf"
OUT = r"C:\Users\marku\Desktop\AI\Plantepotte\3d-modell"

print(f"Laster {PATH}...")
scene = trimesh.load(PATH, force='scene')
print(f"Type: {type(scene).__name__}")

if isinstance(scene, trimesh.Scene):
    print(f"\n=== ASSEMBLY ===")
    print(f"Antall geometrier: {len(scene.geometry)}")
    print(f"Antall noder: {len(scene.graph.nodes)}")

    # Total bbox
    total_bb = scene.bounds
    dim = total_bb[1] - total_bb[0]
    print(f"\nTotal bounding box (mm):")
    print(f"  X: {dim[0]:.1f}")
    print(f"  Y: {dim[1]:.1f}")
    print(f"  Z (høyde): {dim[2]:.1f}")
    print(f"  Volum (bbox): {dim[0]*dim[1]*dim[2]/1000:.0f} cm³")

    print(f"\n=== KOMPONENTER ===")
    for name, geom in scene.geometry.items():
        bb = geom.bounds
        d = bb[1] - bb[0]
        vol_real = geom.volume / 1000 if geom.is_watertight else None
        print(f"\n  {name}")
        print(f"    Trekanter: {len(geom.faces)}")
        print(f"    BBox: {d[0]:.1f} × {d[1]:.1f} × {d[2]:.1f} mm")
        print(f"    Watertight: {geom.is_watertight}")
        if vol_real:
            print(f"    Volum (faktisk): {vol_real:.1f} cm³")
else:
    mesh = scene
    print(f"\n=== ENKEL MESH ===")
    print(f"Trekanter: {len(mesh.faces)}")
    bb = mesh.bounds
    d = bb[1] - bb[0]
    print(f"BBox: {d[0]:.1f} × {d[1]:.1f} × {d[2]:.1f} mm")
    print(f"Watertight: {mesh.is_watertight}")
    if mesh.is_watertight:
        print(f"Volum: {mesh.volume/1000:.1f} cm³")


def render_view(scene_or_mesh, azim, elev, ax_title, ax):
    """Renderer en visning med matplotlib 3D."""
    ax.clear()

    if isinstance(scene_or_mesh, trimesh.Scene):
        geoms = []
        for name, g in scene_or_mesh.geometry.items():
            # Bruk transform fra scene-grafen
            try:
                transforms = scene_or_mesh.graph.geometry_nodes[name]
                tf = scene_or_mesh.graph.get(transforms[0])[0] if transforms else np.eye(4)
            except Exception:
                tf = np.eye(4)
            g_copy = g.copy()
            g_copy.apply_transform(tf)
            geoms.append(g_copy)
        combined = trimesh.util.concatenate(geoms)
    else:
        combined = scene_or_mesh

    verts = combined.vertices
    faces = combined.faces

    # Lett shading: faser farges etter normalvinkel mot betrakter
    normals = combined.face_normals
    # Lyskilde i retning betrakteren
    az_rad = np.deg2rad(azim)
    el_rad = np.deg2rad(elev)
    light_dir = np.array([
        np.cos(el_rad) * np.cos(az_rad),
        np.cos(el_rad) * np.sin(az_rad),
        np.sin(el_rad),
    ])
    shade = np.clip(normals @ light_dir, 0.15, 1.0)

    tri = verts[faces]
    colors = np.tile(np.array([0.3, 0.7, 0.4]), (len(faces), 1)) * shade[:, None]
    colors = np.clip(colors, 0, 1)

    coll = Poly3DCollection(tri, facecolors=colors, edgecolors=(0, 0, 0, 0.05), linewidths=0.1)
    ax.add_collection3d(coll)

    bb = combined.bounds
    cx, cy, cz = (bb[0] + bb[1]) / 2
    max_range = (bb[1] - bb[0]).max() / 2 * 1.1
    ax.set_xlim(cx - max_range, cx + max_range)
    ax.set_ylim(cy - max_range, cy + max_range)
    ax.set_zlim(cz - max_range, cz + max_range)
    ax.set_box_aspect([1, 1, 1])
    ax.view_init(elev=elev, azim=azim)
    ax.set_title(ax_title, fontsize=10)
    ax.set_xlabel('X (mm)', fontsize=7)
    ax.set_ylabel('Y (mm)', fontsize=7)
    ax.set_zlabel('Z (mm)', fontsize=7)
    ax.tick_params(labelsize=6)


print("\n=== RENDRER ===")
fig = plt.figure(figsize=(14, 10), facecolor='white')
views = [
    (30, 25, "Isometrisk"),
    (0, 0, "Front (X-akse)"),
    (90, 0, "Side (Y-akse)"),
    (0, 89, "Topp"),
    (135, 20, "Bakfra/skrå"),
    (-45, 15, "Forfra/skrå"),
]
for i, (az, el, name) in enumerate(views, 1):
    print(f"  Renderer {name}...")
    ax = fig.add_subplot(2, 3, i, projection='3d')
    render_view(scene, az, el, name, ax)

plt.tight_layout()
out_path = os.path.join(OUT, "render-oversikt.png")
plt.savefig(out_path, dpi=130, bbox_inches='tight', facecolor='white')
print(f"\nLagret: {out_path}")
