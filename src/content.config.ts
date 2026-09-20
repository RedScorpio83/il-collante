import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    heroImage: z.string().optional(),
    cover: z.string().optional(),
    series: z.string().optional(),
    seriesPart: z.number().optional(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

const projects = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/projects' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    technologies: z.array(z.string()).default([]),
    heroImage: z.string().optional(),
    githubUrl: z.string().url().optional(),
    liveUrl: z.string().url().optional(),
    featured: z.boolean().default(false),
    status: z.enum(['in-progress', 'completed', 'active']).default('active'),
    highlight: z.object({
      value: z.string(),
      label: z.string(),
    }).optional(),
  }),
});

export const collections = { blog, projects };
