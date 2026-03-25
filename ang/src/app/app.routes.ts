import { Routes } from '@angular/router';
import { Home } from './home/home';
import { Result } from './result/result';

export const routes: Routes = [
  { path: '', component: Home },
  { path: 'result', component: Result }
];
