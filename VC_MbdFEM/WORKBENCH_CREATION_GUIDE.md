# FreeCAD 1.0 Custom Workbench Creation Guide & Pitfalls

This document details the critical problems encountered and solved when creating a new custom FreeCAD 1.0 Workbench, specifically focusing on the challenges of having the workbench successfully registered and appear in the FreeCAD dropdown menu. Future developers and AIs should reference this to avoid similar issues.

## 1. The `package.xml` Requirement (FreeCAD 1.0+)
In older versions of FreeCAD, you could often just drop a folder with `Init.py` and `InitGui.py` into the `Mod` folder. FreeCAD 1.0's Addon Manager is much stricter.

**The Problem:** FreeCAD will often completely ignore a custom workbench if it lacks a strictly valid `package.xml` file. 
**The Solution:** You must ensure a `package.xml` exists. The easiest way to generate a valid one that FreeCAD 1.0 accepts is from within FreeCAD itself:
1. Go to `Edit -> Preferences -> Addon Manager`.
2. Check `Addon developer mode` and click OK.
3. Go to `Tools -> Addon Manager`.
4. Click `Developer tools...`.
5. Fill out the Addon path and details, and crucially, click the `+` (*Add Content Item*) button at the bottom to define the **Workbench class name** (e.g., `ColorCustomizerWorkbench`) and set the Subdirectory to `./`.
6. Click Save/Install to generate the `package.xml` and register it.

## 2. Portable Versions & The `Mod` Folder Path
**The Problem:** If you are using a portable version (like Conda Portable), FreeCAD often ignores the standard system `AppData/Roaming/FreeCAD/Mod` path entirely, making it seem like your workbench is broken.
**The Solution:** To find the *exact* folder your specific FreeCAD instance is reading:
1. Open the FreeCAD **Python console** (`View -> Panels -> Python console`).
2. Run: `import FreeCAD; print(FreeCAD.getUserAppDataDir() + "Mod")`
3. You **must** place your workbench folder exactly in that printed directory.

## 3. The Missing `__file__` Variable in `InitGui.py`
**The Problem:** When FreeCAD 1.0 dynamically loads your `InitGui.py` script on startup, it frequently executes it using `exec()` *without* injecting the standard Python `__file__` global variable. If your workbench tries to find its icon using `os.path.dirname(__file__)`, the entire `InitGui.py` script will crash silently on startup and the workbench will never load.

**The Solution:** Use a safe fallback mechanism to determine the module directory.
```python
# Unsafe (crashes in FreeCAD 1.0 dynamic loading):
mod_dir = os.path.dirname(__file__)

# Safe:
if '__file__' in globals():
    mod_dir = os.path.dirname(os.path.abspath(__file__))
else:
    mod_dir = os.path.dirname(os.path.abspath('__file__')) # Fallback
    
# Further safety fallback if needed:
if not os.path.exists(os.path.join(mod_dir, "Resources", "icons", "MyIcon.svg")):
    mod_dir = os.path.join(FreeCAD.getUserAppDataDir(), "Mod", "MyWorkbenchFolder")
```

## 4. Variable Scoping Inside Workbench Classes
**The Problem:** Even if you define a safe `mod_dir` variable at the top of `InitGui.py`, FreeCAD's dynamic loading can cause that variable to fall out of scope by the time FreeCAD evaluates the class properties (like `Icon`). If you do `Icon = os.path.join(mod_dir, "icon.svg")` inside the class, you might get a `NameError: name 'mod_dir' is not defined` deep in the FreeCAD logs.

**The Solution:** Calculate the paths *inside* a property or method of the class so the evaluation happens safely when FreeCAD requests it, rather than at class-definition time.

```python
class MyCustomWorkbench(FreeCADGui.Workbench):
    MenuText = "My Workbench"
    
    # Don't do this:
    # Icon = os.path.join(mod_dir, "icon.svg")
    
    # Do this:
    @property
    def Icon(self):
        _dir = os.path.dirname(os.path.abspath(__file__)) if '__file__' in globals() else os.path.dirname(os.path.abspath('__file__'))
        if not os.path.exists(os.path.join(_dir, "Resources", "icons", "MyIcon.svg")):
            _dir = os.path.join(FreeCAD.getUserAppDataDir(), "Mod", "MyWorkbenchFolder")
        return os.path.join(_dir, "Resources", "icons", "MyIcon.svg")
```

## 5. Finding Hidden Errors
If your workbench is in the right place but still won't load into the dropdown, it is almost certainly a silent Python syntax/import error in `Init.py` or `InitGui.py`.
1. Make sure `View -> Panels -> Report view` is open.
2. If the Report view is empty, manually execute the init file in the Python console to force it to spit out the traceback:
```python
import sys, os
mod_dir = r"C:\Path\To\Your\Mod\Folder"
sys.path.insert(0, mod_dir)
with open(os.path.join(mod_dir, "InitGui.py")) as f:
    exec(f.read(), globals(), {"__file__": os.path.join(mod_dir, "InitGui.py")})
```
This strategy immediately highlights scoping or missing variable errors that FreeCAD otherwise hides during real startups.
