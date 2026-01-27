"use client";

import { useState } from "react";
import {
  calculateBTA,
  type ActivityInput,
  type CalculationResult,
} from "../packages/core/src";

const DEFAULT_INPUT = `[
  { "componentId": "component-1", "value": 10 },
  { "componentId": "component-2", "value": 5 }
]`;

export default function HomePage() {
  const [inputValue, setInputValue] = useState(DEFAULT_INPUT);
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCalculate = () => {
    setError(null);
    setResult(null);

    try {
      const parsed = JSON.parse(inputValue) as ActivityInput[];
      if (!Array.isArray(parsed)) {
        setError("Input must be a JSON array of ActivityInput objects.");
        return;
      }

      const calculation = calculateBTA(parsed);
      setResult(calculation);
    } catch (parseError) {
      setError(
        parseError instanceof Error
          ? parseError.message
          : "Unable to parse JSON input."
      );
    }
  };

  return (
    <main className="container">
      <h1>BTA UMS Calculator (MVP)</h1>
      <label htmlFor="activity-input">ActivityInput JSON</label>
      <textarea
        id="activity-input"
        rows={8}
        value={inputValue}
        onChange={(event) => setInputValue(event.target.value)}
      />
      <button type="button" onClick={handleCalculate}>
        Calculate
      </button>
      {error ? (
        <p role="alert">{error}</p>
      ) : (
        <pre>{result ? JSON.stringify(result, null, 2) : "No result yet."}</pre>
      )}
    </main>
  );
}
