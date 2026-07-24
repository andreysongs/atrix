"""Generate the approved Olympus AI athlete as a rigged, animated GLB.

This script is meant to run inside Blender 4.5 with the MPFB extension enabled.
The generated character is based on MakeHuman/MPFB CC0 graphical assets. The
tooling code itself is not bundled with the app.

Example:
    blender --background --python scripts/3d/generate-olympus-athlete.py -- \
      --output tmp/athlete-build/olympus-athlete.glb \
      --preview-dir tmp/athlete-build/previews
"""

from __future__ import annotations

import argparse
import math
import sys
from pathlib import Path

import bpy
import numpy as np
from mathutils import Vector

from bl_ext.user_default.mpfb.entities.objectproperties import HumanObjectProperties
from bl_ext.user_default.mpfb.services.humanservice import HumanService
from bl_ext.user_default.mpfb.services.targetservice import TargetService


PROJECT_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_ASSET_ROOT = PROJECT_ROOT / ".tools" / "makehuman-system-assets"
DEFAULT_OUTPUT = PROJECT_ROOT / "tmp" / "athlete-build" / "olympus-athlete.glb"
DEFAULT_PREVIEW_DIR = PROJECT_ROOT / "tmp" / "athlete-build" / "previews"

BLACK = (0.008, 0.010, 0.014, 1.0)
BLACK_FABRIC = (0.026, 0.029, 0.036, 1.0)
BLACK_SHORTS = (0.012, 0.014, 0.019, 1.0)
BLACK_HAIR = (0.004, 0.005, 0.007, 1.0)
CHARCOAL = (0.035, 0.040, 0.050, 1.0)
METAL = (0.09, 0.10, 0.12, 1.0)
GOLD = (0.83, 0.54, 0.12, 1.0)


def parse_args() -> argparse.Namespace:
    argv = sys.argv
    argv = argv[argv.index("--") + 1 :] if "--" in argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument("--asset-root", type=Path, default=DEFAULT_ASSET_ROOT)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--preview-dir", type=Path, default=DEFAULT_PREVIEW_DIR)
    parser.add_argument("--skip-previews", action="store_true")
    return parser.parse_args(argv)


def reset_scene() -> None:
    bpy.ops.object.mode_set(mode="OBJECT") if bpy.context.object and bpy.context.object.mode != "OBJECT" else None
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for datablocks in (
        bpy.data.actions,
        bpy.data.armatures,
        bpy.data.cameras,
        bpy.data.curves,
        bpy.data.lights,
        bpy.data.materials,
        bpy.data.meshes,
    ):
        for datablock in list(datablocks):
            if datablock.users == 0:
                datablocks.remove(datablock)


def make_material(
    name: str,
    color: tuple[float, float, float, float],
    *,
    roughness: float = 0.55,
    metallic: float = 0.0,
) -> bpy.types.Material:
    material = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    material.diffuse_color = color
    material.use_nodes = True
    principled = material.node_tree.nodes.get("Principled BSDF")
    if principled:
        principled.inputs["Base Color"].default_value = color
        principled.inputs["Roughness"].default_value = roughness
        principled.inputs["Metallic"].default_value = metallic
    return material


def make_highlight_material(
    name: str,
    color: tuple[float, float, float, float],
    *,
    emission_strength: float,
) -> bpy.types.Material:
    material = make_material(name, color, roughness=0.42)
    principled = material.node_tree.nodes.get("Principled BSDF")
    if principled:
        principled.inputs["Alpha"].default_value = color[3]
        principled.inputs["Emission Color"].default_value = color
        principled.inputs["Emission Strength"].default_value = emission_strength
    if hasattr(material, "surface_render_method"):
        material.surface_render_method = "BLENDED"
    return material


def replace_materials(obj: bpy.types.Object, material: bpy.types.Material) -> None:
    if obj.type != "MESH":
        return
    obj.data.materials.clear()
    obj.data.materials.append(material)
    for polygon in obj.data.polygons:
        polygon.material_index = 0


def asset_path(root: Path, kind: str, name: str, extension: str) -> Path:
    path = root / kind / name / f"{name}.{extension}"
    if not path.is_file():
        raise FileNotFoundError(f"Required MakeHuman asset is missing: {path}")
    return path


def configure_body_shape(human: bpy.types.Object) -> None:
    values = {
        "gender": 1.0,
        # 0.50 is MPFB's exact "young adult" anchor. Off-anchor values blend
        # neighboring age components and can subtly soften the face.
        "age": 0.50,
        "muscle": 1.0,
        "weight": 0.43,
        "height": 0.56,
        "proportions": 0.74,
        "asian": 0.70,
        "caucasian": 0.27,
        "african": 0.03,
    }
    for key, value in values.items():
        HumanObjectProperties.set_value(key, value, entity_reference=human)
    TargetService.reapply_macro_details(human)
    apply_athlete_detail_targets(human)
    human.name = "olympus_athlete_body"
    human.data.name = "olympus_athlete_body_mesh"


