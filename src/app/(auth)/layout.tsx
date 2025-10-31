export const metadata = {
  title: 'Auth',
  description: 'Sign in and sign up',
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Nested layouts must not render <html>/<body>. Root is in app/layout.tsx
  return children;
}
