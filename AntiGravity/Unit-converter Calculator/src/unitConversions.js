/**
 * Handles all unit conversion mapping and types.
 * Why is this implemented: To decouple the domain logic of specific unit formulas from the UI components, keeping the codebase manageable as more units are added.
 */
export const unitCategories = {
    length: [
        { id: "mi_km", label: "Miles to Kilometers" },
        { id: "km_mi", label: "Kilometers to Miles" }
    ],
    temperature: [
        { id: "f_c", label: "Fahrenheit to Celsius" },
        { id: "c_f", label: "Celsius to Fahrenheit" }
    ]
};

/**
 * Performs the selected mathematical conversion.
 * Why is this implemented: Consolidates conversion formulas to guarantee consistent application of scales and offsets.
 */
export function convert(value, type) {
    const val = parseFloat(value);
    if (isNaN(val)) return 0;
    
    let result = 0;
    switch (type) {
        case "mi_km":
            result = val * 1.60934;
            break;
        case "km_mi":
            result = val / 1.60934;
            break;
        case "f_c":
            result = ((val - 32) * 5) / 9;
            break;
        case "c_f":
            result = (val * 9) / 5 + 32;
            break;
        default:
            return val;
    }
    // Why: Ensure outputs remain legible for the user rather than producing runaway floats like 33.333333333333336
    return parseFloat(result.toFixed(6));
}
