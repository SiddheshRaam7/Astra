import { notFound } from 'next/navigation';
import { ForkApp } from '@/components/fork-app';
export default async function Page({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  if (!['cash-flow', 'goals', 'money-leaks', 'x-ray', 'simulator', 'settings'].includes(section))
    notFound();
  return <ForkApp />;
}
