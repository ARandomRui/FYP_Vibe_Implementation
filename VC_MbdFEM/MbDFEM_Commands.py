# FreeCAD MbDFEM Commands
# Why is this implemented: FreeCAD Gui commands represent buttons the user can click.
# This binds the UI click to our actual python orchestrator scripts.

import FreeCAD
import FreeCADGui

class CmdMbdFemSolve:
    """Command to execute the PyBullet MbD and Keyframe FEM workflow"""
    
    def GetResources(self):
        # Why is this implemented: Defines how the button looks in the toolbar.
        return {'Pixmap'  : 'Std_Tool1', # Using a default standard icon for now
                'MenuText': "Run MbD-FEM Orchestrator",
                'ToolTip' : "Starts the PyBullet physics and CalculiX stress simulation loop."}
                
    def Activated(self):
        # Why is this implemented: Triggered when the user clicks the button.
        FreeCAD.Console.PrintLog("MbDFEM Orchestrator started...\n")
        try:
            import mbdfem_orchestrator
            mbdfem_orchestrator.run_mbdfem_pipeline()
            FreeCAD.Console.PrintLog("MbDFEM Orchestrator completed successfully.\n")
        except Exception as e:
            FreeCAD.Console.PrintError(f"MbDFEM Execution Failed: {str(e)}\n")

# Register command with FreeCAD
FreeCADGui.addCommand('MbDFEM_RunSolver', CmdMbdFemSolve())
