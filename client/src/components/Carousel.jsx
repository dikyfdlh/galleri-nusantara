import { useState } from 'react';
import LogoGN from '../assets/Logo_GN.png';

/** Gallery carousel untuk tiap produk. */
export default function Carousel({ images = [], alt = '', heightClass = 'h-72' }) {
  const [i, setI] = useState(0);
  const list = images.length ? images : [''];
  const n = list.length;

  const go = (d) => setI((p) => (p + d + n) % n);

  return (
    <div className="relative overflow-hidden rounded-2xl bg-batik-50">
      <div className={`${heightClass} w-full`}>
        {list[i] ? (
          <img
            src={list[i]}
            alt={alt}
            className="h-full w-full object-cover"
            onError={(e) => {
              e.currentTarget.style.opacity = 0.25;
            }}
          />
        ) : (
          <img src={LogoGN} alt="Logo Galeri Nusantara"className="h-10 w-10 object-contain"/>
        )}
      </div>

      {n > 1 && (
        <>
          <button
            type="button"
            onClick={() => go(-1)}
            aria-label="Sebelumnya"
            className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/80 px-3 py-2 text-batik-800 shadow hover:bg-white"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            aria-label="Berikutnya"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/80 px-3 py-2 text-batik-800 shadow hover:bg-white"
          >
            ›
          </button>
          <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1.5">
            {list.map((_, idx) => (
              <button
                key={idx}
                aria-label={`Foto ${idx + 1}`}
                onClick={() => setI(idx)}
                className={`h-2 rounded-full transition-all ${
                  idx === i ? 'w-5 bg-white' : 'w-2 bg-white/60'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
