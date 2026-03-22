// ─────────────────────────────────────────────────────────────────────────────
// wifi-kriging.ts
// 2-D Gaussian Process Regression (kriging) for WiFi signal interpolation.
//
// Usage:
//   const gp = new WifiKriging({ lengthScale: 90, noiseVariance: 0.01 });
//   gp.addReading({ x: 120, y: 80, signal: 75 });
//   gp.addReading({ x: 400, y: 200, signal: 50 });
//   const signal = gp.predict(260, 140);          // posterior mean
//   const { mean, variance } = gp.predictFull(260, 140);
//   const hotspots = gp.findHotspots({ gridSize: 60 });
// ─────────────────────────────────────────────────────────────────────────────

// ── Types ────────────────────────────────────────────────────────────────────

/** A single WiFi signal reading at a 2-D position. Signal is 0–100. */
export interface SignalReading {
  x: number;
  y: number;
  signal: number; // 0–100
}

/** A predicted hotspot: a local maximum of the posterior mean. */
export interface Hotspot {
  x: number;
  y: number;
  predictedSignal: number;
  /** Posterior standard deviation at this point — lower = more certain. */
  uncertainty: number;
}

/** Full posterior at a single point. */
export interface Prediction {
  mean: number;
  variance: number;
  /** 95% confidence interval: [mean - 2σ, mean + 2σ], clamped to [0, 100]. */
  ci95: [number, number];
}

/** Options for WifiKriging. */
export interface KrigingOptions {
  /**
   * RBF length scale in the same coordinate units as your readings.
   * Controls how quickly correlation decays with distance.
   * Larger → smoother field, influence spreads further.
   * @default 90
   */
  lengthScale?: number;

  /**
   * Observation noise variance (σ²). Set higher if readings are noisy
   * or taken at different times/conditions.
   * @default 0.01
   */
  noiseVariance?: number;

  /**
   * Signal amplitude (vertical scale of the kernel).
   * Usually left at 1 and absorbed into the data scaling.
   * @default 1
   */
  amplitude?: number;
}

/** Options for hotspot search. */
export interface HotspotOptions {
  /**
   * Number of grid cells along each axis. Higher = finer search.
   * @default 60
   */
  gridSize?: number;

  /** Bounding box to search within. Defaults to the bounding box of all readings + 10% padding. */
  bounds?: { x0: number; y0: number; x1: number; y1: number };

  /**
   * A predicted point is a hotspot candidate only if its mean signal is above
   * this absolute threshold (0–100).
   * @default 40
   */
  minSignal?: number;

  /**
   * Additionally, a candidate must be within this fraction of the global maximum.
   * e.g. 0.80 means "within 80% of the peak". Applied on top of minSignal.
   * @default 0.80
   */
  relativeThreshold?: number;
}

// ── Linear solver (Gauss–Jordan) ─────────────────────────────────────────────

/**
 * Solve A·x = b in-place via Gauss–Jordan elimination with partial pivoting.
 * Returns the solution vector x. Mutates internal copies; originals are safe.
 */
function solveLinear(A: number[][], b: number[]): number[] {
  const n = b.length;
  // Work on copies so callers are unaffected
  const M: number[][] = A.map((row) => [...row]);
  const x: number[] = [...b];

  for (let col = 0; col < n; col++) {
    // Partial pivot
    let pivot = col;
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(M[row][col]) > Math.abs(M[pivot][col])) pivot = row;
    }
    [M[col], M[pivot]] = [M[pivot], M[col]];
    [x[col], x[pivot]] = [x[pivot], x[col]];

    const diag = M[col][col];
    if (Math.abs(diag) < 1e-12) continue; // numerically singular row — skip

    for (let i = 0; i < n; i++) {
      if (i === col) continue;
      const factor = M[i][col] / diag;
      for (let j = col; j < n; j++) M[i][j] -= factor * M[col][j];
      x[i] -= factor * x[col];
    }
  }

  return x.map((v, i) => (Math.abs(M[i][i]) > 1e-12 ? v / M[i][i] : 0));
}

// ── Main class ────────────────────────────────────────────────────────────────

export class WifiKriging {
  private readings: SignalReading[] = [];

  // Hyperparameters
  private lengthScale: number;
  private noiseVariance: number;
  private amplitude: number;

