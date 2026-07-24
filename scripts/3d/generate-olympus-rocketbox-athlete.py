"""Build the licensed Olympus AI athlete from Microsoft Rocketbox.

The source FBX/textures are authoring inputs and are not committed. Download
Sports_Male_04 from Microsoft-Rocketbox, run prepare-rocketbox-textures.mjs,
then execute this script with Blender 4.5+.
"""
from __future__ import annotations

import argparse
import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
DEFAULT_SOURCE = ROOT / ".tools/rocketbox/Sports_Male_04"
DEFAULT_OUTPUT = ROOT / "tmp/rocketbox-build/olympus-athlete.glb"
DEFAULT_PREVIEWS = ROOT / "tmp/rocketbox-build/previews"
GOLD = (0.92, 0.58, 0.08, 1)
BLUE = (0.04, 0.42, 1.0, 0.48)


def args():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument("--source-dir", type=Path, default=DEFAULT_SOURCE)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--preview-dir", type=Path, default=DEFAULT_PREVIEWS)
    parser.add_argument("--skip-previews", action="store_true")
    return parser.parse_args(argv)


def reset():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for action in list(bpy.data.actions):
        bpy.data.actions.remove(action)


def principled_material(name, color, roughness=.55, metallic=0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = color
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
    return mat


def textured_material(name, color_path, normal_path):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nodes, links = mat.node_tree.nodes, mat.node_tree.links
    bsdf = nodes.get("Principled BSDF")
    bsdf.inputs["Roughness"].default_value = .58
    color = nodes.new("ShaderNodeTexImage")
    color.image = bpy.data.images.load(str(color_path), check_existing=True)
    color.image.pack()
    links.new(color.outputs["Color"], bsdf.inputs["Base Color"])
    normal = nodes.new("ShaderNodeTexImage")
    normal.image = bpy.data.images.load(str(normal_path), check_existing=True)
    normal.image.colorspace_settings.name = "Non-Color"
    normal.image.pack()
    normal_map = nodes.new("ShaderNodeNormalMap")
    normal_map.inputs["Strength"].default_value = .55
    links.new(normal.outputs["Color"], normal_map.inputs["Color"])
    links.new(normal_map.outputs["Normal"], bsdf.inputs["Normal"])
    return mat


def highlight_material(name, color):
    mat = principled_material(name, color, .34)
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Alpha"].default_value = color[3]
    bsdf.inputs["Emission Color"].default_value = color
    bsdf.inputs["Emission Strength"].default_value = .45
    mat.surface_render_method = "DITHERED"
    return mat


def muscularize(mesh):
    """A conservative proportional enhancement; clothes remain attached."""
    inv = mesh.matrix_world.inverted()
    pelvis = Vector((0, 0, .895))
    groups = mesh.vertex_groups
    def weight(vertex, names):
        value = 0.0
        for membership in vertex.groups:
            if groups[membership.group].name in names:
                value = max(value, membership.weight)
        return value
    limb_groups = {
        "Bip01 L UpperArm", "Bip01 R UpperArm", "Bip01 L Forearm", "Bip01 R Forearm",
        "Bip01 L Thigh", "Bip01 R Thigh", "Bip01 L Calf", "Bip01 R Calf",
    }
    for vertex in mesh.data.vertices:
        world = mesh.matrix_world @ vertex.co
        w = weight(vertex, limb_groups)
        if w > .08:
            # Broaden around the body's vertical axis without changing height.
            world.x *= 1 + .08 * w
            world.y += (world.y - pelvis.y) * .045 * w
        if 1.13 < world.z < 1.47:
            chest = weight(vertex, {"Bip01 Spine1", "Bip01 Spine2", "Bip01 L Clavicle", "Bip01 R Clavicle"})
            world.x *= 1 + .075 * chest
            world.y += (world.y - .015) * .05 * chest
        vertex.co = inv @ world


def normalize_rig(source_rig, mesh):
    """Remove FBX axis/scale offsets while retaining names and skin weights."""
    pelvis_world = source_rig.matrix_world @ source_rig.data.bones["Bip01 Pelvis"].head_local
    source_world = source_rig.matrix_world.copy()
    mesh_world = mesh.matrix_world.copy()

    arm_data = bpy.data.armatures.new("olympus_athlete_skeleton")
    rig = bpy.data.objects.new("olympus_athlete_rig", arm_data)
    bpy.context.collection.objects.link(rig)
    bpy.context.view_layer.objects.active = rig
    rig.select_set(True)
    bpy.ops.object.mode_set(mode="EDIT")
    created = {}
    for bone in source_rig.data.bones:
        edit = arm_data.edit_bones.new(bone.name)
        edit.head = source_world @ bone.head_local - pelvis_world
        edit.tail = source_world @ bone.tail_local - pelvis_world
        if (edit.tail-edit.head).length < .015:
            edit.tail = edit.head + Vector((0, 0, .03))
        edit.use_deform = bone.use_deform
        created[bone.name] = edit
    for bone in source_rig.data.bones:
        if bone.parent:
            created[bone.name].parent = created[bone.parent.name]
    bpy.ops.object.mode_set(mode="OBJECT")

    # Bake the source object's transforms into the mesh vertices.
    # Rocketbox stores mesh coordinates in centimetres while its FBX armature
    # is imported in metres. Bake the centimetre conversion explicitly.
    for vertex in mesh.data.vertices:
        vertex.co = (mesh_world @ vertex.co) * .01 - pelvis_world
    mesh.parent = None
    mesh.matrix_world.identity()
    for modifier in list(mesh.modifiers):
        if modifier.type == "ARMATURE":
            mesh.modifiers.remove(modifier)
    modifier = mesh.modifiers.new("Olympus skeleton", "ARMATURE")
    modifier.object = rig
    mesh.parent = rig
    mesh.matrix_parent_inverse.identity()
    mesh.location = (0, 0, 0)
    mesh.rotation_euler = (0, 0, 0)
    mesh.scale = (1, 1, 1)
    bpy.data.objects.remove(source_rig, do_unlink=True)
    return rig


def overlay_from_groups(mesh, name, group_names, material):
    group_indices = {g.index for g in mesh.vertex_groups if g.name in group_names}
    selected = set()
    for v in mesh.data.vertices:
        if any(g.group in group_indices and g.weight > .28 for g in v.groups):
            selected.add(v.index)
    polygons = [p for p in mesh.data.polygons if sum(i in selected for i in p.vertices) >= 2]
    used = sorted({i for p in polygons for i in p.vertices})
    remap = {old: new for new, old in enumerate(used)}
    verts = [mesh.data.vertices[i].co + mesh.data.vertices[i].normal * .002 for i in used]
    faces = [[remap[i] for i in p.vertices] for p in polygons]
    data = bpy.data.meshes.new(name + "_mesh")
    data.from_pydata(verts, [], faces)
    data.materials.append(material)
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    for source_group in mesh.vertex_groups:
        target_group = obj.vertex_groups.new(name=source_group.name)
        for old_index in used:
            memberships = mesh.data.vertices[old_index].groups
            found = next((g.weight for g in memberships if g.group == source_group.index), 0)
            if found:
                target_group.add([remap[old_index]], found, "REPLACE")
    armature = next((m.object for m in mesh.modifiers if m.type == "ARMATURE"), None)
    if armature:
        modifier = obj.modifiers.new("Olympus skeleton", "ARMATURE")
        modifier.object = armature
        obj.parent = mesh.parent
        obj.matrix_parent_inverse = mesh.matrix_parent_inverse.copy()
        obj.location = mesh.location
        obj.rotation_euler = mesh.rotation_euler
        obj.scale = mesh.scale
    obj["olympus_asset"] = True
    return obj


def add_dumbbell(name, material):
    parts = []
    for radius, depth, x in ((.024, .27, 0), (.105, .045, -.13), (.105, .045, .13)):
        bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=radius, depth=depth)
        part = bpy.context.object
        part.rotation_euler[1] = math.radians(90)
        part.location.x = x
        bpy.ops.object.transform_apply(location=False, rotation=True, scale=False)
        parts.append(part)
    bpy.ops.object.select_all(action="DESELECT")
    for part in parts: part.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    bpy.ops.object.join()
    obj = bpy.context.object
    obj.name = name
    obj.data.materials.append(material)
    obj["olympus_asset"] = True
    return obj


