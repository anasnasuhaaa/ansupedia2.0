export interface Experience {
  organization: string;
  role: string;
  period: string;
  description: string;
  logo?: string;
  url?: string;
}
// Add only confirmed roles and dates. Project ownership does not establish an organizational role.
export const experiences: Experience[] = [];