  // Cached posterior state (recomputed on demand after readings change)
  private _dirty = true;
  private _alpha: number[] = []; // (K + σ²I)⁻¹ · y_centered
  private _Kinv: number[][] = []; // (K + σ²I)⁻¹ stored for variance computation
  private _meanObs = 0; // mean of observed signals (used to center)
  private _scaleObs = 1; // std-like scale of observed signals

  constructor(options: KrigingOptions = {}) {
    this.lengthScale = options.lengthScale ?? 90;
    this.noiseVariance = options.noiseVariance ?? 0.01;
    this.amplitude = options.amplitude ?? 1;
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /** Add a single WiFi reading. Invalidates the cached posterior. */
  addReading(reading: SignalReading): void {
    this.readings.push({ ...reading });
    this._dirty = true;
  }

  /** Replace all readings at once. */
  setReadings(readings: SignalReading[]): void {
    this.readings = readings.map((r) => ({ ...r }));
    this._dirty = true;
  }

  /** Remove all readings. */
  clearReadings(): void {
    this.readings = [];
    this._dirty = true;
  }

  /** Current readings (read-only copy). */
  getReadings(): SignalReading[] {
    return this.readings.map((r) => ({ ...r }));
  }

  /** Update hyperparameters and invalidate cache. */
  setHyperparameters(opts: KrigingOptions): void {
    if (opts.lengthScale !== undefined) this.lengthScale = opts.lengthScale;
    if (opts.noiseVariance !== undefined) this.noiseVariance = opts.noiseVariance;
    if (opts.amplitude !== undefined) this.amplitude = opts.amplitude;
    this._dirty = true;
  }

  /**
   * Predict the posterior mean signal at (x, y). Returns a value in [0, 100].
   * Falls back to the mean of observations (or 50) when no readings exist.
   */
  predict(x: number, y: number): number {
    this._ensureFit();
    return this._predictMean(x, y);
  }

  /**
   * Predict the full posterior distribution at (x, y):
   * mean, variance, and 95% CI.
   */
  predictFull(x: number, y: number): Prediction {
    this._ensureFit();
    const mean = this._predictMean(x, y);
    const variance = this._predictVariance(x, y);
    const sd2 = 2 * Math.sqrt(Math.max(0, variance));
    return {
      mean,
      variance,
      ci95: [
        Math.max(0, mean - sd2),
        Math.min(100, mean + sd2),
      ],
    };
  }

  /**
   * Evaluate the posterior mean on a regular grid and return a 2-D array
   * of predictions, useful for rendering a heatmap.
   *
   * Returns `grid[row][col]` where row 0 = top (y = y0) and
   * col 0 = left (x = x0).
   */
  predictGrid(options: {
    x0: number;
    y0: number;
    x1: number;
    y1: number;
    cols: number;
    rows: number;
  }): Prediction[][] {
    this._ensureFit();
    const { x0, y0, x1, y1, cols, rows } = options;
    return Array.from({ length: rows }, (_, ri) => {
      const y = y0 + (ri / (rows - 1)) * (y1 - y0);
      return Array.from({ length: cols }, (_, ci) => {
        const x = x0 + (ci / (cols - 1)) * (x1 - x0);
        return this.predictFull(x, y);
      });
    });
  }

  /**
   * Find hotspot candidates — local maxima of the posterior mean above
   * both the absolute and relative thresholds.
   */
  findHotspots(options: HotspotOptions = {}): Hotspot[] {
    if (this.readings.length === 0) return [];

    this._ensureFit();

    const gridSize = options.gridSize ?? 60;
    const minSignal = options.minSignal ?? 40;
    const relThresh = options.relativeThreshold ?? 0.8;

    const bounds = options.bounds ?? this._autoBounds(0.1);
    const { x0, y0, x1, y1 } = bounds;

    // Build a flat grid of mean predictions
    const dx = (x1 - x0) / (gridSize - 1);
    const dy = (y1 - y0) / (gridSize - 1);

    const grid: number[][] = Array.from({ length: gridSize }, (_, gi) =>
      Array.from({ length: gridSize }, (_, gj) =>
        this._predictMean(x0 + gj * dx, y0 + gi * dy)
      )
    );

    // Global max for relative threshold
    const globalMax = Math.max(...grid.flat());
    const absThresh = Math.max(minSignal, globalMax * relThresh);

    // Find local maxima (8-connected neighbourhood)
    const hotspots: Hotspot[] = [];
    for (let gi = 1; gi < gridSize - 1; gi++) {
      for (let gj = 1; gj < gridSize - 1; gj++) {
        const v = grid[gi][gj];
        if (v < absThresh) continue;

        let isMax = true;
        outer: for (let di = -1; di <= 1; di++) {
          for (let dj = -1; dj <= 1; dj++) {
            if ((di === 0 && dj === 0)) continue;
            if (grid[gi + di][gj + dj] >= v) { isMax = false; break outer; }
          }
        }
        if (!isMax) continue;

        const hx = x0 + gj * dx;
        const hy = y0 + gi * dy;
        const variance = this._predictVariance(hx, hy);
        hotspots.push({
          x: hx,
          y: hy,
          predictedSignal: v,
          uncertainty: Math.sqrt(Math.max(0, variance)),
        });
      }
    }

    // Sort strongest first
    return hotspots.sort((a, b) => b.predictedSignal - a.predictedSignal);
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  /** RBF (squared-exponential) kernel between two points. */
  private _kernel(x1: number, y1: number, x2: number, y2: number): number {
    const dx = x1 - x2;
    const dy = y1 - y2;
    return (
      this.amplitude * this.amplitude *
      Math.exp(-0.5 * (dx * dx + dy * dy) / (this.lengthScale * this.lengthScale))
    );
  }

  /** Covariance vector between test point (x,y) and all training inputs. */
  private _kStar(x: number, y: number): number[] {
    return this.readings.map((r) => this._kernel(x, y, r.x, r.y));
  }

  /** Recompute alpha and K⁻¹ from scratch. */
  private _fit(): void {
    const n = this.readings.length;
    if (n === 0) {
      this._alpha = [];
      this._Kinv = [];
      this._meanObs = 50;
      this._scaleObs = 1;
      return;
    }

    // Centre and scale the signal values so the GP prior (zero mean) is sensible
    this._meanObs = this.readings.reduce((s, r) => s + r.signal, 0) / n;
    const centered = this.readings.map((r) => r.signal - this._meanObs);
    this._scaleObs = Math.max(1, ...centered.map(Math.abs));
    const y = centered.map((v) => v / this._scaleObs);

    // Build K + σ²I
    const K: number[][] = Array.from({ length: n }, (_, i) =>
      Array.from({ length: n }, (_, j) =>
        this._kernel(
          this.readings[i].x, this.readings[i].y,
          this.readings[j].x, this.readings[j].y
        ) + (i === j ? this.noiseVariance : 0)
      )
    );

    // α = K⁻¹ y  (used for mean predictions)
    this._alpha = solveLinear(K, y);

    // K⁻¹  (used for variance predictions) — solve n systems against each e_i
    this._Kinv = Array.from({ length: n }, (_, i) => {
      const ei = Array(n).fill(0);
      ei[i] = 1;
      return solveLinear(K, ei);
    });

    this._dirty = false;
  }

  private _ensureFit(): void {
    if (this._dirty) this._fit();
  }

  private _predictMean(x: number, y: number): number {
    if (this.readings.length === 0) return this._meanObs;
    const kstar = this._kStar(x, y);
    const raw = kstar.reduce((s, k, i) => s + k * this._alpha[i], 0);
    return Math.max(0, Math.min(100, raw * this._scaleObs + this._meanObs));
  }

  private _predictVariance(x: number, y: number): number {
    if (this.readings.length === 0) {
      return this._kernel(x, y, x, y) * this._scaleObs * this._scaleObs;
    }
    const kstar = this._kStar(x, y);
    // var = k(x*,x*) - kstar^T K⁻¹ kstar
    let correction = 0;
    for (let i = 0; i < kstar.length; i++) {
      for (let j = 0; j < kstar.length; j++) {
        correction += kstar[i] * this._Kinv[i][j] * kstar[j];
      }
    }
    const varNorm = Math.max(0, this._kernel(x, y, x, y) - correction);
    return varNorm * this._scaleObs * this._scaleObs;
  }

  /** Axis-aligned bounding box of all readings, expanded by `padding` fraction. */
  private _autoBounds(padding: number): { x0: number; y0: number; x1: number; y1: number } {
    const xs = this.readings.map((r) => r.x);
    const ys = this.readings.map((r) => r.y);
    const x0r = Math.min(...xs), x1r = Math.max(...xs);
    const y0r = Math.min(...ys), y1r = Math.max(...ys);
    const px = Math.max(50, (x1r - x0r) * padding);
    const py = Math.max(50, (y1r - y0r) * padding);
    return { x0: x0r - px, y0: y0r - py, x1: x1r + px, y1: y1r + py };
  }
}

// ── Log marginal likelihood (for hyperparameter optimisation) ─────────────────

/**
 * Compute the log marginal likelihood of the GP given readings and hyperparameters.
 *
 *   log p(y | X, θ) = -½ yᵀ(K+σ²I)⁻¹y - ½ log|K+σ²I| - n/2 log 2π
 *
 * Useful for tuning lengthScale and noiseVariance by maximising this value.
 */
export function logMarginalLikelihood(
  readings: SignalReading[],
  opts: Required<KrigingOptions>
): number {
  const n = readings.length;
  if (n === 0) return 0;

  const { lengthScale, noiseVariance, amplitude } = opts;

  function kern(a: SignalReading, b: SignalReading): number {
    const dx = a.x - b.x, dy = a.y - b.y;
    return amplitude * amplitude * Math.exp(-0.5 * (dx * dx + dy * dy) / (lengthScale * lengthScale));
  }

  const meanY = readings.reduce((s, r) => s + r.signal, 0) / n;
  const y = readings.map((r) => r.signal - meanY);

  const K: number[][] = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) =>
      kern(readings[i], readings[j]) + (i === j ? noiseVariance : 0)
    )
  );

  const alpha = solveLinear(K, y);
  const dataFit = -0.5 * y.reduce((s, yi, i) => s + yi * alpha[i], 0);

  // log|K| via sum of log|diagonal of U| after Gaussian elimination (approx)
  const M = K.map((row) => [...row]);
  let logDet = 0;
  for (let col = 0; col < n; col++) {
    let piv = col;
    for (let row = col + 1; row < n; row++)
      if (Math.abs(M[row][col]) > Math.abs(M[piv][col])) piv = row;
    [M[col], M[piv]] = [M[piv], M[col]];
    const d = M[col][col];
    if (Math.abs(d) < 1e-12) return -Infinity;
    logDet += Math.log(Math.abs(d));
    for (let i = col + 1; i < n; i++) {
      const f = M[i][col] / d;
      for (let j = col; j < n; j++) M[i][j] -= f * M[col][j];
    }
  }

  const complexity = -0.5 * logDet;
  const constant = -0.5 * n * Math.log(2 * Math.PI);
  return dataFit + complexity + constant;
}

