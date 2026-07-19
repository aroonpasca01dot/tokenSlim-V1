// TypeScript declarations for TokenSlim Core
interface CompressionStats {
  original: number;
  compressed: number;
  saved: number;
  percent: number;
}

interface CompressResult {
  compressed: string;
  stats: CompressionStats;
}

interface LevelAnalysis {
  name: string;
  level: number;
  original: number;
  compressed: number;
  saved: number;
  percent: number;
}

interface AnalyzeResult {
  levels: LevelAnalysis[];
  recommendation: number;
}

export class TokenSlimCore {
  compress(text: string, level?: number): CompressResult;
  analyze(text: string): AnalyzeResult;
}
