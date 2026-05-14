# FreeCAD MbD-FEM Integration Workbench (PyBullet Architecture)

## Goal Description
Develop a custom FreeCAD workbench ("workspace") module that integrates Multibody Dynamics (MbD) and the Finite Element Method (FEM). This specific implementation architecture replaces the custom mathematical physics loop with **PyBullet**, an industry-standard, generalized rigid-body physics engine. This enables automatic handling of complex 3D collisions, gravity, and N-Degree-of-Freedom joints without manually writing rigid-body equations.

## User Review Required
> [!IMPORTANT]
> **Dependency Requirement:** Using PyBullet requires that you install PyBullet into your FreeCAD's local Python environment (`pip install pybullet`). If FreeCAD cannot find this dependency, the workbench will fail to load. Do you want me to write an automatic dependency-checking script inside `Init.py` that alerts the user if it's missing?

## Proposed Changes

### Workbench Structure
We will create a standard FreeCAD module structure under `VC_MbdFEM/`:

#### [NEW] `Init.py` & `InitGui.py`
Standard FreeCAD initialization files. `InitGui.py` will build the Workbench toolbar. We will add a dependency check in `Init.py` to ensure `import pybullet` succeeds.

#### [NEW] `MbDFEM_Commands.py`
Creates FreeCAD command classes (e.g., `CmdMbdFemSolve`) linking UI buttons to the Python background scripts.

#### [NEW] `mbd_pybullet_solver.py` (Replaces `mbd_solver.py`)
This script will initialize a Headless (background) PyBullet simulation server (`p.connect(p.DIRECT)`).
*   **Geometry Hand-off:** It will read the FreeCAD Assembly (or Part) data, translating the 3D meshes into PyBullet collision shapes (`p.createCollisionShape(p.GEOM_MESH, ...)`).
*   **Physics Loop:** It will run `p.stepSimulation()` over a defined timeline.
*   **Sensor Polling:** It will use `p.getJointState()` frame-by-frame to extract the exact $X/Y/Z$ reaction forces and rotational position of the joints and store them in a time array.

#### [NEW] `fem_translator.py`
Translates the PyBullet output arrays (position matrix and joint reaction forces) into dynamic FreeCAD `ConstraintForce` objects. It physically manipulates the FreeCAD scene to match the PyBullet timeline for visualization and FEM preparation.

#### [NEW] `mbdfem_orchestrator.py`
The master overarching loop. It calls `mbd_pybullet_solver` to get the force/space arrays, then iterates through those arrays frame-by-frame, telling `fem_translator` to update the document, and finally triggers FreeCAD's native `ObjectsFem.makeSolverCalculix` silently to analyze the stress states.

## Open Questions

> [!WARNING]
> 1. **URDF Exporting vs Direct Mesh Translation:** FreeCAD meshes can be easily sent to PyBullet by exporting a `.urdf` file temporarily, OR we can programmatically read the vertices in FreeCAD and send them to PyBullet memory. Which method do you prefer for passing the 3D shapes from FreeCAD to the Physics Engine?
> 2. Are you comfortable running the `pip install pybullet` command on your FreeCAD python console to support this architecture?

## Verification Plan

### Automated Tests
- Import of `mbd_pybullet_solver.py` standalone to confirm it can spin up a Headless server without launching FreeCAD's GUI.

### Manual Verification
- Dropping the code into the `Mod` folder.
- Confirming PyBullet loads without throwing dependency errors on the console.
