import { ProfileName } from '../../core/api.models';

export const PROFILE_LABELS: Record<ProfileName, string> = {
  COMUM: 'Comum',
  SECRETARIO: 'Secretário',
  ADMINISTRADOR: 'Administrador',
};

export function profileLabel(profile: string | null | undefined): string {
  if (!profile) {
    return '';
  }

  return PROFILE_LABELS[profile as ProfileName] ?? profile;
}
