# FreeCAD FEM Translator
# Why is this implemented: Connects PyBullet's mathematical array output directly to FreeCAD 
# 3D geometries and Constraint objects so the user can visually see the simulation and FEM can analyze it.

import FreeCAD

def update_kinematics(freecad_obj, pos_tuple, quat_tuple):
    """
    Updates the physical position and rotation of the FreeCAD mesh in the viewer.
    Why is this implemented: Translates Pybullet coordinate system back to FreeCAD Matrix.
    """
    # FreeCAD Rotation takes quaternion as (x, y, z, w) usually.
    # PyBullet returns quaternion as (x, y, z, w).
    rotation = FreeCAD.Rotation(quat_tuple[0], quat_tuple[1], quat_tuple[2], quat_tuple[3])
    vector = FreeCAD.Vector(pos_tuple[0], pos_tuple[1], pos_tuple[2])
    
    new_placement = FreeCAD.Placement(vector, rotation)
    freecad_obj.Placement = new_placement
    
def update_dynamic_loads(constraint_obj, force_magnitude, direction_vector):
    """
    Updates the FreeCAD FEM ConstraintForce object.
    Why is this implemented: Applies the new inertial/dynamic forces required for stress analysis.
    """
    # Force property relies on the user creating a ConstraintForce
    if hasattr(constraint_obj, 'Force'):
        constraint_obj.Force = force_magnitude
    if hasattr(constraint_obj, 'Direction'):
        constraint_obj.Direction = direction_vector
