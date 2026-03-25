export interface RecommendationItem {
  name: string;
  domain: string;
  difficulty: string;
  placementValue: number;
  higherStudyValue: number;
  description: string;
  score: number;
  reasons: string[];
  warnings: string[];
}

export interface RecommendationResponse {
  responseId: string;
  student: {
    name: string;
    gpa: number;
    goal: string;
    interests: string[];
    preferredDifficulty: string;
  };
  recommendations: RecommendationItem[];
  overallWarnings: string[];
  createdAt: string;
}