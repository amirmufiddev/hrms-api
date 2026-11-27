# Frontend Handover: Multi-Branch Geofencing & Attendance HRMS

Dokumen ini menjelaskan integrasi dan penyesuaian UI untuk modul **Branches** dan **Presensi Pegawai** (*Attendance*) terkait fitur *Multi-Branch Geofencing*.

---

## 1. Overview Fitur
HRMS kini mendukung konfigurasi geofencing lokasi per cabang/toko/warehouse selain konfigurasi global per kantor pusat (*Tenant*).

- Setiap cabang (`Branch`) memiliki koordinat `latitude`, `longitude`, dan `radiusMeters` (default: 100m).
- Saat pegawai melakukan **Clock-In**:
  - Jika pegawai ditugaskan ke sebuah cabang yang memiliki konfigurasi geofencing aktif, presensi divalidasi terhadap lokasi cabang tersebut.
  - Jika tidak, presensi fallback ke lokasi kantor pusat (*Tenant*).
  - Jika di luar radius, presensi ditolak dengan pesan: `You are {X}m from {Branch Name / Head Office}. Must be within {Y}m to clock in.`

---

## 2. Struktur Data `Branch` di Frontend

Di `frontend/src/types/index.ts`:

```typescript
export interface Branch {
  id: string;
  tenantId: string;
  name: string;
  type: string; // 'HEAD_OFFICE' | 'BRANCH_OFFICE' | 'WAREHOUSE' | 'STORE' | dll.
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  
  // Geofencing coordinates
  latitude?: number | null;
  longitude?: number | null;
  radiusMeters?: number | null;

  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: { employees: number };
}
```

---

## 3. Rekomendasi Penyesuaian UI

### 3.1 Form Tambah/Edit Cabang (`/admin/branches`)
Tambahkan field opsional untuk Geofencing pada modal create/edit cabang:
1. **Latitude** (Input Number, step="any", placeholder="-6.9175")
2. **Longitude** (Input Number, step="any", placeholder="107.6191")
3. **Radius Geofencing (Meter)** (Input Number, placeholder="100")
4. Tombol helper "Gunakan Lokasi Saya Saat Ini" yang membaca `navigator.geolocation.getCurrentPosition()`.

### 3.2 List Cabang (`/admin/branches`)
- Tampilkan badge atau icon GPS pada cabang yang telah memiliki konfigurasi geofencing aktif.

---

## 4. API Endpoint

- `POST /api/branches`
  Payload:
  ```json
  {
    "name": "Eiger Store Bandung",
    "type": "STORE",
    "address": "Jl. Sumatera No. 24",
    "city": "Bandung",
    "latitude": -6.9175,
    "longitude": 107.6191,
    "radiusMeters": 150
  }
  ```
- `PUT /api/branches/:id`
  Payload: Update data cabang & geofencing.
- `POST /api/attendance/clock-in`
  Payload: `{ "latitude": -6.9175, "longitude": 107.6191, "photo": "...", "source": "WEB" }`
