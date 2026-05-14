# FreeCAD MbDFEM GUI Initialization
# Why is this implemented: To register the custom workbench within the FreeCAD GUI,
# populate the top toolbar, and load our custom execution commands.

import FreeCAD
import FreeCADGui
import os

class MbdFemWorkbench(FreeCADGui.Workbench):
    """Integrates MbD (via Pybullet) with FEM."""
    
    MenuText = "MbDFEM PyBullet"
    ToolTip = "Multibody Dynamics and FEM integration using PyBullet"
    
    @property
    def Icon(self):
        # Why is this implemented: Safe __file__ resolution per FreeCAD 1.0 guide
        # to prevent startup crashes when loading UI icons.
        _dir = os.path.dirname(os.path.abspath(__file__)) if '__file__' in globals() else os.path.dirname(os.path.abspath('__file__'))
        # Return a fallback or actual icon path here when you add an SVG.
        return ""
    
    def Initialize(self):
        # Why is this implemented: Executed when FreeCAD loads the workbench to setup commands.
        import MbDFEM_Commands
        self.appendToolbar("MbDFEM Tools", ["MbDFEM_RunSolver"])
        
    def GetClassName(self):
        return "Gui::PythonWorkbench"

# Register the workbench safely
FreeCADGui.addWorkbench(MbdFemWorkbench())
