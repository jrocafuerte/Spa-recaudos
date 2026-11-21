import { notFound } from 'next/navigation';
import { PayBillFlow } from '@/components/PayBillFlow';

export default async function BillerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^blr-\d{3}$/.test(id)) notFound();
  return <PayBillFlow billerId={id} />;
}
