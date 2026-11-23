import {
  ApplicationRef,
  createComponent,
  DestroyRef,
  DOCUMENT,
  EnvironmentInjector,
  type EnvironmentProviders,
  inject,
  makeEnvironmentProviders,
  provideAppInitializer,
} from '@angular/core';
import { ToastRegionComponent } from './toast-region';
import { KonturToast } from './toast.service';

/**
 * `bootstrapApplication(App, { providers: [provideKonturToast()] })`.
 * At app start it puts the one <k-toast-region> into <body>, with its live regions empty
 * and ready (Toast.md 7), and attaches it to change detection. Removed when the app is
 * destroyed.
 */
export function provideKonturToast(): EnvironmentProviders {
  return makeEnvironmentProviders([
    provideAppInitializer(() => {
      const appRef = inject(ApplicationRef);
      const document = inject(DOCUMENT);
      const ref = createComponent(ToastRegionComponent, {
        environmentInjector: inject(EnvironmentInjector),
      });
      appRef.attachView(ref.hostView);
      document.body.appendChild(ref.location.nativeElement);
      inject(KonturToast).attachRegion();
      inject(DestroyRef).onDestroy(() => {
        ref.destroy();
        (ref.location.nativeElement as HTMLElement).remove();
      });
    }),
  ]);
}
