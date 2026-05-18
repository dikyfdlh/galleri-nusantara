import { useEffect, useState } from 'react';
import { api } from '../api.js';

/** Alamat toko + peta Google (embed, tanpa API key).
 *  Tampil di bawah testimoni pada halaman masuk pelanggan. */
export default function LocationMap() {
  const [s, setS] = useState(null);

  useEffect(() => {
    api
      .settings()
      .then(setS)
      .catch(() => setS(null));
  }, []);

  const query = (s?.mapQuery || s?.address || '').trim();
  if (!s || (!query && !s.address)) return null;

  const src = query
    ? `https://maps.google.com/maps?q=${encodeURIComponent(query)}&z=16&output=embed`
    : null;

  return (
    <section className="mx-auto max-w-6xl px-4 pb-16">
      <div className="mb-6 text-center">
        <h2 className="text-2xl font-bold text-batik-900">Alamat & Lokasi</h2>
        <p className="text-sm text-batik-500">
          Kunjungi {s.businessName || 'Galleri Nusantara'}
        </p>
      </div>
      <div className="grid gap-5 md:grid-cols-3">
        {s.address && (
          <div className="card p-5 md:col-span-1">
            <div className="font-semibold text-batik-900">📍 Alamat</div>
            <p className="mt-2 whitespace-pre-line text-batik-700">{s.address}</p>
            {query && (
              <a
                className="btn-outline mt-4 inline-flex text-sm"
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                  query
                )}`}
                target="_blank"
                rel="noreferrer"
              >
                Buka di Google Maps
              </a>
            )}
          </div>
        )}
        {src && (
          <div
            className={`card overflow-hidden ${
              s.address ? 'md:col-span-2' : 'md:col-span-3'
            }`}
          >
            <iframe
              title="Lokasi"
              src={src}
              className="h-72 w-full border-0"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
          </div>
        )}
      </div>
    </section>
  );
}
