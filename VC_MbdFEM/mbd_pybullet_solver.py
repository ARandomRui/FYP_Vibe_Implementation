# PyBullet Multibody Dynamics Solver
# Why is this implemented: Acts as the headless physics engine to calculate the 
# high-speed kinematic trajectory and dynamic forces over time without FreeCAD GUI overhead.

import pybullet as p
import tempfile
import os
import FreeCAD

def run_headless_simulation(freecad_obj, time_steps=240, gravity=-9.81):
    """
    Exports the FreeCAD object to an OBJ, loads it in PyBullet, and runs physics.
    Why is this implemented: PyBullet handles all collision/rigid body math automatically.
    Returns: A list of dicts containing the kinematic state per frame.
    """
    # 1. Connect headless PyBullet
    physicsClient = p.connect(p.DIRECT)
    p.setGravity(0, 0, gravity)
    
    # 2. Export FreeCAD object to temp OBJ for PyBullet to read
    temp_dir = tempfile.gettempdir()
    obj_path = os.path.join(temp_dir, f"{freecad_obj.Name}_temp.obj")
    
    try:
        import Mesh
        Mesh.export([freecad_obj], obj_path)
    except Exception as e:
        FreeCAD.Console.PrintError(f"Could not export Mesh for PyBullet: {str(e)}\n")
        p.disconnect()
        return []
    
    # 3. Create PyBullet Collision Shape
    try:
        collision_shape_id = p.createCollisionShape(shapeType=p.GEOM_MESH, 
                                                    fileName=obj_path)
        
        # Assume 1kg mass for prototype generalizations
        body_id = p.createMultiBody(baseMass=1.0, 
                                    baseCollisionShapeIndex=collision_shape_id,
                                    basePosition=[0, 0, 0])
    except Exception as e:
        FreeCAD.Console.PrintError(f"PyBullet Geometry Binding Failed: {str(e)}\n")
        p.disconnect()
        return []
        
    # 4. Run Physics Loop
    simulation_data = []
    for step in range(time_steps):
        p.stepSimulation()
        
        # Poll state
        pos, quaternion = p.getBasePositionAndOrientation(body_id)
        velocity, angular_velocity = p.getBaseVelocity(body_id)
        
        frame_data = {
            'step': step,
            'position': pos,
            'quaternion': quaternion,
            'velocity': velocity,
            'angular_velocity': angular_velocity
        }
        simulation_data.append(frame_data)
        
    p.disconnect()
    
    # Clean up temp file
    if os.path.exists(obj_path):
        os.remove(obj_path)
        
    return simulation_data
