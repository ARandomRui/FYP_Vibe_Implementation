import React, { useState } from 'react';
import './index.css';
import CalculatorTab from './CalculatorTab';
import ConverterTab from './ConverterTab';

/**
 * Main Application Component
 * Why is this implemented: Orchestrates the tabs between the Calculator and Converter modes, passing NO state to children to strictly uphold separation of concerns.
 */
function App() {
  const [activeTab, setActiveTab] = useState('math');

  return (
    <div className="app-container">
      <div className="glass-panel">
        <div className="tabs">
          <button 
            className={`tab ${activeTab === 'math' ? 'active' : ''}`}
            onClick={() => setActiveTab('math')}
          >
            Math
          </button>
          <button 
            className={`tab ${activeTab === 'converter' ? 'active' : ''}`}
            onClick={() => setActiveTab('converter')}
          >
            Unit Converter
          </button>
        </div>
        
        <div className="tab-content">
          {activeTab === 'math' && <CalculatorTab />}
          {activeTab === 'converter' && <ConverterTab />}
        </div>
      </div>
    </div>
  );
}

export default App;
