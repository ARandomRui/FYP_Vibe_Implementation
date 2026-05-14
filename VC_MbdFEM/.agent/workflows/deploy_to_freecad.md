---
description: Deploy Workbench to FreeCAD Mod Directory
---

**Pre-requisite:** Please Close FreeCAD before running this, otherwise Windows may lock the files.

1. Deploy the code from the Desktop Workspace to the FreeCAD AppData directory.

// turbo
2. Use run_command to execute the Powershell copy hook safely.
```powershell
Copy-Item -Path "c:\Users\Home\Desktop\Vibe Coding FYP\FYP_Vibe_Implementation\VC_MbdFEM\*" -Destination "c:\Users\Home\AppData\Roaming\FreeCAD\Mod\VC_MbdFEM" -Recurse -Force
```
