import { HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import type { Credentials, SessionApi, SessionUser } from './session-api';

/** One pending call of the fake: the test answers it when it wants. */
export class PendingCall<T> {
  readonly subject = new Subject<T>();

  answer(value: T): void {
    this.subject.next(value);
    this.subject.complete();
  }

  fail(status: number): void {
    this.subject.error(new HttpErrorResponse({ status }));
  }
}

/**
 * A SessionApi for tests: every call is recorded and stays pending until the test answers
 * it — so a test sees how many requests went out and in which order.
 */
@Injectable()
export class FakeSessionApi implements SessionApi {
  readonly gets: PendingCall<SessionUser>[] = [];
  readonly creates: { credentials: Credentials; call: PendingCall<void> }[] =
    [];
  readonly deletes: PendingCall<void>[] = [];

  get() {
    const call = new PendingCall<SessionUser>();
    this.gets.push(call);
    return call.subject.asObservable();
  }

  create(credentials: Credentials) {
    const call = new PendingCall<void>();
    this.creates.push({ credentials, call });
    return call.subject.asObservable();
  }

  delete() {
    const call = new PendingCall<void>();
    this.deletes.push(call);
    return call.subject.asObservable();
  }
}

export const ANNA: SessionUser = {
  id: '0193a5c0-0000-7000-8000-000000000001',
  email: 'anna.berger@beispiel.de',
};

/** Lets pending promise callbacks run (the store awaits the fake's observables). */
export const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
