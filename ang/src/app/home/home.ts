import { Component, ElementRef, ViewChild, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { RecommendationService } from '../recommendation.service';

@Component({
  selector: 'app-home',
  imports: [ReactiveFormsModule],
  templateUrl: './home.html',
  styleUrl: './home.css'
})
export class Home {
  private service = inject(RecommendationService);
  private router = inject(Router);
  private fb = inject(FormBuilder);

  @ViewChild('infoDialog') infoDialog!: ElementRef<HTMLDialogElement>;

  loading = signal(false);
  error = signal('');

  interestOptions = [
    'ai','machine learning','data','math','web',
    'frontend','backend','app','cloud','devops',
    'security','privacy','testing','design','nlp'
  ];

  form = this.fb.group({
    name: ['', Validators.required],
    gpa: [null, [Validators.required, Validators.min(0), Validators.max(10)]],
    goal: ['', Validators.required],
    preferredDifficulty: [''],
    interests: [[] as string[]]
  });

  constructor() {
    this.service.seed().subscribe();
  }

  openInfoDialog() {
    this.infoDialog?.nativeElement.showModal();
  }

  closeInfoDialog() {
    this.infoDialog?.nativeElement.close();
  }

  toggleInterest(value: string, checked: boolean) {
    const current = this.form.value.interests || [];

    if (checked) {
      this.form.patchValue({
        interests: [...current, value]
      });
    } else {
      this.form.patchValue({
        interests: current.filter(i => i !== value)
      });
    }
  }

  submit() {
    this.error.set('');

    if (this.form.invalid) {
      this.error.set('Fill all required fields correctly');
      return;
    }

    const val = this.form.value;

    if (!val.interests || val.interests.length === 0) {
      this.error.set('Select at least one interest');
      return;
    }

    this.loading.set(true);

    this.service.recommend({
      name: val.name!.trim(),
      gpa: val.gpa!,
      goal: val.goal!,
      interests: val.interests!,
      preferredDifficulty: val.preferredDifficulty || ''
    }).subscribe({
      next: (data) => {
        this.loading.set(false);
        this.router.navigate(['/result'], {
          queryParams: { id: data.responseId }
        });
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Failed to get recommendation');
      }
    });
  }
}