// ── Example / smoke test ──────────────────────────────────────────────────────

if (require.main === module) {
  const gp = new WifiKriging({ lengthScale: 120, noiseVariance: 0.05 });

  // Simulate readings in a 680×400 space
  const mockReadings: SignalReading[] = [
    { x: 100, y:  80, signal: 82 },
    { x: 340, y: 200, signal: 55 },
    { x: 580, y:  90, signal: 70 },
    { x: 160, y: 320, signal: 45 },
    { x: 520, y: 330, signal: 60 },
    { x: 340, y:  60, signal: 90 },
  ];

  gp.setReadings(mockReadings);

  // Point prediction
  const mid = gp.predictFull(340, 200);
  console.log("Prediction at (340, 200):");
  console.log(`  mean=${mid.mean.toFixed(1)}, variance=${mid.variance.toFixed(2)}`);
  console.log(`  95% CI: [${mid.ci95[0].toFixed(1)}, ${mid.ci95[1].toFixed(1)}]`);

  // Hotspot search
  const hotspots = gp.findHotspots({ gridSize: 50, minSignal: 50 });
  console.log(`\nFound ${hotspots.length} hotspot(s):`);
  hotspots.forEach((h, i) =>
    console.log(
      `  [${i + 1}] (${h.x.toFixed(0)}, ${h.y.toFixed(0)})  ` +
      `signal=${h.predictedSignal.toFixed(1)}  ±${h.uncertainty.toFixed(1)}`
    )
  );

  // Log marginal likelihood for these hyperparameters
  const lml = logMarginalLikelihood(mockReadings, {
    lengthScale: 120,
    noiseVariance: 0.05,
    amplitude: 1,
  });
  console.log(`\nLog marginal likelihood: ${lml.toFixed(3)}`);
}
