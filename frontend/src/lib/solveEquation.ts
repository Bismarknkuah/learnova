/**
 * Internal equation solver — handles linear and quadratic equations and arithmetic, with no
 * external service. This is the "math intelligence" half of whiteboard recognition; pairing it
 * with handwriting OCR (a model) would complete the full handwriting→solve flow.
 */
export function solveEquation(raw: string): string {
  const input = raw.replace(/\s+/g, '').replace(/²/g, '^2').toLowerCase();

  // Quadratic: a x^2 + b x + c = 0  (also handles missing terms)
  const quad = /^([+-]?\d*)x\^2([+-]\d*)x?([+-]\d+)?=0$/.exec(input.replace(/x\^2/, 'x^2'));
  if (quad || /x\^2/.test(input)) {
    const m = parseQuadratic(input);
    if (m) {
      const { a, b, c } = m;
      const disc = b * b - 4 * a * c;
      if (disc < 0) return `No real roots (discriminant ${disc} < 0).`;
      const sq = Math.sqrt(disc);
      const x1 = (-b + sq) / (2 * a), x2 = (-b - sq) / (2 * a);
      return disc === 0 ? `x = ${round(x1)}` : `x = ${round(x1)} or x = ${round(x2)}`;
    }
  }

  // Linear: a x + b = c
  if (/x/.test(input) && input.includes('=')) {
    const lin = parseLinear(input);
    if (lin) return `x = ${round(lin)}`;
  }

  // Arithmetic expression
  try {
    if (/^[-+*/().\d^]+$/.test(input)) {
      // eslint-disable-next-line no-new-func
      const val = Function(`"use strict";return(${input.replace(/\^/g, '**')})`)();
      if (typeof val === 'number' && isFinite(val)) return `= ${round(val)}`;
    }
  } catch { /* ignore */ }

  return 'Could not solve — try a linear (2x+3=7) or quadratic (x^2+5x+6=0) equation.';
}

function coeffs(side: string): Record<string, number> {
  const out: Record<string, number> = { x2: 0, x: 0, n: 0 };
  const terms = side.match(/[+-]?[^+-]+/g) ?? [];
  for (const t of terms) {
    if (t.includes('x^2')) out.x2 += num(t.replace('x^2', ''));
    else if (t.includes('x')) out.x += num(t.replace('x', ''));
    else out.n += Number(t || 0);
  }
  return out;
}
const num = (s: string) => (s === '' || s === '+' ? 1 : s === '-' ? -1 : Number(s));

function parseQuadratic(eq: string): { a: number; b: number; c: number } | null {
  const [l, r] = eq.split('='); if (r === undefined) return null;
  const L = coeffs(l), R = coeffs(r);
  const a = L.x2 - R.x2, b = L.x - R.x, c = L.n - R.n;
  return a !== 0 ? { a, b, c } : null;
}
function parseLinear(eq: string): number | null {
  const [l, r] = eq.split('='); if (r === undefined) return null;
  const L = coeffs(l), R = coeffs(r);
  const a = L.x - R.x, b = R.n - L.n;
  return a !== 0 ? b / a : null;
}
const round = (n: number) => Math.round(n * 1000) / 1000;
