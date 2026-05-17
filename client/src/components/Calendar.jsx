import { useState } from 'react';

const DOW = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

function ymd(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`;
}

/**
 * Kalender pemilihan tanggal mulai sewa.
 * @param value tanggal terpilih (YYYY-MM-DD)
 * @param minDate Date paling awal yang bisa dipilih
 * @param days lama sewa (untuk menyorot rentang)
 */
export default function Calendar({ value, onChange, minDate, days = 1 }) {
  const init = value ? new Date(value + 'T00:00:00') : minDate || new Date();
  const [view, setView] = useState({ y: init.getFullYear(), m: init.getMonth() });

  const min = new Date(minDate);
  min.setHours(0, 0, 0, 0);

  const first = new Date(view.y, view.m, 1);
  const startPad = first.getDay();
  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();

  const selected = value ? new Date(value + 'T00:00:00') : null;
  const rangeEnd = selected ? new Date(selected) : null;
  if (rangeEnd) rangeEnd.setDate(rangeEnd.getDate() + Math.max(1, days) - 1);

  const cells = [];
  for (let i = 0; i < startPad; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(view.y, view.m, d));

  function shift(delta) {
    setView((v) => {
      const nm = v.m + delta;
      return { y: v.y + Math.floor(nm / 12), m: ((nm % 12) + 12) % 12 };
    });
  }

  return (
    <div className="card p-4">
      <div className="mb-3 flex items-center justify-between">
        <button type="button" className="btn-ghost px-3" onClick={() => shift(-1)}>
          ‹
        </button>
        <div className="font-semibold text-batik-800">
          {MONTHS[view.m]} {view.y}
        </div>
        <button type="button" className="btn-ghost px-3" onClick={() => shift(1)}>
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-batik-500">
        {DOW.map((d) => (
          <div key={d} className="py-1">
            {d}
          </div>
        ))}
      </div>

      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((d, idx) => {
          if (!d) return <div key={idx} />;
          d.setHours(0, 0, 0, 0);
          const disabled = d < min;
          const isSel = selected && ymd(d) === ymd(selected);
          const inRange =
            selected && d > selected && rangeEnd && d <= rangeEnd;
          return (
            <button
              key={idx}
              type="button"
              disabled={disabled}
              onClick={() => onChange(ymd(d))}
              className={[
                'aspect-square rounded-lg text-sm transition',
                disabled
                  ? 'text-batik-200 cursor-not-allowed'
                  : 'hover:bg-batik-100 text-batik-800',
                isSel ? 'bg-batik-600 text-white hover:bg-batik-600 font-bold' : '',
                inRange ? 'bg-batik-100' : '',
              ].join(' ')}
            >
              {d.getDate()}
            </button>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-batik-500">
        Tanggal sebelum{' '}
        <b>
          {min.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
        </b>{' '}
        tidak bisa dipilih.
      </p>
    </div>
  );
}
