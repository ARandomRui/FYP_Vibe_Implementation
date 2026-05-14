# FreeCAD 1.0 Compatibility Rework Plan

## Goal Description
Rework the current `VC_MbdFEM` workbench to fully comply with FreeCAD 1.0 stricter addon standards as detailed in the internal Creation Guide, ensuring it loads successfully without silent errors.

## User Review Required
> [!IMPORTANT]
> The biggest blocker in FreeCAD 1.0 is the missing `package.xml` requirement. If this file isn't present and formatted correctly, FreeCAD ignores the workbench. This plan resolves that immediately.

## Proposed Changes

### Workbench Structure (`VC_MbdFEM/`)

#### [NEW] `package.xml`
Generate a FreeCAD 1.0 compliant `package.xml` file. It will define the addon type as a Workbench, specify the `MbdFemWorkbench` class, and provide metadata ensuring the FreeCAD Addon Manager detects it instantly without manual developer-mode configurations.

#### [MODIFY] `InitGui.py`
Update the `MbdFemWorkbench` class structure to protect against FreeCAD 1.0's dynamic loading scope issues described in the guide.
- We will add an `@property` for the `Icon` path.
- We will use the safe `__file__` detection mechanisms so that if you ever drop an `.svg` icon into a `Resources/icons` folder later, the script won't crash on startup.

## Open Questions
> [!WARNING]
> None at this stage. These fixes are purely to prevent FreeCAD from ignoring the code you just asked to test.

## Verification Plan

### Automated Tests
- Syntax check.
### Manual Verification
- You will move the folder to the `Mod` path.
- The `MbDFEM PyBullet` option should aggressively show up in the Workbench selector, as FreeCAD's native C++ scanner will now see the `package.xml`.
