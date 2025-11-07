This is a [Next.js](https://nextjs.org) project.

## Project Overview

Contenta is a small dashboard that helps generate captions, ideas and scripts with a clean, privacy‑first setup. The app uses Firebase Auth and Firestore with owner‑only user documents and a lightweight local history so you can iterate quickly.

## Getting Started

Run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

Fonts are loaded via `next/font` for better performance.

## Auth & Privacy (Quick Notes)

- Sign‑in supports email with a “Remember me” option (local or session persistence).
- Username reservations are public (for availability checks) but store only `{ uid, updatedAt }`.
- User documents under `users/{uid}` are private (owner‑only) and may include email/PII.
- Suggested Firestore rules enforce the above (see `firestore.rules`).

## Local History

Generated results are saved to local storage so you can revisit “Outputs”, “Recent”, and “Favorites” without relying on a backend.

## Development Tips

- Use Node 18+.
- Start the app from the `web` directory if the repository is a monorepo.
- Keep strings ASCII‑clean to avoid encoding issues on Windows editors.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
