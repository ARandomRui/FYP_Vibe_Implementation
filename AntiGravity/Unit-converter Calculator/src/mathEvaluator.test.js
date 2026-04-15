import { describe, it, expect } from 'vitest';
import { evaluateExpression } from './mathEvaluator';

describe('mathEvaluator logic', () => {
    
    // TC-MATH-01
    it('evaluates basic arithmetic properly', () => {
        expect(evaluateExpression('5 + 5', 0)).toBe(10);
        expect(evaluateExpression('10 / 2', 0)).toBe(5);
        expect(evaluateExpression('2 * (3 + 4)', 0)).toBe(14);
    });

    // TC-MATH-02
    it('throws mathematical errors appropriately instead of yielding Infinity', () => {
        // Division by zero equates to Infinity, which we catch and throw
        expect(() => evaluateExpression('1 / 0', 0)).toThrow('Math Error');
    });

    // TC-MATH-03
    it('handles floating point precision properly', () => {
        // 0.1 + 0.2 natively equals 0.30000000000000004
        // The evaluateExpression logic forces toFixed(10) cleanup
        expect(evaluateExpression('0.1 + 0.2', 0)).toBe(0.3);
    });

    // TC-MATH-04
    it('sanitizes ANS substitution with negative numbers mapping', () => {
        // Evaluating "5 + -5" blindly via string replacement sometimes causes syntax errors, 
        // the function wraps negatives like "5 + (-5)" implicitly.
        expect(evaluateExpression('5 + ANS', -5)).toBe(0);
        
        // Ensure regular ANS works
        expect(evaluateExpression('ANS * 2', 10)).toBe(20);
    });
    
    it('throws errors on invalid syntax logic', () => {
        expect(() => evaluateExpression('5 + * 2', 0)).toThrow();
        expect(() => evaluateExpression('foo + bar', 0)).toThrow();
    });
});
