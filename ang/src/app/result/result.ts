import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { RecommendationResponse } from '../models';
import { RecommendationService } from '../recommendation.service';

@Component({
  selector: 'app-result',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './result.html',
  styleUrl: './result.css'
})
export class Result {
  private route = inject(ActivatedRoute);
  private service = inject(RecommendationService);

  data = signal<RecommendationResponse | null>(null);
  loading = signal(true);
  error = signal('');

  constructor() {
    this.route.queryParamMap.subscribe(params => {
      const id = params.get('id');

      if (!id) {
        this.loading.set(false);
        this.error.set('No recommendation id found');
        return;
      }

      this.service.getRecommendationById(id).subscribe({
        next: (res) => {
          this.data.set({
            ...res,
            overallWarnings: Array.isArray(res.overallWarnings) ? res.overallWarnings : [],
            recommendations: Array.isArray(res.recommendations)
              ? res.recommendations.map(item => ({
                  ...item,
                  reasons: Array.isArray(item.reasons) ? item.reasons : [],
                  warnings: Array.isArray(item.warnings) ? item.warnings : []
                }))
              : []
          });
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.error.set('Failed to load recommendation');
        }
      });
    });
  }

  openReactDashboard() {
    const current = this.data();
    if (!current?.responseId) return;
    window.open(`http://localhost:5173/?id=${current.responseId}`, '_blank');
  }
}