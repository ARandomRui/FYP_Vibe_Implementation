# Error Log

## Error 5: FreeCAD Graphics Engine Crash (Cyclic Scene Graph)
**Traceback Extract:**
```text
Unhandled Base::Exception caught in GUIApplication::notify.
The error message is: Access violation
SoFCUnifiedSelection.cpp(1299): Cyclic scene graph
```

**Attempted Fix:**
This is a documented graphics rendering bug within the FreeCAD 1.0/Coin3D interface, generally triggered when FreeCAD tries to overlay the newly generated `.frd` physics result map directly on top of a Second-Order (quadratic) tetrahedral mesh or when multiple parent/child objects form a visual loop in the Tree View. 
The physics solver (CalculiX) physically completed the calculation over those 18 seconds, but the display engine crashed attempting to paint the stress colors. 
*Workaround applied (Manual):* Instructed the user to perform the mesh generation using 1st-order elements temporarily, or to aggressively hide the original parts (using Spacebar) prior to checking the results.
