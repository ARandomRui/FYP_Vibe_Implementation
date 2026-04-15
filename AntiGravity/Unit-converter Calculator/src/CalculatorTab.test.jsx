import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import CalculatorTab from './CalculatorTab';

describe('CalculatorTab - History & ANS State Logic', () => {
    // Helper to press sequence of buttons programmatically
    const pressKeys = (keys) => {
        keys.forEach(k => {
            const btn = screen.getByText(k, { selector: 'button' });
            fireEvent.click(btn);
        });
    };

    beforeEach(() => {
        // Mock scrollIntoView since JSDOM does not natively support layout methods
        window.HTMLElement.prototype.scrollIntoView = vi.fn();
        render(<CalculatorTab />);
    });

    // TC-ANS-01 (Empty Start)
    it('evaluates "ANS * 5 =" natively to 0 when starting fresh', () => {
        pressKeys(['ANS', '*', '5', '=']);
        const currentInput = document.querySelector('.current-input');
        expect(currentInput).toHaveTextContent('0');
    });

    // TC-ANS-02 (History Append)
    it('appends history accurately when ANS chains the equations', () => {
        pressKeys(['5', '+', '5', '=']);
        pressKeys(['ANS', '+', '5', '=']);
        
        const historyLines = document.querySelectorAll('.history-line');
        expect(historyLines.length).toBe(2);
        
        // We use text extraction dynamically based on dom hierarchy
        expect(historyLines[0]).toHaveTextContent('5+5 =');
        expect(historyLines[0]).toHaveTextContent('10');
        expect(historyLines[1]).toHaveTextContent('ANS+5 =');
        expect(historyLines[1]).toHaveTextContent('15');
    });

    // TC-ANS-03 (History Clear)
    it('wipes history seamlessly when a new calculation does not use ANS', () => {
        pressKeys(['5', '+', '5', '=']);
        // Pressing a digit starts a new run and clears history visually until = is hit without ANS
        pressKeys(['6', '+', '6', '=']);
        
        const historyLines = document.querySelectorAll('.history-line');
        expect(historyLines.length).toBe(1);
        expect(historyLines[0]).toHaveTextContent('6+6 =');
        expect(historyLines[0]).toHaveTextContent('12');
    });

    // TC-ANS-04 (Operator Auto-Link)
    it('auto prepends ANS if an operator is touched straight after evaluation', () => {
        pressKeys(['5', '+', '5', '=']);
        pressKeys(['+']); // operator immediately after

        const currentInput = document.querySelector('.current-input');
        expect(currentInput).toHaveTextContent('ANS+');
    });
});

describe('CalculatorTab - History Cascade Editing', () => {
    const pressKeys = (keys) => {
        keys.forEach(k => {
            const btn = screen.getByText(k, { selector: 'button' });
            fireEvent.click(btn);
        });
    };

    beforeEach(() => {
        window.HTMLElement.prototype.scrollIntoView = vi.fn();
        render(<CalculatorTab />);
    });

    // TC-EDIT-01 (UI Activation)
    it('transitions history entry into an input box on click', () => {
        pressKeys(['5', '+', '5', '=']);
        const exprElem = screen.getByText('5+5 =');
        fireEvent.click(exprElem);
        
        // Assert input box renders dynamically
        const input = document.querySelector('.hist-edit-input');
        expect(input).toBeInTheDocument();
        expect(input.value).toBe('5+5');
    });

    // TC-EDIT-02 (Cascade Propagation)
    it('cascades edits downstream sequentially over history', () => {
        pressKeys(['1', '0', '+', '1', '0', '=']); // History 0: 10 + 10 = 20
        pressKeys(['ANS', '/', '2', '=']);       // History 1: ANS / 2 = 10
        
        // Click first entry, change to 100+100=200
        const exprElem = screen.getByText('10+10 =');
        fireEvent.click(exprElem);
        
        const input = document.querySelector('.hist-edit-input');
        fireEvent.change(input, { target: { value: '100+100' } });
        fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
        
        const historyLines = document.querySelectorAll('.history-line');
        // The first modification processes
        expect(historyLines[0]).toHaveTextContent('100+100 =');
        expect(historyLines[0]).toHaveTextContent('200');

        // The downstream ANS computation changed! ANS/2 is now 100 (200 / 2)
        expect(historyLines[1]).toHaveTextContent('ANS/2 =');
        expect(historyLines[1]).toHaveTextContent('100');
        
        // Display active state updates 
        const currentInput = document.querySelector('.current-input');
        expect(currentInput).toHaveTextContent('100');
    });

    // TC-EDIT-03 (Edit Discards)
    it('abandons history edits on Escape without cascading', () => {
        pressKeys(['5', '+', '5', '=']);
        const exprElem = screen.getByText('5+5 =');
        fireEvent.click(exprElem);
        
        const input = document.querySelector('.hist-edit-input');
        fireEvent.change(input, { target: { value: '9+9' } });
        // Cancel changes
        fireEvent.keyDown(input, { key: 'Escape', code: 'Escape' });
        
        // Ensure input box is gone and state remained unaltered
        expect(document.querySelector('.hist-edit-input')).not.toBeInTheDocument();
        const historyLines = document.querySelectorAll('.history-line');
        expect(historyLines[0]).toHaveTextContent('5+5 =');
        expect(historyLines[0]).toHaveTextContent('10');
    });
});
