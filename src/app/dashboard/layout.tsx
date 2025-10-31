export const metadata = {
  title: 'Dashboard',
  description: 'Contenta dashboard',
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Nested layouts must not render <html>/<body>. Root is in app/layout.tsx
  return children;
}
