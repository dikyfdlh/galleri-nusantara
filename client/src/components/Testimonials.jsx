import { useEffect, useState } from 'react';
import { api } from '../api.js';

function Stars({ n }) {
  return (
    <span className="text-batik-400" aria-label={`${n} dari 5`}>
      {'★'.repeat(n)}
      <span className="text-batik-200">{'★'.repeat(5 - n)}</span>
    </span>
  );
}

/** Dokumentasi & testimoni dari pesanan yang sudah selesai.
 *  Tampil di bawah form masuk pelanggan. */
export default function Testimonials() {
  const [list, setList] = useState([]);

  useEffect(() => {
    api
      .testimonials()
      .then(setList)
      .catch(() => setList([]));
  }, []);

  if (list.length === 0) return null;

  return (
    <section className="mx-auto max-w-6xl px-4 pb-16">
      <div className="mb-6 text-center">
        <h2 className="text-2xl font-bold text-batik-900">
          Dokumentasi & Testimoni Pelanggan
        </h2>
        <p className="text-sm text-batik-500">
          Pesanan yang telah selesai bersama Galleri Nusantara
        </p>
      </div>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((t) => (
          <figure key={t.id} className="card flex flex-col overflow-hidden">
            {t.video ? (
              <video
                src={t.video}
                controls
                preload="metadata"
                className="h-52 w-full bg-black object-cover"
              />
            ) : (
              t.image && (
                <img
                  src={t.image}
                  alt={t.productName || 'Dokumentasi'}
                  className="h-52 w-full object-cover"
                  loading="lazy"
                />
              )
            )}
            <div className="flex grow flex-col p-5">
              <Stars n={t.rating || 5} />
              {t.message && (
                <blockquote className="mt-2 grow text-batik-700">
                  “{t.message}”
                </blockquote>
              )}
              <figcaption className="mt-4 border-t border-batik-100 pt-3">
                <div className="font-semibold text-batik-900">{t.name}</div>
                <div className="text-xs text-batik-500">
                  {t.productName}
                  {t.origin ? ` · ${t.origin}` : ''}
                </div>
              </figcaption>
            </div>
          </figure>
        ))}
      </div>
    </section>
  );
}
