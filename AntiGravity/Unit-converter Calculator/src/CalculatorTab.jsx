/**
 * Calculator Tab Component
 * Why is this implemented: Renders the math interface and handles local state for ANS continuity 
 * independently from the unit converter. Also supports inline history editing with cascade 
 * re-evaluation so any change propagates through all dependent equations.
 */
import React, { useState, useRef, useEffect } from 'react';
import { evaluateExpression } from './mathEvaluator';

export default function CalculatorTab() {
    const [historyList, setHistoryList] = useState([]);
    const [currentInput, setCurrentInput] = useState("");
    const [lastAnswer, setLastAnswer] = useState(0);
    const [newSequence, setNewSequence] = useState(false);
    // Tracks which history item is being edited inline
    const [editingIndex, setEditingIndex] = useState(null);
    const [editingValue, setEditingValue] = useState("");

    const historyEndRef = useRef(null);
    useEffect(() => {
        // Why: Auto-scroll ensures the latest history line is always visible without user action
        if (historyEndRef.current) {
            historyEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [historyList]);

    /**
     * Cascade re-evaluates all history entries from a given index onward.
     * Why is this implemented: Editing one historical expression changes the ANS fed into every
     * subsequent equation. We must walk forward and re-evaluate each in sequence to keep
     * the entire history chain internally consistent.
     */
    const recalcFromIndex = (idx, newExpr, currentHistory) => {
        const newHistory = [...currentHistory];
        newHistory[idx] = { ...newHistory[idx], expr: newExpr };

        // ANS for the entry being edited = result of the entry before it (or 0 if it's the first)
        let ansForNext = idx === 0 ? 0 : newHistory[idx - 1].res;

        for (let i = idx; i < newHistory.length; i++) {
            try {
                const res = evaluateExpression(newHistory[i].expr, ansForNext);
                newHistory[i] = { ...newHistory[i], res, error: false };
                ansForNext = res;
            } catch (e) {
                // Why: On a cascade error we still continue, using 0 as a safe fallback ANS,
                // rather than leaving untouched stale results that would silently be wrong.
                newHistory[i] = { ...newHistory[i], res: 'Error', error: true };
                ansForNext = 0;
            }
        }

        const lastEntry = newHistory[newHistory.length - 1];
        setHistoryList(newHistory);
        setLastAnswer(lastEntry.error ? 0 : lastEntry.res);
        setCurrentInput(lastEntry.res.toString());
        // Why: After a cascade, the display reflects the updated final result and
        // newSequence is set so the next keypress behaves correctly.
        setNewSequence(true);
    };

    /**
     * Commits the current inline edit and triggers cascade recalculation.
     * Why is this implemented: Separating commit logic from the blur/Enter handlers
     * prevents duplicate calls and keeps handlers thin.
     */
    const commitEdit = (idx) => {
        const trimmed = editingValue.trim();
        if (trimmed) {
            recalcFromIndex(idx, trimmed, historyList);
        }
        setEditingIndex(null);
        setEditingValue("");
    };

    const cancelEdit = () => {
        setEditingIndex(null);
        setEditingValue("");
    };

    const handleBtn = (val) => {
        // Why: If the user presses a keypad button while editing history, auto-commit the edit
        // so we don't lose their work and the state stays consistent.
        if (editingIndex !== null) {
            commitEdit(editingIndex);
        }

        if (val === "C") {
            setCurrentInput("");
            setHistoryList([]);
            setLastAnswer(0);
            setNewSequence(false);
            return;
        }

        if (val === "DEL") {
            if (newSequence) {
                // Why: DEL after a result discards the display without clearing history —
                // history only clears if the next expression evaluated lacks ANS.
                setCurrentInput("");
                setNewSequence(false);
            } else {
                setCurrentInput(prev => prev.slice(0, -1));
            }
            return;
        }

        if (val === "=") {
            if (!currentInput || currentInput === "Error") return;
            try {
                const res = evaluateExpression(currentInput, lastAnswer);

                // Why: History append vs replace is decided here — at evaluation time —
                // so that ANS at any position in the expression (e.g. "5 * ANS") is detected.
                const usesAns = /ANS/.test(currentInput);
                setHistoryList(prev =>
                    usesAns
                        ? [...prev, { expr: currentInput, res, error: false }]
                        : [{ expr: currentInput, res, error: false }]
                );

                setLastAnswer(res);
                setCurrentInput(res.toString());
                setNewSequence(true);
            } catch (e) {
                setCurrentInput("Error");
                setNewSequence(true);
            }
            return;
        }

        // Post-result keypress handling
        if (newSequence) {
            if (/[0-9.(]/.test(val)) {
                // Why: Starting with a digit/paren means a fresh unrelated expression;
                // we let the user type freely and defer clearing history until = is pressed.
                setCurrentInput(val);
            } else if (val === "ANS") {
                setCurrentInput("ANS");
            } else {
                // Why: Operator right after a result implicitly continues from last answer
                setCurrentInput("ANS" + val);
            }
            setNewSequence(false);
        } else {
            if (currentInput === "Error") {
                setCurrentInput(val);
            } else {
                setCurrentInput(prev => prev + val);
            }
        }
    };

    const keys = [
        "C", "DEL", "(", ")",
        "7", "8", "9", "/",
        "4", "5", "6", "*",
        "1", "2", "3", "-",
        "0", ".", "ANS", "+",
        "="
    ];

    return (
        <div className="calculator-tab">
            <div className="display-area glass-effect">
                <div className="history-panel">
                    {historyList.map((entry, idx) => (
                        <div key={idx} className="history-line">
                            {editingIndex === idx ? (
                                <input
                                    className="hist-edit-input"
                                    value={editingValue}
                                    autoFocus
                                    onChange={e => setEditingValue(e.target.value)}
                                    onBlur={() => commitEdit(idx)}
                                    onKeyDown={e => {
                                        if (e.key === "Enter") commitEdit(idx);
                                        if (e.key === "Escape") cancelEdit();
                                    }}
                                />
                            ) : (
                                <span
                                    className="hist-expr editable"
                                    title="Click to edit"
                                    onClick={() => {
                                        setEditingIndex(idx);
                                        setEditingValue(entry.expr);
                                    }}
                                >
                                    {entry.expr} =
                                </span>
                            )}
                            <span className={`hist-res ${entry.error ? 'hist-error' : ''}`}>
                                {entry.res}
                            </span>
                        </div>
                    ))}
                    <div ref={historyEndRef} />
                </div>
                <div className="current-input">
                    {currentInput || "0"}
                </div>
            </div>

            <div className="keypad">
                {keys.map(k => (
                    <button
                        key={k}
                        className={`key ${k === '=' ? 'key-equal' : ''} ${isNaN(k) && k !== '.' && k !== 'ANS' ? 'key-operator' : ''}`}
                        onClick={() => handleBtn(k)}
                    >
                        {k}
                    </button>
                ))}
            </div>
        </div>
    );
}
