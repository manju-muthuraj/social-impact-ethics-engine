
export interface AnalysisResult {
  postId: string;
  sentiment: string;
  keyPhrases: string[];
  inclusivityScore: number;
  misinformationScore: number;
  divisivenessScore: number;
  socialImpactScore: number;
  ethicalInsights: string[];
  timestamp: string;
}