def animate(rig, dumbbells):
    scene = bpy.context.scene
    scene.frame_start, scene.frame_end, scene.render.fps = 1, 61, 60
    rig.name = "olympus_athlete_rig"
    rig["olympus_asset"] = True
    controller = bpy.data.objects.new("olympus_exercise_root", None)
    bpy.context.collection.objects.link(controller)
    controller["olympus_asset"] = True
    controller.location = (0, 0, .895)
    rig.parent = controller
    rig.matrix_parent_inverse = controller.matrix_world.inverted()
    controller.rotation_mode = "XYZ"
    controller.rotation_euler = (math.radians(90), 0, 0)
    controller.location.z = .20
    controller.keyframe_insert("rotation_euler", frame=1)
    controller.keyframe_insert("location", frame=1)

    # Anatomically placed hand targets; IK computes shoulder/elbow articulation.
    targets = []
    for side, sign in (("L", 1), ("R", -1)):
        hand = bpy.data.objects.new(f"olympus_hand_target_{side}", None)
        pole = bpy.data.objects.new(f"olympus_elbow_pole_{side}", None)
        bpy.context.collection.objects.link(hand); bpy.context.collection.objects.link(pole)
        targets += [hand, pole]
        pole.location = (sign * .65, -1.15, .30)
        hand_bone = rig.pose.bones[f"Bip01 {side} Hand"]
        ik = hand_bone.constraints.new("IK")
        ik.target, ik.pole_target, ik.chain_count = hand, pole, 3
        ik.pole_angle = math.radians(90 if side == "L" else -90)
        for frame, pos in ((1, (sign*.38, -1.15, .48)), (31, (sign*.25, -1.15, 1.02)), (61, (sign*.38, -1.15, .48))):
            hand.location = pos
            hand.keyframe_insert("location", frame=frame)

        db = dumbbells[0 if side == "L" else 1]
        for frame, pos in ((1, (sign*.38, -1.15, .48)), (31, (sign*.25, -1.15, 1.02)), (61, (sign*.38, -1.15, .48))):
            db.location = pos
            db.keyframe_insert("location", frame=frame)

    bpy.context.view_layer.objects.active = rig
    rig.select_set(True)
    bpy.ops.object.mode_set(mode="POSE")
    bpy.ops.pose.select_all(action="SELECT")
    bpy.ops.nla.bake(frame_start=1, frame_end=61, step=1, visual_keying=True,
                     clear_constraints=True, use_current_action=True, bake_types={"POSE"})
    bpy.ops.object.mode_set(mode="OBJECT")
    rig.animation_data.action.name = "dumbbell-floor-press"
    rig.animation_data.action.use_fake_user = True
    # Re-sample the baked wrists so each handle remains physically inside the
    # corresponding hand throughout the repetition.
    for side, db in (("L", dumbbells[0]), ("R", dumbbells[1])):
        if db.animation_data:
            db.animation_data_clear()
        db.animation_data_create()
        db_action = bpy.data.actions.new(f"dumbbell-floor-press-{side.lower()}")
        db_action.use_fake_user = True
        db.animation_data.action = db_action
        for frame in range(scene.frame_start, scene.frame_end + 1):
            scene.frame_set(frame)
            bpy.context.view_layer.update()
            wrist = rig.matrix_world @ rig.pose.bones[f"Bip01 {side} Hand"].head
            db.location = wrist
            db.keyframe_insert("location", frame=frame)
    for target in targets: bpy.data.objects.remove(target, do_unlink=True)


