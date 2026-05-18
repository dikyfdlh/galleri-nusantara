const BASE = '/api';

function adminToken() {
  return localStorage.getItem('gn_admin_token') || '';
}

async function request(method, url, body, isForm = false) {
  const headers = {};
  const token = adminToken();
  if (token) headers['x-admin-token'] = token;
  let payload;
  if (isForm) {
    payload = body;
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }
  const res = await fetch(BASE + url, { method, headers, body: payload });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    // Token admin kedaluwarsa (mis. server di-restart) -> paksa login ulang
    if (res.status === 401 && token && url !== '/admin/login') {
      localStorage.removeItem('gn_admin_token');
      if (location.pathname !== '/admin') location.assign('/admin');
      throw new Error('Sesi admin berakhir. Silakan login ulang.');
    }
    throw new Error(data.error || `Gagal (${res.status})`);
  }
  return data;
}

export const api = {
  // customers
  enter: (c) => request('POST', '/customers', c),

  // products
  products: (all) => request('GET', `/products${all ? '?all=1' : ''}`),
  product: (id) => request('GET', `/products/${id}`),
  createProduct: (p) => request('POST', '/products', p),
  updateProduct: (id, p) => request('PUT', `/products/${id}`, p),
  deleteProduct: (id) => request('DELETE', `/products/${id}`),
  uploadImages: (id, files) => {
    const fd = new FormData();
    [...files].forEach((f) => fd.append('images', f));
    return request('POST', `/products/${id}/images`, fd, true);
  },
  removeImage: (id, url) => request('DELETE', `/products/${id}/images`, { url }),

  // bookings
  createBooking: (b) => request('POST', '/bookings', b),
  bookings: (customerId) =>
    request('GET', `/bookings${customerId ? `?customerId=${customerId}` : ''}`),
  booking: (id) => request('GET', `/bookings/${id}`),
  qris: (id) => request('POST', `/bookings/${id}/qris`),
  markPaid: (id) => request('POST', `/bookings/${id}/paid`),
  settle: (id) => request('POST', `/bookings/${id}/settle`),
  verify: (id) => request('POST', `/bookings/${id}/verify`),
  setStatus: (id, status) => request('POST', `/bookings/${id}/status`, { status }),
  rateBooking: (id, { customerId, rating, message, anonymous, media }) => {
    const fd = new FormData();
    fd.append('customerId', customerId);
    fd.append('rating', String(rating || 5));
    if (message) fd.append('message', message);
    fd.append('anonymous', anonymous ? 'true' : 'false');
    if (media) fd.append('media', media);
    return request('POST', `/bookings/${id}/rating`, fd, true);
  },

  // testimoni / dokumentasi pesanan selesai
  testimonials: (all) => request('GET', `/testimonials${all ? '?all=1' : ''}`),
  createBookingTestimonial: (
    bookingId,
    { name, origin, rating, message, anonymous, photo }
  ) => {
    const fd = new FormData();
    if (name) fd.append('name', name);
    if (origin) fd.append('origin', origin);
    fd.append('rating', String(rating || 5));
    if (message) fd.append('message', message);
    fd.append('anonymous', anonymous ? 'true' : 'false');
    if (photo) fd.append('photo', photo);
    return request('POST', `/bookings/${bookingId}/testimonial`, fd, true);
  },
  updateTestimonial: (id, t) => request('PUT', `/testimonials/${id}`, t),
  deleteTestimonial: (id) => request('DELETE', `/testimonials/${id}`),

  // settings / auth
  settings: () => request('GET', '/settings'),
  updateSettings: (s) => request('PUT', '/settings', s),
  uploadQrisImage: (file) => {
    const fd = new FormData();
    fd.append('image', file);
    return request('POST', '/settings/qris-image', fd, true);
  },
  removeQrisImage: () => request('DELETE', '/settings/qris-image'),
  adminLogin: async (password) => {
    const r = await request('POST', '/admin/login', { password });
    if (r && r.role) localStorage.setItem('gn_admin_role', r.role);
    return r;
  },
  adminVerify: () => request('GET', '/admin/verify'),
  changePassword: async (currentPassword, newPassword) => {
    const r = await request('POST', '/admin/password', { currentPassword, newPassword });
    // Token berputar saat password berubah — simpan agar sesi tetap aktif.
    if (r && r.token) localStorage.setItem('gn_admin_token', r.token);
    return r;
  },

  // manajemen akun admin
  admins: () => request('GET', '/admins'),
  createAdmin: (a) => request('POST', '/admins', a),
  updateAdmin: (id, a) => request('PUT', `/admins/${id}`, a),
  deleteAdmin: (id) => request('DELETE', `/admins/${id}`),
};

export function hasAdminToken() {
  return !!localStorage.getItem('gn_admin_token');
}

export function adminRole() {
  return localStorage.getItem('gn_admin_role') || '';
}

export function clearAdminToken() {
  localStorage.removeItem('gn_admin_token');
  localStorage.removeItem('gn_admin_role');
}

export function rupiah(n) {
  return 'Rp ' + Number(n || 0).toLocaleString('id-ID');
}

export function tanggal(s) {
  if (!s) return '-';
  return new Date(s + (s.length === 10 ? 'T00:00:00' : '')).toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}
