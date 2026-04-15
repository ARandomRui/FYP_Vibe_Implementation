import { describe, it, expect } from 'vitest';
import { convert, unitCategories } from './unitConversions';

describe('unitConversions logic', () => {
    it('exports correctly structured unit mappings for the UI', () => {
        expect(unitCategories).toHaveProperty('length');
        expect(unitCategories).toHaveProperty('temperature');
        expect(unitCategories.length.length).toBeGreaterThan(0);
    });

    // TC-UNIT-01 & TC-UNIT-02
    it('calculates temperature mapping exactly', () => {
        // Fahrenheit to Celsius
        expect(convert('32', 'f_c')).toBe(0);
        expect(convert('212', 'f_c')).toBe(100);
        
        // Celsius to Fahrenheit
        expect(convert('0', 'c_f')).toBe(32);
        expect(convert('100', 'c_f')).toBe(212);
    });

    // TC-UNIT-03
    it('calculates miles to kilometers distances correctly', () => {
        // 1 Mile is approx 1.60934 Kilometers
        expect(convert('1', 'mi_km')).toBe(1.60934);
        
        // 1.60934 Kilometers mapping cleanly rounds back to 1 Mile
        expect(convert('1.60934', 'km_mi')).toBe(1);
    });

    // TC-UNIT-04
    it('handles empty or broken inputs properly without throwing', () => {
        expect(convert('', 'mi_km')).toBe(0);
        expect(convert('abc', 'mi_km')).toBe(0);
        expect(convert('NaN', 'f_c')).toBe(0);
    });
});
