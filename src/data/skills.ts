export interface SkillCategory {
  name: string;
  technologies: string[];
}
// Areas of practice, not proficiency ratings. Sources: profile README and project manifests.
export const skills: SkillCategory[] = [
  {
    name: 'Languages',
    technologies: ['TypeScript', 'JavaScript', 'Python', 'PHP', 'C', 'C++', 'Java'],
  },
  { name: 'Frontend', technologies: ['Astro', 'React', 'Next.js', 'Vue', 'Tailwind CSS'] },
  { name: 'Backend', technologies: ['Node.js', 'Laravel', 'FastAPI'] },
  {
    name: 'Databases & ORM',
    technologies: ['PostgreSQL', 'MySQL', 'Supabase', 'Neon', 'Prisma', 'Drizzle'],
  },
  {
    name: 'Tools & infrastructure',
    technologies: ['Docker', 'Git', 'Linux', 'Cloudflare', 'Vercel'],
  },
  { name: 'Security interests', technologies: ['Reverse Engineering', 'Web Exploitation', 'CTF'] },
];
// Tabler icon filenames. Keep this explicit so arbitrary content cannot select asset paths.
export const technologyIcons: Record<string, string> = {
  TypeScript: 'brand-typescript',
  JavaScript: 'brand-javascript',
  Python: 'brand-python',
  PHP: 'brand-php',
  C: 'letter-c',
  'C++': 'brand-cpp',
  Java: 'coffee',
  Astro: 'brand-astro',
  React: 'brand-react',
  'Next.js': 'brand-nextjs',
  Vue: 'brand-vue',
  'Tailwind CSS': 'brand-tailwind',
  'Node.js': 'brand-nodejs',
  Laravel: 'brand-laravel',
  FastAPI: 'bolt',
  PostgreSQL: 'database',
  MySQL: 'brand-mysql',
  Supabase: 'brand-supabase',
  Neon: 'database',
  Prisma: 'brand-prisma',
  Drizzle: 'database',
  Docker: 'brand-docker',
  Git: 'brand-git',
  Linux: 'brand-ubuntu',
  Cloudflare: 'brand-cloudflare',
  Vercel: 'brand-vercel',
  'Reverse Engineering': 'binary',
  'Web Exploitation': 'shield-code',
  CTF: 'flag',
};
