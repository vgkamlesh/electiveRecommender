import { Routes } from '@angular/router';
import { Home } from './home/home';
import { Result } from './result/result';

export const routes: Routes = [
  { path: '', component: Home },
  {
    path: 'result',
    redirectTo: () => {
      window.location.href = 'https://elective-recommender-pk83.vercel.app/';
      return '';
    }
  }
];
