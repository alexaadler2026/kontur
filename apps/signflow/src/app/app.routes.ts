import { Route } from '@angular/router';

export const appRoutes: Route[] = [
  {
    path: '',
    // The router sets document.title from here (WCAG 2.4.2); index.html has the same.
    title: 'SignFlow',
    loadComponent: () => import('./home/home').then((m) => m.Home),
  },
];
