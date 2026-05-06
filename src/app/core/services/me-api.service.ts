import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { API_BASE_URL, ChangePasswordRequest, MyProfileRequest, MyProfileResponse } from '../api.models';

@Injectable({ providedIn: 'root' })
export class MeApiService {
  private readonly http = inject(HttpClient);

  getMyProfile() {
    return this.http.get<MyProfileResponse>(`${API_BASE_URL}/api/me`);
  }

  updateMyProfile(payload: MyProfileRequest) {
    return this.http.put<MyProfileResponse>(`${API_BASE_URL}/api/me`, payload);
  }

  changePassword(payload: ChangePasswordRequest) {
    return this.http.put<void>(`${API_BASE_URL}/api/me/password`, payload);
  }
}
