Analyze and optimize my Next.js 15 App Router application for maximum performance and faster page loads.

Tech stack:
- Next.js 15
- React 19
- TypeScript
- Tailwind CSS
- Supabase
- App Router

Current dependencies include:
- leaflet
- react-leaflet
- quill
- jszip
- radix-ui
- react-hook-form
- zod

Optimization goals:
1. Reduce initial bundle size
2. Improve first contentful paint (FCP)
3. Improve largest contentful paint (LCP)
4. Reduce client-side JavaScript
5. Improve route transitions
6. Optimize hydration
7. Improve mobile performance
8. Improve Lighthouse score

Please perform the following:

1. Detect unnecessary "use client" components and convert them to Server Components where possible.

2. Dynamically import heavy libraries such as:
   - leaflet
   - react-leaflet
   - quill
   - jszip

3. Add lazy loading and Suspense boundaries where appropriate.

4. Optimize Supabase data fetching:
   - move fetching to server components
   - reduce client-side fetching
   - add caching/revalidation

5. Optimize images using next/image.

6. Optimize fonts using next/font.

7. Detect unnecessary rerenders and expensive React patterns.

8. Add bundle analyzer configuration.

9. Optimize layouts and nested components for App Router best practices.

10. Check for hydration issues.

11. Improve loading states using loading.tsx instead of client-side loaders.

12. Suggest code splitting opportunities.

13. Remove unused dependencies and imports if possible.

14. Optimize Tailwind usage and avoid excessive client rendering.

15. Provide exact code changes with explanations.

Important:
- Preserve existing functionality.
- Do not break Supabase auth.
- Follow Next.js 15 App Router best practices.
- Prefer server-first architecture.
- Minimize use of useEffect and useState unless necessary.
- Keep forms interactive where needed.
- Use streaming and Suspense properly.

