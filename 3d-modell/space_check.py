"""
Sjekk faktisk klaring mellom IKEA-tank og base-vegger.
Avgjør om elektronikk-komponenter får plass på sidene.
"""

import trimesh
import numpy as np

PATH = r"C:\Users\marku\Desktop\AI\Plantepotte\3d-modell\Plantekassa.3mf"
scene = trimesh.load(PATH, force='scene')

def transformed(name):
    g = scene.geometry[name].copy()
    nodes = scene.graph.geometry_nodes.get(name, [])
    if nodes:
        tf, _ = scene.graph.get(nodes[0])
        g.apply_transform(tf)
    return g

# Finn IKEA-tank (313×112×213)
print("Alle bodies med bbox:")
for n, g in scene.geometry.items():
    d = g.bounds[1] - g.bounds[0]
    print(f"  {n}: {d[0]:.1f} × {d[1]:.1f} × {d[2]:.1f}")

ikea = None
ikea_name = None
for n, g in scene.geometry.items():
    d_local = g.bounds[1] - g.bounds[0]
    if 310 < d_local.max() < 320 and sorted(d_local)[0] < 120:
        ikea = transformed(n)
        ikea_name = n
        break
if ikea is None:
    print("Fant ikke IKEA-tank med kriterium 310<max<320 og 110<mid<115")
    raise SystemExit
print(f"IKEA-tank: {ikea_name}, bbox {ikea.bounds[1] - ikea.bounds[0]}")

# Finn alle base-vegger (boks kortside og langside)
walls = []
for n, g in scene.geometry.items():
    d = g.bounds[1] - g.bounds[0]
    # Boks kortside 100×125×235 eller langside 220×10×225 eller endelokk 170×10×225
    if (abs(d.max() - 235) < 2 and 95 < sorted(d)[0] < 130) or \
       (abs(d.max() - 225) < 2 and sorted(d)[0] < 12):
        walls.append((n, transformed(n)))

print(f"Vegger funnet: {len(walls)}")

# IKEA bbox
ikea_bb = ikea.bounds
print(f"\nIKEA-tank ligger fra:")
print(f"  X: {ikea_bb[0][0]:.1f} til {ikea_bb[1][0]:.1f}")
print(f"  Y: {ikea_bb[0][1]:.1f} til {ikea_bb[1][1]:.1f}")
print(f"  Z: {ikea_bb[0][2]:.1f} til {ikea_bb[1][2]:.1f}")

# For hver vegg, finn nærmeste punkt til IKEA-tank
print(f"\n=== KLARING MELLOM TANK OG VEGGER ===")
for n, w in walls:
    wb = w.bounds
    wd = wb[1] - wb[0]

    # Klaring i hver akse
    clearances = []
    for axis, axis_name in enumerate(['X', 'Y', 'Z']):
        # Hvis veggen er på den siden av tanken
        if wb[0][axis] >= ikea_bb[1][axis]:
            gap = wb[0][axis] - ikea_bb[1][axis]
            clearances.append((axis_name, '+', gap))
        elif wb[1][axis] <= ikea_bb[0][axis]:
            gap = ikea_bb[0][axis] - wb[1][axis]
            clearances.append((axis_name, '-', gap))

    if clearances:
        for ax, side, gap in clearances:
            print(f"  {n} ({wd[0]:.0f}×{wd[1]:.0f}×{wd[2]:.0f}): klaring {gap:.1f} mm i {ax}{side}-retning")

print(f"\n=== ELEKTRONIKK-KRAV (per spec) ===")
print(f"  ESP32:           54 × 28 × 13 mm")
print(f"  LR7843 MOSFET:   33 × 22 × 15 mm")
print(f"  Buck converter:  43 × 21 × 14 mm")
print(f"  DC barrel jack:  Ø12 × 22 mm")
print(f"  Sum-bbox med margin: ~80 × 120 × 40 mm")
print(f"")
print(f"  XKC-Y25 (vannivå): Ø22 × 8 mm — limes på utsiden av IKEA-tank med 3M tape")
print(f"  Trenger {22+3} mm = 25 mm klaring mellom tank og base")
