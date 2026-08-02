/**
 * Japan 6-gate TOPIX sequential filter result types.
 */

export type GateStatus = 'PASS' | 'SOFT_FAIL' | 'HARD_FAIL';

export interface GateResult {
  gate: number;          // 1–6
  name: string;          // human-readable gate name
  status: GateStatus;
  value: string;         // formatted actual value, e.g. "P/E: 12.3"
  threshold: string;     // threshold applied, e.g. "< 15"
  reason: string;        // plain-language explanation
  /** Only set when status is SOFT_FAIL — explains why it may not be a real problem */
  softFailNote?: string;
}

export type JapanFilterOverall = 'ALL_PASS' | 'INVESTIGATE' | 'REJECT' | 'NOT_APPLICABLE';

export interface JapanFilterResult {
  /** Whether this stock is a Japanese-listed company */
  isJapanese: boolean;
  /** Overall filter outcome */
  overall: JapanFilterOverall;
  /** Per-gate results (only populated for Japanese stocks) */
  gates: GateResult[];
  /** Number of gates passed */
  passingGates: number;
  /** Number of soft fails (should investigate further) */
  softFails: number;
  /** Number of hard fails (reject) */
  hardFails: number;
  /** The TOPIX sector used for threshold lookup */
  topixSector: string | null;
  /** Plain-language summary of the filter result */
  summary: string;
}