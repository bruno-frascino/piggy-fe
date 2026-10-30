'use client';

import { useParams } from 'next/navigation';
import ImportReview from '@/components/ImportReview';

export default function ImportReviewPage() {
  const params = useParams<{ id: string }>();
  return <ImportReview importId={params.id} />;
}
