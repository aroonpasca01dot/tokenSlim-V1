// TypeScript declarations for TokenSlim Core

export type CompressionLevel = 1 | 2 | 3 | 4;

export interface CompressionStats {
  original: number;
  compressed: number;
  saved: number;
  percent: number;
}

export interface CompressResult {
  compressed: string;
  stats: CompressionStats;
}

export interface LevelAnalysis {
  name: string;
  level: number;
  original: number;
  compressed: number;
  saved: number;
  percent: number;
}

export interface AnalyzeResult {
  levels: LevelAnalysis[];
  recommendation: number;
}

export interface SummarizeResult {
  original: number;
  compressed: number;
  percent: number;
  saved: number;
}

export class TokenSlimCore {
  static VERSION: string;
  compress(text: string, level?: CompressionLevel): CompressResult;
  analyze(text: string): AnalyzeResult;
  summarize(text: string, level?: CompressionLevel): SummarizeResult;
}
