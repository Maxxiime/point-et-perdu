// src/components/PhotoAnalyzer.tsx
import React, { useRef, useState } from "react";
import { drawAnalysisOnCanvas, analyzePetanquePhoto, type AnalysisResult } from "../lib/petanque/analyze";

export default function PhotoAnalyzer() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!canvasRef.current) return;
    setBusy(true);
    setError(null);
    try {
      const res = await drawAnalysisOnCanvas(file, canvasRef.current, {});
      setResult(res);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Erreur pendant l'analyse de la photo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="w-full max-w-3xl mx-auto p-4 space-y-4">
      <h2 className="text-2xl font-semibold">Analyse photo — distance des boules au cochonnet</h2>
      <input
        type="file"
        accept="image/*"
        capture="environment"
        onChange={onFileChange}
        className="block border rounded p-2"
      />
      <canvas ref={canvasRef} className="w-full rounded shadow" />
      {busy && <p>Analyse en cours…</p>}
      {error && <p className="text-red-600">{error}</p>}
      {result?.jack && (
        <div className="space-y-2">
          <h3 className="text-xl font-medium">Classement (pixels, du + proche au + loin)</h3>
          <ol className="list-decimal pl-6">
            {result.sorted.map((b, i) => (
              <li key={i}>
                Boule {i + 1} — distance ≈{" "}
                {Math.round(
                  Math.hypot(b.x - (result.jack!.x), b.y - (result.jack!.y))
                )}{" "}
                px
              </li>
            ))}
          </ol>
          <p className="text-sm opacity-70">
            Astuce : si la détection du cochonnet est ambiguë, vous pouvez recadrer l'image pour
            limiter le terrain et réessayer. Une future version permettra de cliquer pour choisir le cochonnet manuellement.
          </p>
        </div>
      )}
    </div>
  );
}