def apply_athlete_detail_targets(human: bpy.types.Object) -> None:
    """Build the approved broad, muscular athlete silhouette with MPFB targets.

    The macro ``muscle`` control adds definition globally, but on its own it
    retains the relatively slim average-human circumferences. These local
    targets add the mass distribution visible in the approved turnaround:
    broad shoulders and back, a thick chest, powerful limbs, an athletic
    waist, and a stronger adult male jaw. All targets remain native MakeHuman
    deformations, so the game-engine rig, garment weights, and animation stay
    compatible with the original topology.
    """
    bilateral_targets = {
        # Rounded deltoids and visibly developed upper arms.
        "upperarm-shoulder-muscle-incr": 0.50,
        "upperarm-muscle-incr": 0.48,
        # Forearms should support the heavier upper-arm silhouette.
        "lowerarm-muscle-incr": 0.32,
        # Strong quadriceps/hamstrings and full calves, not bodybuilder bulk.
        "upperleg-muscle-incr": 0.40,
        "lowerleg-muscle-incr": 0.42,
        # A firmer cheekbone structure supports the mature masculine face.
        "cheek-bones-incr": 0.22,
        "cheek-volume-decr": 0.12,
        # Slightly narrower eyes keep the likeness adult and focused.
        "eye-height1-decr": 0.08,
    }
    detail_targets = [
        {"target": f"{side}-{name}", "value": value}
        for name, value in bilateral_targets.items()
        for side in ("l", "r")
    ]
    detail_targets.extend(
        [
            # Upper-body taper and muscular depth.
            {"target": "torso-vshape-incr", "value": 0.50},
            {"target": "measure-shoulder-dist-incr", "value": 0.24},
            {"target": "torso-muscle-pectoral-incr", "value": 0.50},
            {"target": "torso-muscle-dorsi-incr", "value": 0.38},
            {"target": "measure-waist-circ-decr", "value": 0.10},
            {"target": "stomach-tone-incr", "value": 0.40},
            {"target": "pelvis-tone-incr", "value": 0.20},
            {"target": "buttocks-volume-incr", "value": 0.10},
            # Circumference targets reinforce the local muscle shapes.
            {"target": "measure-upperarm-circ-incr", "value": 0.15},
            {"target": "measure-thigh-circ-incr", "value": 0.12},
            {"target": "measure-calf-circ-incr", "value": 0.15},
            # A powerful neck and squarer jaw better match the approved face.
            {"target": "measure-neck-circ-incr", "value": 0.28},
            {"target": "chin-width-incr", "value": 0.22},
            {"target": "chin-bones-incr", "value": 0.18},
            {"target": "chin-prominent-incr", "value": 0.12},
            {"target": "head-rectangular", "value": 0.28},
            {"target": "head-fat-decr", "value": 0.18},
            {"target": "forehead-temple-incr", "value": 0.10},
            {"target": "nose-greek-incr", "value": 0.10},
            {"target": "nose-scale-depth-incr", "value": 0.10},
            {"target": "nose-width1-decr", "value": 0.06},
            {"target": "mouth-upperlip-volume-decr", "value": 0.08},
            {"target": "mouth-lowerlip-volume-decr", "value": 0.10},
        ]
    )
    TargetService.bulk_load_targets(human, detail_targets)
    print(f"OLYMPUS_DETAIL_TARGETS={len(detail_targets)}")


def tune_skin_material(human: bpy.types.Object, texture_dir: Path) -> None:
    """Create a warm, mobile-sized skin texture matching the approved athlete."""
    material = human.data.materials[0]
    if not material.use_nodes or not material.node_tree:
        return
    nodes = material.node_tree.nodes
    principled = nodes.get("Principled BSDF")
    diffuse = nodes.get("DiffuseTexture")
    if not principled or not diffuse or not diffuse.image:
        return

    # The stock MakeHuman texture is very pale under neutral real-time lights.
    # A private 1024px copy preserves its anatomical detail while making the
    # exported GLB smaller and giving the athlete the approved warm skin tone.
    texture_dir.mkdir(parents=True, exist_ok=True)
    tinted = diffuse.image.copy()
    tinted.name = "olympus_athlete_skin"
    tinted.scale(1024, 1024)
    pixels = np.empty(len(tinted.pixels), dtype=np.float32)
    tinted.pixels.foreach_get(pixels)
    rgba = pixels.reshape((-1, 4))
    rgba[:, :3] = np.clip(
        rgba[:, :3] * np.array((0.86, 0.72, 0.64), dtype=np.float32),
        0.0,
        1.0,
    )
    tinted.pixels.foreach_set(pixels)
    tinted.update()
    tinted.filepath_raw = str(texture_dir / "olympus-athlete-skin.png")
    tinted.file_format = "PNG"
    tinted.save()
    tinted.pack()
    diffuse.image = tinted

    # The source alpha channel is fully opaque. Removing the redundant alpha
    # branch keeps the body in the fast opaque render path on mobile/WebGL.
    alpha = nodes.get("AlphaMapTexture")
    if alpha:
        nodes.remove(alpha)
    principled.inputs["Alpha"].default_value = 1.0
    principled.inputs["Roughness"].default_value = 0.57
    principled.inputs["Specular IOR Level"].default_value = 0.34


