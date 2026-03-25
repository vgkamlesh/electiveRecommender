import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { RecommendationResponse } from './models';

@Injectable({
  providedIn: 'root'
})
export class RecommendationService {
  private http = inject(HttpClient);
  private baseUrl = 'https://electiverecommender.onrender.com/api';

  seed() {
    return this.http.post<{ message: string }>(`${this.baseUrl}/seed`, {});
  }

  recommend(payload: {
    name: string;
    gpa: number;
    goal: string;
    interests: string[];
    preferredDifficulty: string;
  }) {
    return this.http.post<RecommendationResponse>(`${this.baseUrl}/recommend`, payload);
  }

  getRecommendationById(id: string) {
    return this.http.get<RecommendationResponse>(`${this.baseUrl}/recommendation/${id}`);
  }
}