def setup_render():
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE_NEXT"
    scene.render.resolution_x, scene.render.resolution_y = 960, 600
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.view_settings.look = "AgX - Medium High Contrast"
    scene.world.color = (.003, .003, .004)
    bpy.ops.mesh.primitive_plane_add(size=8, location=(0, .6, 0))
    floor = bpy.context.object
    floor.data.materials.append(principled_material("preview_floor", (.009,.011,.014,1), .78))
    for energy, location, color, size in (
        (1100, (-2,-3,3.3), (1,.55,.18), 3),
        (900, (2,-1,3.7), (.25,.38,1), 3),
        (700, (0,3,4), (1,.9,.68), 2),
    ):
        data = bpy.data.lights.new("preview_light", "AREA")
        data.energy, data.color, data.shape, data.size = energy, color, "DISK", size
        obj = bpy.data.objects.new("preview_light", data)
        bpy.context.collection.objects.link(obj); obj.location = location
        obj.rotation_euler = ((Vector((0,0,.8))-obj.location).to_track_quat("-Z","Y").to_euler())
    cam_data = bpy.data.cameras.new("preview_camera")
    cam = bpy.data.objects.new("preview_camera", cam_data)
    bpy.context.collection.objects.link(cam); scene.camera = cam
    cam_data.lens = 58
    return cam