def tune_shoe_material(shoes: bpy.types.Object, texture_dir: Path) -> None:
    """Darken the stock trainer while retaining its photographic detail map."""
    if not shoes.data.materials:
        return
    material = shoes.data.materials[0]
    if not material.use_nodes or not material.node_tree:
        return
    nodes = material.node_tree.nodes
    diffuse = nodes.get("DiffuseTexture")
    principled = nodes.get("Principled BSDF")
    if not diffuse or not diffuse.image or not principled:
        return

    # Replacing the complete material with flat black erased the sole grooves,
    # laces, mesh knit, and panel seams. A private darkened texture keeps those
    # cues and still matches the approved all-black training shoe.
    texture_dir.mkdir(parents=True, exist_ok=True)
    tinted = diffuse.image.copy()
    tinted.name = "olympus_athlete_shoes"
    tinted.scale(1024, 1024)
    pixels = np.empty(len(tinted.pixels), dtype=np.float32)
    tinted.pixels.foreach_get(pixels)
    rgba = pixels.reshape((-1, 4))
    rgba[:, :3] = np.clip(
        rgba[:, :3] * np.array((0.26, 0.27, 0.30), dtype=np.float32),
        0.0,
        1.0,
    )
    tinted.pixels.foreach_set(pixels)
    tinted.update()
    tinted.filepath_raw = str(texture_dir / "olympus-athlete-shoes.png")
    tinted.file_format = "PNG"
    tinted.save()
    tinted.pack()
    diffuse.image = tinted

    principled.inputs["Roughness"].default_value = 0.54
    principled.inputs["Specular IOR Level"].default_value = 0.30


def load_character_assets(
    human: bpy.types.Object,
    rig: bpy.types.Object,
    root: Path,
    texture_dir: Path,
) -> dict[str, bpy.types.Object]:
    skin = asset_path(root, "skins", "young_asian_male", "mhmat")
    HumanService.set_character_skin(str(skin), human, skin_type="GAMEENGINE")
    tune_skin_material(human, texture_dir)

    specs = {
        "eyes": ("eyes", "low-poly", "Eyes"),
        "eyebrows": ("eyebrows", "eyebrow001", "Eyebrows"),
        "eyelashes": ("eyelashes", "eyelashes01", "Eyelashes"),
        "hair": ("hair", "short01", "Hair"),
        "shoes": ("clothes", "shoes05", "Clothes"),
    }
    loaded: dict[str, bpy.types.Object] = {}
    for key, (kind, name, asset_type) in specs.items():
        loaded[key] = HumanService.add_mhclo_asset(
            str(asset_path(root, kind, name, "mhclo")),
            human,
            asset_type=asset_type,
            subdiv_levels=0,
            material_type="GAMEENGINE",
        )
        loaded[key].name = f"olympus_{key}"

    black_fabric = make_material("olympus_black_fabric", BLACK_FABRIC, roughness=0.72)
    black_shorts = make_material("olympus_black_shorts", BLACK_SHORTS, roughness=0.76)
    black_hair = make_material("olympus_black_hair", BLACK_HAIR, roughness=0.72)
    primary_highlight = make_highlight_material(
        "olympus_muscle_primary",
        (0.006, 0.055, 0.38, 0.34),
        emission_strength=0.28,
    )
    secondary_highlight = make_highlight_material(
        "olympus_muscle_secondary",
        (0.55, 0.20, 0.015, 0.42),
        emission_strength=0.30,
    )

    # A fitted garment generated from the final body surface preserves the
    # approved muscular silhouette and avoids the angular seams of generic
    # clothes. It carries the exact same rig weights as the body.
    loaded["outfit"] = create_training_outfit(
        human,
        rig,
        black_fabric,
        black_shorts,
    )
    loaded["highlight_primary"] = create_muscle_highlight(
        human,
        rig,
        primary_highlight,
        region="pectorals",
        offset=0.019,
    )
    loaded["highlight_secondary"] = create_muscle_highlight(
        human,
        rig,
        secondary_highlight,
        region="triceps",
        offset=0.006,
    )
    replace_materials(loaded["hair"], black_hair)
    tune_shoe_material(loaded["shoes"], texture_dir)

    for obj in [human, *loaded.values()]:
        if obj.type == "MESH":
            for polygon in obj.data.polygons:
                polygon.use_smooth = True
        obj["olympus_asset"] = True
        obj["olympus_role"] = obj.name.removeprefix("olympus_")

    rig.name = "olympus_athlete_rig"
    rig.data.name = "olympus_athlete_skeleton"
    rig["olympus_asset"] = True
    rig["olympus_role"] = "athlete_rig"
    return loaded


