/**
 * Converter Tab Component
 * Why is this implemented: Separate UI purely for unit conversions, ensuring separation of concerns from the math functionality.
 */
import React, { useState } from 'react';
import { unitCategories, convert } from './unitConversions';

export default function ConverterTab() {
    const [inputValue, setInputValue] = useState("");
    const [type, setType] = useState("mi_km");
    const [category, setCategory] = useState("length");

    // Re-evaluate conversions dynamically when inputs change
    const result = inputValue ? convert(inputValue, type) : "0";

    const handleCategoryChange = (cat) => {
        setCategory(cat);
        setType(unitCategories[cat][0].id); // reset type to first available
        setInputValue("");
    };

    return (
        <div className="converter-tab">
             <div className="glass-effect input-group">
                 <label>Category</label>
                 <select value={category} onChange={e => handleCategoryChange(e.target.value)}>
                     <option value="length">Length</option>
                     <option value="temperature">Temperature</option>
                 </select>
             </div>

             <div className="glass-effect input-group">
                 <label>Conversion Type</label>
                 <select value={type} onChange={e => setType(e.target.value)}>
                     {unitCategories[category].map(c => (
                         <option key={c.id} value={c.id}>{c.label}</option>
                     ))}
                 </select>
             </div>

             <div className="glass-effect input-group">
                 <label>Value</label>
                 <input 
                     type="number" 
                     value={inputValue} 
                     onChange={e => setInputValue(e.target.value)} 
                     placeholder="Enter amount..."
                     className="conv-input"
                 />
             </div>

             <div className="display-area convert-result glass-effect">
                  <div className="res-label">Result</div>
                  <div className="res-value">{result}</div>
             </div>
        </div>
    );
}
