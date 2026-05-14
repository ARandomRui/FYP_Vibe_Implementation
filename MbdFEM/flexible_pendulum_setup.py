import FreeCAD as App
import Part
import ObjectsFem

def setup_flexible_pendulum():
    """
    Initializes the FEM prototype for the flexible pendulum in FreeCAD.
    We encapsulate this in a function to isolate state and prevent namespace pollution 
    when running this directly in the FreeCAD Python console.
    """
    # Create a new document to hold the pendulum assembly
    doc = App.newDocument("FlexiblePendulumPrototype")
    
    # We use a primitive cylinder because it provides a simple, continuous topological structure 
    # which is ideal for debugging initial mesh generation and constraint placements.
    rod = doc.addObject("Part::Cylinder", "PendulumRod")
    rod.Radius = 5.0    # mm
    rod.Height = 200.0  # mm
    
    # This must be done before attaching any FEM constraints to the rod's faces 
    # to ensure FreeCAD generates the internal ID references (like Face1, Face2).
    doc.recompute()
    
    # The analysis object acts as the root coordinator for the solver, pairing the mesh 
    # with materials, constraints, and the solver settings.
    analysis = ObjectsFem.makeAnalysis(doc, "Analysis")
    
    # We use makeMaterialSolid to assign bulk properties. Wood is technically orthotropic, 
    # but we use isotropic properties here to reduce solver complexity during the initial prototype phase.
    material = ObjectsFem.makeMaterialSolid(doc, "SolidMaterial")
    mat_props = {
        'Name': 'Extreme_Rubber',
        'YoungsModulus': '5 MPa',  # Dropped to near-foam levels so it behaves like a wet noodle!
        'PoissonRatio': '0.3', 
        'Density': '600 kg/m^3'
    }
    material.Material = mat_props
    analysis.addObject(material)
    
    # We fix Face2 (typically one of the caps of the cylinder) to simulate the pivot point 
    # being locked. In later full MbDFEM steps, this will be swapped for a dynamic Revolute joint.
    fixed_constraint = ObjectsFem.makeConstraintFixed(doc, "FixedTop")
    fixed_constraint.References = [(rod, "Face2")]
    analysis.addObject(fixed_constraint)
    
    # We apply gravity perpendicular to the rod's length (X-axis) instead of downwards (Z-axis) 
    # to artificially induce deep bending, ensuring we can immediately verify flexibility.
    gravity = ObjectsFem.makeConstraintSelfWeight(doc, "GravitySideways")
    gravity.GravityDirection = App.Vector(1.0, 0.0, 0.0) 
    gravity.GravityAcceleration = 9810.0 # mm/s^2 (Standard gravity)
    analysis.addObject(gravity)
    
    # We use Gmsh because it is natively built into the FreeCAD 1.0 solver framework and 
    # avoids the external NumPy/'result.npy' dependency errors seen with Netgen in conda environments.
    mesh = ObjectsFem.makeMeshGmsh(doc, "FEMMeshGmsh")
    mesh.Shape = rod
    mesh.CharacteristicLengthMax = 10.0
    analysis.addObject(mesh)
    
    # We add the ccxtools solver. Currently configured for static linear equations to 
    # allow for a fast test. We will transition to non-linear dynamic behavior once the pipeline works.
    solver = ObjectsFem.makeSolverCalculix(doc, "CalculiX_Solver")
    solver.GeometricalNonlinearity = 'linear'
    solver.ThermoMechSteadyState = True
    analysis.addObject(solver)
    
    doc.recompute()
    
    print("===================================================")
    print("Pendulum prototype tree created successfully.")
    print("ACTION REQUIRED:")
    print("1. Select 'FEMMeshGmsh' in the Tree View and click 'Apply/OK' to physically generate the mesh.")
    print("   (Tip: Make sure 'Element Order' is set to '2nd' in the panel to avoid artificial stiffness!)")
    print("2. Double-click 'CalculiX_Solver' and click 'Write .inp file' then 'Run CalculiX' to simulate.")
    print("===================================================")

if __name__ == "__main__":
    setup_flexible_pendulum()
