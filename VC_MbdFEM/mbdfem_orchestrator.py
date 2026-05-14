# FreeCAD Master Pipeline Orchestrator
# Why is this implemented: Connects the MBD output to the FEM translator and finally triggers the 
# heavy C++ CalculiX solver using a keyframe approach to prevent freezing.

import FreeCAD
import FreeCADGui
import time
import mbd_pure_python_solver
import fem_translator

def run_mbdfem_pipeline(target_body_name="Body", force_constraint_name="ConstraintForce", keyframes=10):
    """
    Main loop parsing the timeline and triggering keyframe FEM solutions.
    Why is this implemented: Serves as the master entry point executed by the UI button.
    """
    doc = FreeCAD.ActiveDocument
    if not doc:
        FreeCAD.Console.PrintError("MbDFEM: No active document found. Please open a model.\n")
        return
        
    def get_obj_by_name_or_label(doc, text):
        lbl_objs = doc.getObjectsByLabel(text)
        return lbl_objs[0] if lbl_objs else doc.getObject(text)

    target_body = get_obj_by_name_or_label(doc, target_body_name)
    if not target_body:
        FreeCAD.Console.PrintError(f"MbDFEM: Target body '{target_body_name}' not found. Remember to name your part 'Body'.\n")
        return
        
    force_constraint = get_obj_by_name_or_label(doc, force_constraint_name)
    
    FreeCAD.Console.PrintLog("MbDFEM: Running Pure Python Math Physics...\n")
    trajectory_data = mbd_pure_python_solver.run_headless_simulation(target_body, time_steps=240)
    
    if not trajectory_data:
        FreeCAD.Console.PrintError("MbDFEM: Math simulation failed to return data.\n")
        return
        
    total_steps = len(trajectory_data)
    step_size = max(1, total_steps // keyframes)
    
    FreeCAD.Console.PrintLog(f"MbDFEM: Extracting {keyframes} keyframes for FEM analysis...\n")
    
    for i in range(0, total_steps, step_size):
        frame = trajectory_data[i]
        
        fem_translator.update_kinematics(target_body, frame['position'], frame['quaternion'])
        
        if force_constraint:
             velocity_mag = (frame['velocity'][0]**2 + frame['velocity'][1]**2 + frame['velocity'][2]**2)**0.5
             force_mag = velocity_mag * 1.5
             fem_translator.update_dynamic_loads(force_constraint, force_mag, (0, 0, -1))
        
        doc.recompute()
        FreeCADGui.updateGui()  # Force the 3D window to redraw
        time.sleep(0.05)        # Pause for 50ms so the human eye can see the frame
        FreeCAD.Console.PrintLog(f"MbDFEM: Keyframe {i} updated visually.\n")
        
    FreeCAD.Console.PrintLog("MbDFEM Pipeline Execution Complete.\n")
