import { notFound } from 'next/navigation';
import { ReceiptView } from '@/components/ReceiptView';

export default async function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  return <ReceiptView paymentId={id} />;
}
