'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api/client';
import type { Biller, Category } from '@/lib/api/types';
import { useNativeHeader } from '@/lib/bridge/BridgeProvider';

export function ServicesHome() {
  useNativeHeader('Pago de servicios', false);
  const [categories, setCategories] = useState<Category[]>();
  const [billers, setBillers] = useState<Biller[]>();
  const [category, setCategory] = useState<string>();
  const [q, setQ] = useState('');
  const [error, setError] = useState<string>();

  useEffect(() => {
    api<{ items: Category[] }>('v1/categories')
      .then((r) => setCategories(r.items))
      .catch((e: Error) => setError(e.message));
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (category) params.set('category', category);
    if (q.trim()) params.set('q', q.trim());
    const t = setTimeout(() => {
      api<{ items: Biller[] }>(`v1/billers?${params}`)
        .then((r) => setBillers(r.items))
        .catch((e: Error) => setError(e.message));
    }, 250);
    return () => clearTimeout(t);
  }, [category, q]);

  return (
    <>
      <div className="field">
        <label htmlFor="q">Busca la empresa o servicio</label>
        <input
          id="q"
          type="search"
          inputMode="search"
          autoComplete="off"
          maxLength={40}
          value={q}
          onChange={(e) => setQ(e.target.value.replace(/[^\p{L}\p{N} ]/gu, ''))}
          placeholder="Ej. Energía, Telco…"
        />
      </div>

      <h2>Categorías</h2>
      <div className="grid" role="group" aria-label="Categorías">
        {categories
          ? categories.map((c) => (
              <button
                key={c.id}
                className="chip"
                aria-pressed={category === c.id}
                onClick={() => setCategory(category === c.id ? undefined : c.id)}
              >
                {c.name}
              </button>
            ))
          : Array.from({ length: 4 }, (_, i) => <div key={i} className="skeleton" />)}
      </div>

      <h2>Empresas</h2>
      <ul className="list">
        {billers?.map((b) => (
          <li key={b.id}>
            <Link className="row" href={`/billers/${b.id}`}>
              <span>
                {b.name}
                <small>{b.referenceLabel}</small>
              </span>
              <span aria-hidden>›</span>
            </Link>
          </li>
        ))}
        {billers?.length === 0 && <li className="muted">No encontramos empresas con ese nombre.</li>}
      </ul>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </>
  );
}
