import type { Metadata } from 'next';
import RakugokaMap from '@/components/RakugokaMap';
import { store } from '@/lib/server';

export const metadata: Metadata = {
  title: '師匠の見取り図 — 前座さん',
  description: '現役の噺家を「古典↔新作 × 本格↔爆笑」で見取り図に。寄席で会える人・入門おすすめがひと目で分かります。',
};

export default async function MapPage() {
  const data = await store().listRakugoka();
  return <RakugokaMap data={data} />;
}
