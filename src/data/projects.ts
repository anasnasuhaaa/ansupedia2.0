export interface Project {
  id: string;
  name: string;
  description: string;
  technologies: string[];
  githubUrl?: string;
  liveUrl?: string;
  image: string;
  imageAlt: string;
  featured: boolean;
  order: number;
}

export const projects: Project[] = [
  {
    id: 'hydro-gig',
    name: 'HydroGig-Mesh',
    order: 1,
    featured: true,
    description:
      'A research prototype exploring flood-aware route assessment and experimental mobility workflows for motorcycle ride-hailing drivers. The experimental model is not a validated real-time safety system.',
    technologies: ['Next.js', 'TypeScript', 'Python', 'FastAPI', 'PostgreSQL'],
    githubUrl: 'https://github.com/anasnasuhaaa/hydro-gig',
    image: '/images/projects/hydro-gig.png',
    imageAlt: 'HydroGig-Mesh experimental navigation interface, captured in its source repository',
  },
  {
    id: 'mykontrakans',
    name: 'MyKontrakans',
    order: 2,
    featured: true,
    description:
      'Shared-house finances in one place: monthly contributions, payment reviews, expenses, and transparent cash-flow reporting.',
    technologies: ['Next.js', 'React', 'TypeScript', 'PostgreSQL', 'Prisma'],
    githubUrl: 'https://github.com/anasnasuhaaa/mykontrakans',
    image: '/images/projects/mykontrakans.svg',
    imageAlt: 'MyKontrakans project title card; application screenshot not available',
  },
  {
    id: 'cost-track',
    name: 'Cost Track',
    order: 3,
    featured: true,
    description:
      'A personal finance application with transaction tracking, financial dashboards, and AI-assisted input with editable previews and a manual fallback.',
    technologies: ['Next.js', 'React', 'TypeScript', 'PostgreSQL', 'Drizzle'],
    githubUrl: 'https://github.com/anasnasuhaaa/cost-track',
    image: '/images/projects/cost-track.svg',
    imageAlt: 'Cost Track project title card; application screenshot not available',
  },
  {
    id: 'ormawa',
    name: 'Ormawa Eksekutif PKU Website',
    order: 4,
    featured: false,
    description:
      'The public website of Ormawa Eksekutif PKU IPB University, introducing the organization, its student services, and news.',
    technologies: ['Next.js'],
    liveUrl: 'https://ormawaeksekutifpku.com/',
    image: '/images/projects/ormawa.svg',
    imageAlt: 'Ormawa Eksekutif PKU project title card; application screenshot not available',
  },
  {
    id: 'nexus',
    name: 'Nexus',
    order: 5,
    featured: false,
    description:
      'An internal organizational management system for Ormawa Eksekutif PKU IPB, covering work units, members, access, programs, progress, and public content.',
    technologies: ['Next.js', 'React', 'TypeScript', 'PostgreSQL', 'Prisma'],
    githubUrl: 'https://github.com/anasnasuhaaa/nexus-api',
    image: '/images/projects/nexus.svg',
    imageAlt: 'Nexus project title card; application screenshot not available',
  },
  {
    id: 'angkasakost',
    name: 'AngkasaKost',
    order: 6,
    featured: false,
    description:
      'A student housing discovery platform around IPB Dramaga, with location and amenity filters, rental details, and contact options.',
    technologies: ['Next.js', 'React', 'TypeScript', 'PostgreSQL', 'Prisma'],
    githubUrl: 'https://github.com/anasnasuhaaa/kostascope',
    liveUrl: 'https://angkasakost.ormawaeksekutifpku.com/',
    image: '/images/projects/angkasakost.svg',
    imageAlt: 'AngkasaKost project title card; application screenshot not available',
  },
];