def point_camera(cam, location, target):
    cam.location = location
    cam.rotation_euler = (Vector(target)-cam.location).to_track_quat("-Z","Y").to_euler()


def render_previews(rig, overlays, directory):
    directory.mkdir(parents=True, exist_ok=True)
    cam = setup_render()
    scene = bpy.context.scene
    # A separate rest-pose preview is deliberately omitted: the shipped
    # asset opens directly in its exercise pose, which is what users see.
    for obj in overlays: obj.hide_render = False
    for frame, name in ((1,"floor-press-bottom"),(31,"floor-press-top")):
        scene.frame_set(frame)
        point_camera(cam, (2.0,-3.5,1.35), (0,-1.0,.55))
        scene.render.filepath = str(directory / f"{name}.png")
        bpy.ops.render.render(write_still=True)


def export(output, rig):
    output.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.object.select_all(action="DESELECT")
    for obj in bpy.context.scene.objects:
        if obj.get("olympus_asset"):
            obj.hide_render = obj.hide_viewport = False
            obj.select_set(True)
    bpy.context.view_layer.objects.active = rig
    available = set(bpy.ops.export_scene.gltf.get_rna_type().properties.keys())
    requested = dict(filepath=str(output), export_format="GLB", use_selection=True,
        export_animations=True, export_animation_mode="ACTIVE_ACTIONS",
        export_nla_strips_merged_animation_name="dumbbell-floor-press",
        export_frame_range=True, export_force_sampling=True, export_apply=True,
        export_yup=True, export_def_bones=True, export_optimize_animation_size=True,
        export_image_format="AUTO", export_jpeg_quality=82)
    bpy.ops.export_scene.gltf(**{k:v for k,v in requested.items() if k in available})
    print(f"OLYMPUS_GLTF_OUTPUT={output}\nOLYMPUS_GLTF_BYTES={output.stat().st_size}")


def main():
    cfg = args()
    fbx = cfg.source_dir / "Sports_Male_04.fbx"
    prepared = cfg.source_dir / "prepared"
    for path in (fbx, prepared/"olympus-body-color.png", prepared/"olympus-head-color.png"):
        if not path.is_file(): raise FileNotFoundError(path)
    reset()
    bpy.ops.import_scene.fbx(filepath=str(fbx), use_image_search=False)
    source_rig = next(o for o in bpy.context.scene.objects if o.type == "ARMATURE")
    mesh = next(o for o in bpy.context.scene.objects if o.type == "MESH")
    rig = source_rig
    mesh.name = "olympus_athlete_body"; mesh["olympus_asset"] = True
    muscularize(mesh)
    mesh.data.materials.clear()
    mesh.data.materials.append(textured_material("olympus_body",
        prepared/"olympus-body-color.png", prepared/"olympus-body-normal.png"))
    mesh.data.materials.append(textured_material("olympus_head",
        prepared/"olympus-head-color.png", prepared/"olympus-head-normal.png"))
    primary = overlay_from_groups(mesh, "olympus_highlight_primary",
        {"Bip01 Spine1","Bip01 Spine2","Bip01 L Clavicle","Bip01 R Clavicle"},
        highlight_material("olympus_primary_blue", BLUE))
    secondary = overlay_from_groups(mesh, "olympus_highlight_secondary",
        {"Bip01 L UpperArm","Bip01 R UpperArm"},
        highlight_material("olympus_secondary_gold", (.95,.62,.08,.42)))
    metal = principled_material("olympus_dumbbell_metal", (.055,.062,.075,1), .28, .82)
    dumbbells = [add_dumbbell("olympus_dumbbell_l", metal), add_dumbbell("olympus_dumbbell_r", metal)]
    animate(rig, dumbbells)
    if not cfg.skip_previews: render_previews(rig, [primary,secondary], cfg.preview_dir)
    export(cfg.output, rig)


if __name__ == "__main__":
    main()