def create_training_outfit(
    human: bpy.types.Object,
    rig: bpy.types.Object,
    tank_material: bpy.types.Material,
    shorts_material: bpy.types.Material,
) -> bpy.types.Object:
    modifier_states = [(modifier, modifier.show_viewport) for modifier in human.modifiers]
    for modifier, _ in modifier_states:
        modifier.show_viewport = False
    depsgraph = bpy.context.evaluated_depsgraph_get()
    depsgraph.update()
    evaluated_human = human.evaluated_get(depsgraph)
    evaluated_mesh = evaluated_human.to_mesh(preserve_all_data_layers=True, depsgraph=depsgraph)
    body_group_index = human.vertex_groups["body"].index
    body_vertices = {
        vertex.index
        for vertex in human.data.vertices
        if any(group.group == body_group_index and group.weight > 0.5 for group in vertex.groups)
    }

    body_polygons = [
        polygon
        for polygon in evaluated_mesh.polygons
        if all(index in body_vertices for index in polygon.vertices)
    ]
    vertices: list[Vector] = []
    source_indices: list[int] = []
    faces: list[tuple[int, ...]] = []
    face_materials: list[int] = []

    def add_surface(
        polygons: list[bpy.types.MeshPolygon],
        *,
        offset: float,
        material_index: int,
    ) -> None:
        chosen_vertices = {
            index
            for polygon in polygons
            for index in polygon.vertices
        }
        old_to_new: dict[int, int] = {}
        for old in sorted(chosen_vertices):
            old_to_new[old] = len(vertices)
            vertex = evaluated_mesh.vertices[old]
            vertices.append(vertex.co.copy() + vertex.normal * offset)
            source_indices.append(old)
        surface_faces = [
            tuple(old_to_new[index] for index in polygon.vertices)
            for polygon in polygons
        ]
        faces.extend(surface_faces)
        face_materials.extend([material_index] * len(surface_faces))
        smooth_surface_boundaries(vertices, surface_faces)

    tank_faces: list[bpy.types.MeshPolygon] = []
    shorts_faces: list[bpy.types.MeshPolygon] = []
    waistband_faces: list[bpy.types.MeshPolygon] = []
    for polygon in body_polygons:
        center = polygon.center
        x = abs(center.x)
        y = center.y
        z = center.z

        # Classic sleeveless athletic tank: a curved front neckline, shallow
        # rear neckline, and arm openings that retain a broad shoulder strap.
        if z <= 1.15:
            max_tank_x = 0.290
        elif z < 1.25:
            shoulder_blend = (z - 1.15) / 0.10
            max_tank_x = 0.290 * (1.0 - shoulder_blend) + 0.230 * shoulder_blend
        else:
            max_tank_x = 0.230
        is_tank = 0.835 <= z <= 1.39 and x <= max_tank_x
        front_neckline = 1.340 + 0.045 * min(1.0, (x / 0.100) ** 1.8)
        back_neckline = 1.368 + 0.020 * min(1.0, (x / 0.100) ** 1.8)
        front_neck = is_tank and y < -0.080 and z > front_neckline
        back_neck = is_tank and y > 0.025 and z > back_neckline
        if is_tank and not front_neck and not back_neck:
            tank_faces.append(polygon)

        # Mid-thigh training shorts sit underneath the tank by a few
        # centimeters, creating a visible waistband rather than a unitard.
        if 0.595 <= z <= 0.875:
            shorts_faces.append(polygon)
        if 0.815 <= z <= 0.885:
            waistband_faces.append(polygon)

    add_surface(tank_faces, offset=0.013, material_index=0)
    add_surface(shorts_faces, offset=0.009, material_index=1)
    add_surface(waistband_faces, offset=0.017, material_index=1)
    evaluated_human.to_mesh_clear()
    for modifier, enabled in modifier_states:
        modifier.show_viewport = enabled
    depsgraph.update()

    mesh = bpy.data.meshes.new("olympus_outfit_mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    outfit = bpy.data.objects.new("olympus_outfit", mesh)
    bpy.context.collection.objects.link(outfit)
    outfit.parent = rig
    outfit.matrix_parent_inverse.identity()
    mesh.materials.append(tank_material)
    mesh.materials.append(shorts_material)
    for polygon, material_index in zip(mesh.polygons, face_materials):
        polygon.material_index = material_index

    # Copy only deform-bone weights. Original and evaluated meshes share vertex
    # indices, so every garment point follows the athlete without retargeting.
    deform_bones = {bone.name for bone in rig.data.bones if bone.use_deform}
    groups = {
        name: outfit.vertex_groups.new(name=name)
        for name in deform_bones
        if human.vertex_groups.get(name) is not None
    }
    source_groups = {group.index: group.name for group in human.vertex_groups}
    for new, old in enumerate(source_indices):
        memberships = [
            (source_groups.get(membership.group), membership.weight)
            for membership in human.data.vertices[old].groups
            if source_groups.get(membership.group) in groups
            and membership.weight > 0.0
        ]
        memberships.sort(key=lambda item: item[1], reverse=True)
        memberships = memberships[:4]
        total = sum(weight for _, weight in memberships) or 1.0
        for group_name, weight in memberships:
            groups[group_name].add([new], weight / total, "REPLACE")

    modifier = outfit.modifiers.new("olympus_armature", "ARMATURE")
    modifier.object = rig
    solidify = outfit.modifiers.new("olympus_garment_thickness", "SOLIDIFY")
    solidify.thickness = 0.002
    solidify.offset = 1.0
    solidify.use_rim = True
    for polygon in mesh.polygons:
        polygon.use_smooth = True
    outfit["olympus_asset"] = True
    outfit["olympus_role"] = "outfit"
    return outfit


def smooth_surface_boundaries(
    vertices: list[Vector],
    faces: list[tuple[int, ...]],
) -> None:
    """Smooth cut loops and level horizontal hems without changing topology."""
    edge_counts: dict[tuple[int, int], int] = {}
    adjacency: dict[int, set[int]] = {}
    for face in faces:
        for index, a in enumerate(face):
            b = face[(index + 1) % len(face)]
            edge = tuple(sorted((a, b)))
            edge_counts[edge] = edge_counts.get(edge, 0) + 1
    for (a, b), count in edge_counts.items():
        if count != 1:
            continue
        adjacency.setdefault(a, set()).add(b)
        adjacency.setdefault(b, set()).add(a)

    for _ in range(5):
        updates: dict[int, Vector] = {}
        for index, neighbors in adjacency.items():
            average = sum((vertices[neighbor] for neighbor in neighbors), Vector()) / len(neighbors)
            updates[index] = vertices[index].lerp(average, 0.28)
        for index, position in updates.items():
            vertices[index] = position

    remaining = set(adjacency)
    while remaining:
        start = remaining.pop()
        component = {start}
        stack = [start]
        while stack:
            current = stack.pop()
            for neighbor in adjacency[current]:
                if neighbor in component:
                    continue
                component.add(neighbor)
                remaining.discard(neighbor)
                stack.append(neighbor)
        z_values = [vertices[index].z for index in component]
        if max(z_values) - min(z_values) < 0.038:
            mean_z = sum(z_values) / len(z_values)
            for index in component:
                vertices[index].z = mean_z


def create_muscle_highlight(
    human: bpy.types.Object,
    rig: bpy.types.Object,
    material: bpy.types.Material,
    *,
    region: str,
    offset: float,
) -> bpy.types.Object:
    """Create a lightweight rigged anatomical overlay from the body surface."""
    modifier_states = [(modifier, modifier.show_viewport) for modifier in human.modifiers]
    for modifier, _ in modifier_states:
        modifier.show_viewport = False
    depsgraph = bpy.context.evaluated_depsgraph_get()
    depsgraph.update()
    evaluated_human = human.evaluated_get(depsgraph)
    evaluated_mesh = evaluated_human.to_mesh(
        preserve_all_data_layers=True,
        depsgraph=depsgraph,
    )
    body_group_index = human.vertex_groups["body"].index
    body_vertices = {
        vertex.index
        for vertex in human.data.vertices
        if any(
            membership.group == body_group_index and membership.weight > 0.5
            for membership in vertex.groups
        )
    }

    upperarm_group_indices = {
        suffix: human.vertex_groups[f"upperarm_{suffix}"].index
        for suffix in ("l", "r")
    }

    def upperarm_weight(indices: tuple[int, ...], suffix: str) -> float:
        group_index = upperarm_group_indices[suffix]
        weights = []
        for index in indices:
            weights.append(
                sum(
                    membership.weight
                    for membership in human.data.vertices[index].groups
                    if membership.group == group_index
                )
            )
        return sum(weights) / len(weights)

    selected_faces: list[tuple[int, ...]] = []
    selected_vertices: set[int] = set()
    for polygon in evaluated_mesh.polygons:
        indices = tuple(polygon.vertices)
        if not all(index in body_vertices for index in indices):
            continue
        center = polygon.center
        x = abs(center.x)
        y = center.y
        z = center.z

        selected = False
        if region == "pectorals":
            lower_edge = 1.095 + 0.025 * min(1.0, x / 0.23)
            upper_edge = 1.300 - 0.020 * min(1.0, x / 0.23)
            selected = (
                y < -0.105
                and 0.028 <= x <= 0.235
                and lower_edge <= z <= upper_edge
            )
        elif region == "triceps":
            suffix = "l" if center.x >= 0.0 else "r"
            selected = (
                x >= 0.285
                and y > 0.005
                and 1.035 <= z <= 1.335
                and upperarm_weight(indices, suffix) >= 0.42
            )
        else:
            raise ValueError(f"Unknown muscle highlight region: {region}")

        if selected:
            selected_faces.append(indices)
            selected_vertices.update(indices)

    old_to_new = {
        old: new
        for new, old in enumerate(sorted(selected_vertices))
    }
    source_indices = sorted(selected_vertices)
    vertices = [
        evaluated_mesh.vertices[old].co.copy()
        + evaluated_mesh.vertices[old].normal * offset
        for old in source_indices
    ]
    faces = [
        tuple(old_to_new[index] for index in face)
        for face in selected_faces
    ]
    smooth_surface_boundaries(vertices, faces)
    evaluated_human.to_mesh_clear()
    for modifier, enabled in modifier_states:
        modifier.show_viewport = enabled
    depsgraph.update()

    role = "primary" if region == "pectorals" else "secondary"
    mesh = bpy.data.meshes.new(f"olympus_highlight_{role}_mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    overlay = bpy.data.objects.new(f"olympus_highlight_{role}", mesh)
    bpy.context.collection.objects.link(overlay)
    overlay.parent = rig
    overlay.matrix_parent_inverse.identity()
    replace_materials(overlay, material)

    deform_bones = {bone.name for bone in rig.data.bones if bone.use_deform}
    groups = {
        name: overlay.vertex_groups.new(name=name)
        for name in deform_bones
        if human.vertex_groups.get(name) is not None
    }
    source_groups = {group.index: group.name for group in human.vertex_groups}
    for new, old in enumerate(source_indices):
        memberships = [
            (source_groups.get(membership.group), membership.weight)
            for membership in human.data.vertices[old].groups
            if source_groups.get(membership.group) in groups
            and membership.weight > 0.0
        ]
        memberships.sort(key=lambda item: item[1], reverse=True)
        memberships = memberships[:4]
        total = sum(weight for _, weight in memberships) or 1.0
        for group_name, weight in memberships:
            groups[group_name].add([new], weight / total, "REPLACE")

    armature = overlay.modifiers.new("olympus_armature", "ARMATURE")
    armature.object = rig
    for polygon in mesh.polygons:
        polygon.use_smooth = True
    overlay["olympus_asset"] = True
    overlay["olympus_role"] = f"highlight_{role}"
    return overlay


def add_empty(name: str, location: Vector, rig: bpy.types.Object) -> bpy.types.Object:
    empty = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(empty)
    empty.empty_display_type = "PLAIN_AXES"
    empty.empty_display_size = 0.07
    empty.location = location
    empty.parent = rig
    empty.matrix_parent_inverse.identity()
    return empty


def animate_target(
    target: bpy.types.Object,
    poses: list[tuple[int, Vector]],
) -> None:
    for frame, location in poses:
        target.location = location
        target.keyframe_insert(data_path="location", frame=frame)
    if target.animation_data and target.animation_data.action:
        for fcurve in target.animation_data.action.fcurves:
            for point in fcurve.keyframe_points:
                point.interpolation = "BEZIER"


def add_ik(
    rig: bpy.types.Object,
    bone_name: str,
    target: bpy.types.Object,
    pole: bpy.types.Object | None,
    chain_count: int,
    pole_angle: float = 0.0,
) -> None:
    bone = rig.pose.bones[bone_name]
    constraint = bone.constraints.new("IK")
    constraint.name = f"olympus_ik_{bone_name}"
    constraint.target = target
    constraint.chain_count = chain_count
    constraint.iterations = 64
    constraint.use_tail = True
    if pole:
        constraint.pole_target = pole
        constraint.pole_angle = pole_angle


def set_grip_pose(rig: bpy.types.Object) -> None:
    """Close the fingers around the dumbbell handles before baking the clip."""
    finger_names = ("index", "middle", "ring", "pinky")
    for suffix in ("l", "r"):
        for finger in finger_names:
            for segment, angle in ((1, 50.0), (2, 66.0), (3, 45.0)):
                bone = rig.pose.bones[f"{finger}_{segment:02d}_{suffix}"]
                bone.rotation_mode = "XYZ"
                bone.rotation_euler = (math.radians(angle), 0.0, 0.0)
        for segment, angle in ((1, 22.0), (2, 34.0), (3, 25.0)):
            bone = rig.pose.bones[f"thumb_{segment:02d}_{suffix}"]
            bone.rotation_mode = "XYZ"
            bone.rotation_euler = (
                math.radians(angle),
                0.0,
                math.radians(14.0 if suffix == "l" else -14.0),
            )


def build_floor_press_animation(rig: bpy.types.Object) -> None:
    scene = bpy.context.scene
    scene.render.fps = 60
    scene.frame_start = 1
    scene.frame_end = 61

    # Rotate the complete character from the modeling A-pose into a supine
    # exercise orientation. The athlete's back sits just above world Z=0.
    rig.rotation_euler = (math.radians(-90.0), 0.0, 0.0)
    rig.location = (0.0, -0.86, 0.13)

    action = bpy.data.actions.new("dumbbell-floor-press")
    rig.animation_data_create()
    rig.animation_data.action = action

    # Give the action a stable ownership slot before the visual bake.
    pelvis = rig.pose.bones["pelvis"]
    pelvis.rotation_mode = "QUATERNION"
    for frame in (1, 31, 61):
        pelvis.rotation_quaternion.identity()
        pelvis.keyframe_insert(data_path="rotation_quaternion", frame=frame)

    targets: list[bpy.types.Object] = []
    for suffix in ("l", "r"):
        upper = rig.data.bones[f"upperarm_{suffix}"]
        lower = rig.data.bones[f"lowerarm_{suffix}"]
        shoulder = upper.head_local.copy()
        reach = upper.length + lower.length
        side = 1.0 if shoulder.x >= 0 else -1.0

        wrist = add_empty(
            f"olympus_wrist_target_{suffix}",
            shoulder + Vector((side * reach * 0.60, -reach * 0.58, -0.045)),
            rig,
        )
        elbow_pole = add_empty(
            f"olympus_elbow_pole_{suffix}",
            shoulder + Vector((side * reach * 1.30, -reach * 0.08, -0.06)),
            rig,
        )
        bottom = shoulder + Vector((side * reach * 0.60, -reach * 0.58, -0.045))
        top = shoulder + Vector((side * reach * 0.16, -reach * 0.93, -0.045))
        animate_target(wrist, [(1, bottom), (31, top), (61, bottom)])
        add_ik(
            rig,
            f"lowerarm_{suffix}",
            wrist,
            elbow_pole,
            2,
            # The MakeHuman game-engine rig mirrors bone roll across the
            # sagittal plane. Both arms therefore need the same IK pole angle
            # to produce a mirrored floor-press pose.
            pole_angle=math.radians(-90.0),
        )
        targets.extend((wrist, elbow_pole))

    # Bend both legs while keeping the feet planted, matching the approved
    # dumbbell floor-press reference.
    for suffix in ("l", "r"):
        thigh = rig.data.bones[f"thigh_{suffix}"]
        foot = rig.data.bones[f"foot_{suffix}"]
        hip = thigh.head_local.copy()
        side = 1.0 if hip.x >= 0 else -1.0
        # Move the ankles toward the hips so the knees remain flexed while the
        # soles stay on the floor. Keeping the pole outside each knee avoids
        # the crossed-leg solution produced by the mirrored bone rolls.
        ankle_target = Vector((hip.x * 1.55, 0.018, 0.42))
        knee_target = Vector((hip.x + side * 0.15, -0.53, (hip.z + ankle_target.z) * 0.52))
        ankle = add_empty(f"olympus_ankle_target_{suffix}", ankle_target, rig)
        knee = add_empty(f"olympus_knee_pole_{suffix}", knee_target, rig)
        add_ik(
            rig,
            f"calf_{suffix}",
            ankle,
            knee,
            2,
            pole_angle=math.radians(-120.0 if suffix == "l" else -60.0),
        )
        targets.extend((ankle, knee))

    set_grip_pose(rig)
    bpy.context.view_layer.objects.active = rig
    rig.select_set(True)
    bpy.ops.object.mode_set(mode="POSE")
    bpy.ops.pose.select_all(action="SELECT")
    bpy.ops.nla.bake(
        frame_start=scene.frame_start,
        frame_end=scene.frame_end,
        step=1,
        only_selected=False,
        visual_keying=True,
        clear_constraints=True,
        clear_parents=False,
        use_current_action=True,
        bake_types={"POSE"},
    )
    bpy.ops.object.mode_set(mode="OBJECT")

    action.name = "dumbbell-floor-press"
    action.use_fake_user = True
    for target in targets:
        bpy.data.objects.remove(target, do_unlink=True)


def create_dumbbell_mesh(name: str) -> bpy.types.Object:
    parts: list[bpy.types.Object] = []
    dark_metal = make_material("olympus_dumbbell_metal", METAL, roughness=0.28, metallic=0.82)
    grip_material = make_material("olympus_dumbbell_grip", CHARCOAL, roughness=0.64, metallic=0.25)

    def cylinder(radius: float, depth: float, z: float, material: bpy.types.Material) -> None:
        bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=radius, depth=depth, location=(0.0, 0.0, z))
        obj = bpy.context.object
        replace_materials(obj, material)
        parts.append(obj)

    cylinder(0.020, 0.185, 0.0, grip_material)
    for z in (-0.127, -0.088, 0.088, 0.127):
        cylinder(0.074, 0.034, z, dark_metal)

    bpy.ops.object.select_all(action="DESELECT")
    for part in parts:
        part.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    bpy.ops.object.join()
    dumbbell = bpy.context.object
    dumbbell.name = name
    dumbbell.data.name = f"{name}_mesh"
    for polygon in dumbbell.data.polygons:
        polygon.use_smooth = True
    dumbbell["olympus_asset"] = True
    dumbbell["olympus_role"] = "dumbbell"
    return dumbbell


def attach_dumbbells(rig: bpy.types.Object) -> list[bpy.types.Object]:
    scene = bpy.context.scene
    original_frame = scene.frame_current
    dumbbells: list[bpy.types.Object] = []
    for suffix in ("l", "r"):
        dumbbell = create_dumbbell_mesh(f"olympus_dumbbell_{suffix}")
        dumbbell.parent = rig
        dumbbell.parent_type = "OBJECT"
        dumbbell.matrix_parent_inverse.identity()
        # Both handles stay parallel to the athlete's shoulder axis. Their
        # positions are sampled from the hand bones below, without inheriting
        # the mirrored hand rotations that previously twisted one dumbbell.
        dumbbell.rotation_mode = "XYZ"
        dumbbell.rotation_euler = (0.0, math.radians(90.0), 0.0)

        dumbbell.animation_data_create()
        action = bpy.data.actions.new(f"dumbbell-floor-press-{suffix}")
        action.use_fake_user = True
        dumbbell.animation_data.action = action
        for frame in range(scene.frame_start, scene.frame_end + 1):
            scene.frame_set(frame)
            bpy.context.view_layer.update()
            hand = rig.pose.bones[f"hand_{suffix}"]
            hand_direction = (hand.tail - hand.head).normalized()
            dumbbell.location = hand.tail + hand_direction * 0.075
            dumbbell.keyframe_insert(data_path="location", frame=frame)

        if dumbbell.animation_data and dumbbell.animation_data.action:
            for fcurve in dumbbell.animation_data.action.fcurves:
                for point in fcurve.keyframe_points:
                    point.interpolation = "BEZIER"
        dumbbells.append(dumbbell)
    scene.frame_set(original_frame)
    return dumbbells


def export_glb(output: Path, rig: bpy.types.Object) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.object.select_all(action="DESELECT")

    export_objects = [obj for obj in bpy.context.scene.objects if obj.get("olympus_asset")]
    for obj in export_objects:
        obj.hide_render = False
        obj.hide_viewport = False
        obj.select_set(True)
    bpy.context.view_layer.objects.active = rig

    available = set(bpy.ops.export_scene.gltf.get_rna_type().properties.keys())
    requested = {
        "filepath": str(output),
        "export_format": "GLB",
        "use_selection": True,
        "export_animations": True,
        # Merge the rig and the two animated dumbbell objects into one clip.
        "export_animation_mode": "ACTIVE_ACTIONS",
        "export_nla_strips_merged_animation_name": "dumbbell-floor-press",
        "export_frame_range": True,
        "export_force_sampling": True,
        "export_apply": True,
        "export_yup": True,
        "export_def_bones": True,
        "export_optimize_animation_size": True,
        "export_optimize_animation_keep_anim_armature": True,
        "export_optimize_animation_keep_anim_object": False,
        "export_image_format": "AUTO",
        "export_jpeg_quality": 82,
        "export_materials": "EXPORT",
    }
    kwargs = {key: value for key, value in requested.items() if key in available}
    bpy.ops.export_scene.gltf(**kwargs)
    print(f"OLYMPUS_GLTF_OUTPUT={output}")
    print(f"OLYMPUS_GLTF_BYTES={output.stat().st_size}")


def look_at(obj: bpy.types.Object, target: Vector) -> None:
    obj.rotation_euler = (target - obj.location).to_track_quat("-Z", "Y").to_euler()


def setup_preview_scene() -> tuple[bpy.types.Object, bpy.types.Object]:
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE_NEXT"
    scene.render.resolution_x = 960
    scene.render.resolution_y = 600
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.film_transparent = False
    scene.render.image_settings.color_mode = "RGBA"
    scene.view_settings.look = "AgX - Medium High Contrast"

    scene.world.color = (0.003, 0.004, 0.006)
    scene.world.use_nodes = True
    background = scene.world.node_tree.nodes.get("Background")
    if background:
        background.inputs["Color"].default_value = (0.002, 0.003, 0.005, 1.0)
        background.inputs["Strength"].default_value = 0.11

    floor_material = make_material("olympus_preview_floor", (0.012, 0.014, 0.018, 1.0), roughness=0.82)
    bpy.ops.mesh.primitive_plane_add(size=8.0, location=(0.0, 0.8, 0.0))
    floor = bpy.context.object
    floor.name = "preview_floor"
    replace_materials(floor, floor_material)

    bpy.ops.object.camera_add(location=(3.35, -2.25, 1.75))
    camera = bpy.context.object
    camera.data.lens = 62
    camera.data.sensor_width = 36
    look_at(camera, Vector((0.0, -0.02, 0.43)))
    scene.camera = camera

    def area_light(
        name: str,
        location: tuple[float, float, float],
        energy: float,
        color: tuple[float, float, float],
        size: float,
    ) -> None:
        data = bpy.data.lights.new(name=name, type="AREA")
        data.energy = energy
        data.color = color
        data.shape = "DISK"
        data.size = size
        obj = bpy.data.objects.new(name, data)
        bpy.context.collection.objects.link(obj)
        obj.location = location
        look_at(obj, Vector((0.0, 0.85, 0.45)))

    area_light("preview_key", (2.4, -0.7, 3.2), 620, (1.0, 0.78, 0.50), 2.2)
    area_light("preview_fill", (-2.0, 0.3, 1.8), 380, (0.40, 0.58, 1.0), 2.0)
    area_light("preview_rim", (-0.5, 2.8, 2.5), 520, (1.0, 0.55, 0.20), 1.6)
    return camera, floor


def clear_preview_scene() -> None:
    """Remove render-only objects so they can never leak into the GLB."""
    for obj in list(bpy.context.scene.objects):
        if obj.name.startswith("preview_"):
            bpy.data.objects.remove(obj, do_unlink=True)


def render_standing_previews(preview_dir: Path) -> None:
    """Render the unposed athlete from useful validation angles."""
    preview_dir.mkdir(parents=True, exist_ok=True)
    highlight_objects = [
        obj
        for obj in bpy.context.scene.objects
        if str(obj.get("olympus_role", "")).startswith("highlight_")
    ]
    for obj in highlight_objects:
        obj.hide_render = True
    camera, _ = setup_preview_scene()
    scene = bpy.context.scene
    scene.render.resolution_x = 720
    scene.render.resolution_y = 900
    camera.data.lens = 62
    target = Vector((0.0, 0.0, 0.94))
    views = (
        ("standing-front", Vector((0.0, -4.25, 1.00))),
        ("standing-three-quarter", Vector((3.05, -3.05, 1.04))),
        ("standing-side", Vector((4.25, 0.0, 1.00))),
        ("standing-back", Vector((0.0, 4.25, 1.00))),
    )
    for name, location in views:
        camera.location = location
        look_at(camera, target)
        scene.render.filepath = str(preview_dir / f"{name}.png")
        bpy.ops.render.render(write_still=True)
        print(f"OLYMPUS_PREVIEW={scene.render.filepath}")
    clear_preview_scene()
    for obj in highlight_objects:
        obj.hide_render = False


def render_previews(preview_dir: Path) -> None:
    preview_dir.mkdir(parents=True, exist_ok=True)
    setup_preview_scene()
    scene = bpy.context.scene
    for frame, name in ((1, "floor-press-bottom"), (31, "floor-press-top")):
        scene.frame_set(frame)
        scene.render.filepath = str(preview_dir / f"{name}.png")
        bpy.ops.render.render(write_still=True)
        print(f"OLYMPUS_PREVIEW={scene.render.filepath}")


def main() -> None:
    args = parse_args()
    asset_root = args.asset_root.resolve()
    output = args.output.resolve()
    preview_dir = args.preview_dir.resolve()
    if not asset_root.is_dir():
        raise FileNotFoundError(f"MakeHuman asset root not found: {asset_root}")

    reset_scene()
    human = HumanService.create_human(feet_on_ground=True)
    configure_body_shape(human)
    rig = HumanService.add_builtin_rig(human, "game_engine")
    load_character_assets(human, rig, asset_root, output.parent)
    if not args.skip_previews:
        render_standing_previews(preview_dir)
    build_floor_press_animation(rig)
    attach_dumbbells(rig)
    export_glb(output, rig)
    if not args.skip_previews:
        render_previews(preview_dir)

    blend_path = output.with_suffix(".blend")
    bpy.ops.wm.save_as_mainfile(filepath=str(blend_path), compress=True)
    print(f"OLYMPUS_BLEND_OUTPUT={blend_path}")


if __name__ == "__main__":
    main()
