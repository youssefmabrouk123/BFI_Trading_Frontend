// user.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface User {
  id: number;
  email: string;
  role: string;
  // Ajoutez d'autres champs si nécessaire
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private userSubject: BehaviorSubject<User | null> = new BehaviorSubject<User | null>(null);
  public user$: Observable<User | null> = this.userSubject.asObservable();

  setUserData(user: User): void {
    this.userSubject.next(user);
  }

  getUserData(): User | null {
    return this.userSubject.value;
  }

  clearUserData(): void {
    this.userSubject.next(null);
  }
}