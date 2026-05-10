export type ProfileName = 'COMUM' | 'SECRETARIO' | 'ADMINISTRADOR';

export interface ApiErrorResponse {
  timestamp: string;
  status: number;
  error: string;
  message: string;
  path: string;
}

export interface PageRequest {
  page?: number;
  size?: number;
}

export interface PageResponse<T> {
  items: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface LoginRequest {
  cpf: string;
  password: string;
}

export interface LoginResponse {
  tokenType: 'Bearer';
  accessToken: string;
  expiresInSeconds: number;
  refreshToken: string;
  refreshExpiresInSeconds: number;
  requirePasswordChange: boolean;
}

export interface MyProfileRequest {
  name: string;
  email: string;
  phone?: string;
}

export interface MyProfileResponse {
  id: number;
  name: string;
  cpf: string;
  email: string;
  phone?: string;
  profile: string;
  active: boolean;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}

export interface JwtClaims {
  cpf: string;
  perfil: ProfileName;
  nome: string;
  exp?: number;
}

export interface UserRequest {
  name: string;
  cpf: string;
  email: string;
  phone?: string;
  profileId: number;
  password: string;
}

export interface UserResponse {
  id: number;
  name: string;
  cpf: string;
  email: string;
  phone?: string;
  profile: string;
  active: boolean;
}

export interface UserFilters {
  profile?: string;
  name?: string;
  cpf?: string;
}

export interface UserProfileRequest {
  profile: string;
}

export interface UserProfileResponse {
  id: number;
  profile: string;
}

export interface CatalogRequest {
  description: string;
}

export interface CatalogResponse {
  id: number;
  description: string;
}

export interface CodedCatalogRequest {
  description: string;
  code: string;
}

export interface CodedCatalogResponse {
  id: number;
  description: string;
  code: string;
}

export interface AssetRequest {
  description: string;
  quantity: number;
  acquisitionDate?: string;
  disposalDate?: string;
  acquisitionValue?: number;
  brand?: string;
  model?: string;
  serialNumber?: string;
  manufacturer?: string;
  invoice?: string;
  colorId: number;
  assetTypeId: number;
  assetStatusId: number;
  assetMaterialId: number;
  assetLocationId: number;
  photoBase64?: string;
}

export interface AssetResponse {
  id: number;
  description: string;
  quantity: number;
  acquisitionDate?: string;
  disposalDate?: string;
  acquisitionValue?: number;
  brand?: string;
  model?: string;
  serialNumber?: string;
  manufacturer?: string;
  invoice?: string;
  assetCode: string;
  barcodeValue: string;
  color?: string;
  assetType?: string;
  assetStatus?: string;
  assetMaterial?: string;
  assetLocation?: string;
}

export interface AssetFilters {
  assetCode?: string;
  brand?: string;
  model?: string;
  description?: string;
  createdFrom?: string;
  disposalDate?: string;
  acquisitionDate?: string;
  invoice?: string;
  material?: string;
  location?: string;
  status?: string;
  color?: string;
  serialNumber?: string;
  manufacturer?: string;
  type?: string;
}

export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | string;

export interface AuditLogResponse {
  id: number;
  userCpf?: string;
  userName?: string;
  userProfile?: ProfileName | string;
  action: AuditAction;
  entityName: string;
  entityId?: string;
  details?: string;
  createdAt: string;
}

export interface AuditLogFilters {
  action?: string;
  entityName?: string;
  entityId?: string;
  userCpf?: string;
  userName?: string;
  userProfile?: string;
  dateFrom?: string;
  dateTo?: string;
}

export type CatalogEndpoint =
  | 'colors'
  | 'asset-types'
  | 'asset-statuses'
  | 'asset-materials'
  | 'asset-locations';

export interface CatalogPageData {
  title: string;
  subtitle: string;
  singularLabel: string;
  endpoint: CatalogEndpoint;
  coded: boolean;
  roles: ProfileName[];
}

export interface MenuItem {
  label: string;
  path: string;
  queryParams?: Record<string, string>;
  roles: ProfileName[];
}

export interface MenuSection {
  id: string;
  label: string;
  roles: ProfileName[];
  items: MenuItem[];
}

export const API_BASE_URL = 'http://localhost:8080';

export const ALL_PROFILES: ProfileName[] = ['COMUM', 'SECRETARIO', 'ADMINISTRADOR'];