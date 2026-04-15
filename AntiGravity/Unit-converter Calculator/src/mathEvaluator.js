/**
 * Evaluates a mathematical expression safely.
 * Why is this implemented: We need to parse raw user input and handle the 'ANS' keyword substitution before evaluating, ensuring floating point errors (like 0.1+0.2) are minimized and arbitrary code execution is prevented.
 */
export function evaluateExpression(expr, ansValue) {
    // Why: Prevent injection attacks since we use new Function for evaluation
    const validChars = /^[0-9+\-*/().\sANS]+$/;
    if (!validChars.test(expr)) {
        throw new Error("Invalid characters");
    }
    
    // Why: If previous answer is negative, raw replacement like 5+-2 throws an error, so we wrap it in parentheses.
    const sanitizedAns = ansValue < 0 ? `(${ansValue})` : `${ansValue}`;
    const toEval = expr.replace(/ANS/g, sanitizedAns);
    
    try {
        const result = new Function('return ' + toEval)();
        
        // Why: Standard JS math can result in NaN (0/0) or Infinity (1/0), which breaks the calculator UI
        if (Number.isNaN(result) || !Number.isFinite(result)) {
            throw new Error("Math Error");
        }
        
        // Why: Prevents precision bloat string like 0.30000000000000004
        return parseFloat(result.toFixed(10)); 
    } catch(err) {
        throw new Error("Syntax Error");
    }
}
