export interface Certification {
  title: string;
  issuer: string;
  date: string;
  type: 'certification' | 'achievement';
  description: string;
  credentialUrl?: string;
  image?: string;
}
// No verified credentials or awards were available from the supplied profile.
export const certifications: Certification[] = [];
