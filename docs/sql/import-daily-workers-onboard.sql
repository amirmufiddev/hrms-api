-- Import Daily Worker (DAILY_WORKER) — hanya tabel employees
-- Tenant: PT Eiger Ekowisata Nusantara (EEN)
-- TIDAK membuat users / SSO (ssoUserId tetap NULL)
-- Sumber: Data DW Updated  - On Board.csv
-- Generated: 2026-10-29T06:11:48.139723+00:00
--
-- Pastikan enum DAILY_WORKER sudah di-migrate:
--   cd en-hrms-be-fe/backend && npx prisma migrate deploy
--
BEGIN;

-- Total insert: 256 karyawan

-- SKIP baris 16 (ARYA SANJAYA): KTP duplikat dalam CSV (3201260810080003)
-- SKIP baris 40 (ELITAWATI): KTP duplikat dalam CSV (3201266103940003)
-- SKIP baris 107 (ASEP ALDO WALUYA): KTP bukan 16 digit (32170226008040009)
-- SKIP baris 119 (RIRIS ARISKA): KTP bukan 16 digit (320128600994005)
-- SKIP baris 199 (Muhammad Irawan): KTP duplikat dalam CSV (3201251606970001)

-- No CSV 1: MUHAMAD FARHAN SADJILI | Daily Worker Public Area
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  'fdf3a225-f61b-4a5a-8921-47f23d66716b',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900001',
  '3201260707070003',
  'MUHAMAD FARHAN',
  'SADJILI',
  'dw.900001@hrms-local.eigeradventureland.com',
  '+6281296277630',
  'TK/0',
  'Kp.Lemah Neundeut Rt 003 Rw 004 Kelurahan Sukagalih Kecamatan Megamendung Kabupaten Bogor',
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f54e8a8a-a6d2-41c6-91de-9c8a1cc3057c',
  '79da1fa1-d359-4634-b164-3329b88a5391',
  '2026-08-26'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900001'
);

-- No CSV 2: ADITIA - | Daily Worker Public Area
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  'c3aecfe6-1f6c-4715-91e4-f94a9313b00c',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900002',
  '3201262804070001',
  'ADITIA',
  '-',
  'dw.900002@hrms-local.eigeradventureland.com',
  '+6283137531352',
  'TK/0',
  NULL,
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f54e8a8a-a6d2-41c6-91de-9c8a1cc3057c',
  '79da1fa1-d359-4634-b164-3329b88a5391',
  '2026-09-10'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900002'
);

-- No CSV 3: NOVITA SARI | Daily Worker Public Area
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  'e9495ad8-0cd5-4954-9f40-e54b0d1d8f7c',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900003',
  '3201265511070008',
  'NOVITA',
  'SARI',
  'dw.900003@hrms-local.eigeradventureland.com',
  '+6283846462147',
  'TK/0',
  NULL,
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f54e8a8a-a6d2-41c6-91de-9c8a1cc3057c',
  '79da1fa1-d359-4634-b164-3329b88a5391',
  '2026-09-10'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900003'
);

-- No CSV 4: SITI MUTIA AWALIAH | Daily Worker Public Area
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  '82f4f97d-6f23-4a21-9c04-f6a0c7c214d8',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900004',
  '3201255606070002',
  'SITI MUTIA',
  'AWALIAH',
  'dw.900004@hrms-local.eigeradventureland.com',
  '+6283155489452',
  'TK/0',
  NULL,
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f54e8a8a-a6d2-41c6-91de-9c8a1cc3057c',
  '79da1fa1-d359-4634-b164-3329b88a5391',
  '2026-09-10'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900004'
);

-- No CSV 5: NURAENI - | Daily Worker Public Area
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  'ee6cb523-dee9-404e-ac51-b06bc323930a',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900005',
  '3201265104040005',
  'NURAENI',
  '-',
  'dw.900005@hrms-local.eigeradventureland.com',
  '+6283806549875',
  'TK/0',
  NULL,
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f54e8a8a-a6d2-41c6-91de-9c8a1cc3057c',
  '79da1fa1-d359-4634-b164-3329b88a5391',
  '2026-09-10'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900005'
);

-- No CSV 6: WAHYU CIPTA PURNAMA | Daily Worker Public Area
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  'df647848-095d-4a72-a7aa-b6b6f12e4741',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900006',
  '3202162303010002',
  'WAHYU CIPTA',
  'PURNAMA',
  'dw.900006@hrms-local.eigeradventureland.com',
  '+6282121848583',
  'TK/0',
  'Kp. Sindangresmi Rt 008 Rw 007 kel. Kutajaya Kec. Cicurug',
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f54e8a8a-a6d2-41c6-91de-9c8a1cc3057c',
  '79da1fa1-d359-4634-b164-3329b88a5391',
  '2026-09-10'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900006'
);

-- No CSV 7: MUHAMMAD ANDIKA YUSRI JUANSYAH | Daily Worker Public Area
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  'fe9e3434-db49-4b27-86c5-af368b7ae469',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900007',
  '3201260307070002',
  'MUHAMMAD ANDIKA YUSRI',
  'JUANSYAH',
  'dw.900007@hrms-local.eigeradventureland.com',
  NULL,
  'TK/0',
  'Kp. Pakancilan Rt 005 Rw 003 Kel. Kuta Kec. megamendung',
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f54e8a8a-a6d2-41c6-91de-9c8a1cc3057c',
  '79da1fa1-d359-4634-b164-3329b88a5391',
  '2026-09-10'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900007'
);

-- No CSV 8: M. ELBANA RIJKI | Daily Worker Public Area
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  '2bb4dc50-c405-40d9-9882-d4a4f244d747',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900008',
  '3201260708060005',
  'M. ELBANA',
  'RIJKI',
  'dw.900008@hrms-local.eigeradventureland.com',
  '+6283164270258',
  'TK/0',
  'Kp. Coblong sukagalih megamendung Bogor',
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f54e8a8a-a6d2-41c6-91de-9c8a1cc3057c',
  '79da1fa1-d359-4634-b164-3329b88a5391',
  '2026-08-26'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900008'
);

-- No CSV 9: MUHAMAD RAMDANI | Daily Worker Public Area
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  'd0e25457-c057-424e-9611-6417c006b72a',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900009',
  '3201261107030003',
  'MUHAMAD',
  'RAMDANI',
  'dw.900009@hrms-local.eigeradventureland.com',
  '+6283193204974',
  'TK/0',
  'Kp. Lemahneundeut Rt 004 Rw 004 Kel. Sukagalih Kec. Megamendung',
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f54e8a8a-a6d2-41c6-91de-9c8a1cc3057c',
  '79da1fa1-d359-4634-b164-3329b88a5391',
  '2028-08-07'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900009'
);

-- No CSV 10: REGA WIJAYA | Daily Worker Public Area
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  '9751409d-9d2c-4d9d-accf-9f8b8ef52e1c',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900010',
  '3201262601060002',
  'REGA',
  'WIJAYA',
  'dw.900010@hrms-local.eigeradventureland.com',
  '+6289614401762',
  'TK/0',
  'Kp. Coblong RT 003 RW 001 Kelurahan Sukagalih Kecamatan Megamendung Kabupaten Bogor',
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f54e8a8a-a6d2-41c6-91de-9c8a1cc3057c',
  '79da1fa1-d359-4634-b164-3329b88a5391',
  '2028-08-07'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900010'
);

-- No CSV 11: FAZRI - | Daily Worker Public Area
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  '697ad572-1ca8-441f-8701-e1aeb4ebd8e1',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900011',
  '3201260612050002',
  'FAZRI',
  '-',
  'dw.900011@hrms-local.eigeradventureland.com',
  '+6285715361294',
  'TK/0',
  'Kp. Goleah RT 002 RW 002 Kelurahan Sukagalih Kecamatan Megamendung Kabupaten Bogor',
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f54e8a8a-a6d2-41c6-91de-9c8a1cc3057c',
  '79da1fa1-d359-4634-b164-3329b88a5391',
  '2028-08-07'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900011'
);

-- No CSV 12: REVA HANDAYANI | Daily Worker Public Area
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  '9a2e8404-ad5f-49ba-b4bb-a75e94ee94c1',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900012',
  '3201260607050006',
  'REVA',
  'HANDAYANI',
  'dw.900012@hrms-local.eigeradventureland.com',
  '+62859102844771',
  'TK/0',
  'Kp. Lemahneundeut RT 004 RW 004 Kelurahan SUkagalih Kecamatan Megamendung Kabupaten Bogor',
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f54e8a8a-a6d2-41c6-91de-9c8a1cc3057c',
  '79da1fa1-d359-4634-b164-3329b88a5391',
  '2028-08-07'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900012'
);

-- No CSV 13: M. LUTPIANSYAH H | Daily Worker Public Area
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  '3021c944-a722-4c78-b803-29827bcfa2e9',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900013',
  '3201261005060001',
  'M. LUTPIANSYAH',
  'H',
  'dw.900013@hrms-local.eigeradventureland.com',
  '+6283199825863',
  'TK/0',
  'Kp. Cihanjawar RT 003 RW 002 Kelurahan Sukagalih Kecamatan Megamendung Kabupaten Bogor',
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f54e8a8a-a6d2-41c6-91de-9c8a1cc3057c',
  '79da1fa1-d359-4634-b164-3329b88a5391',
  '2028-08-07'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900013'
);

-- No CSV 14: ALDI DARMAWAN | Daily Worker Public Area
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  '3b750f00-df05-48c5-aeb0-2711de04a84b',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900014',
  '3201252406050001',
  'ALDI',
  'DARMAWAN',
  'dw.900014@hrms-local.eigeradventureland.com',
  '+6283873498231',
  'TK/0',
  'Kp. Jogjogan RT 002 RW 002 Kelurahan Jogjogan Kecamatan Cisarua Kabupaten Bogor',
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f54e8a8a-a6d2-41c6-91de-9c8a1cc3057c',
  '79da1fa1-d359-4634-b164-3329b88a5391',
  '2028-08-07'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900014'
);

-- No CSV 15: ARYA SANJAYA | Daily Worker Public Area
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  '0b7d1cd1-0be8-416f-98b8-bc17723daa18',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900015',
  '3201260810080003',
  'ARYA',
  'SANJAYA',
  'dw.900015@hrms-local.eigeradventureland.com',
  '+6281513535859',
  'TK/0',
  'Kp. Pasir Muncang RT 001 RW 003 Kelurahan Sukamanah Kecamatan Megamendung Kabupaten Bogor',
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f54e8a8a-a6d2-41c6-91de-9c8a1cc3057c',
  '79da1fa1-d359-4634-b164-3329b88a5391',
  '2028-08-07'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900015'
);

-- No CSV 17: MUHAMMAD FARHAN RAMDANI | Daily Worker Public Area
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  '1d6f35df-833e-4714-b78a-7361ccf25897',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900016',
  '3201261210050002',
  'MUHAMMAD FARHAN',
  'RAMDANI',
  'dw.900016@hrms-local.eigeradventureland.com',
  '+6281296277630',
  'TK/0',
  'Kp. SItu RT 001 RW 003 Kelurahan Sukaresmi Kecamatan Megamendung Kabupaten Bogor',
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f54e8a8a-a6d2-41c6-91de-9c8a1cc3057c',
  '79da1fa1-d359-4634-b164-3329b88a5391',
  '2028-08-07'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900016'
);

-- No CSV 18: REFAN SETIAWAN | Daily Worker Public Area
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  '85f07c32-4399-4fce-8747-2341dd74a5f4',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900017',
  '3201261108070003',
  'REFAN',
  'SETIAWAN',
  'dw.900017@hrms-local.eigeradventureland.com',
  '+6283873738043',
  'TK/0',
  'Kp. Lemahneundeut RT 003 RW 004 Kelurahan Sukagalih Kecamatan Megamendung Kabupaten Bogor',
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f54e8a8a-a6d2-41c6-91de-9c8a1cc3057c',
  '79da1fa1-d359-4634-b164-3329b88a5391',
  '2028-08-07'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900017'
);

-- No CSV 19: MUHAMMAD IQBAL | Daily Worker Public Area
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  '025baaf5-d232-4841-b285-3f070d4df1c4',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900018',
  '3201240911060001',
  'MUHAMMAD',
  'IQBAL',
  'dw.900018@hrms-local.eigeradventureland.com',
  '+62895338124807',
  'TK/0',
  'Bendungan RT 005 RW 003 Kelurahan Bnedungan Kecamatan Ciawi Kabupaten Bogor',
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f54e8a8a-a6d2-41c6-91de-9c8a1cc3057c',
  '79da1fa1-d359-4634-b164-3329b88a5391',
  '2028-08-07'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900018'
);

-- No CSV 20: FLOURA RADHISTI PUTRI LAKSONO | Daily Worker Public Area
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  '854a1f53-6c59-4da9-8bb7-e0957f9384d2',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900019',
  '3201267107080003',
  'FLOURA RADHISTI PUTRI',
  'LAKSONO',
  'dw.900019@hrms-local.eigeradventureland.com',
  '+628889823628',
  'TK/0',
  'Kp. Lemahneundeut RT 005 RW 004 Kelurahan Sukagalih Kecamatan Megamendung Kabupaten Bogor',
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f54e8a8a-a6d2-41c6-91de-9c8a1cc3057c',
  '79da1fa1-d359-4634-b164-3329b88a5391',
  '2028-08-07'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900019'
);

-- No CSV 21: MUHAMAD RIYAN FITRIANSYAH | Daily Worker Public Area
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  'acaace34-6e10-47a5-b584-30be95b73040',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900020',
  '3201260612020002',
  'MUHAMAD RIYAN',
  'FITRIANSYAH',
  'dw.900020@hrms-local.eigeradventureland.com',
  '+6283819476913',
  'TK/0',
  'Kp. Bojong Keji RT 004 RW 003 Kelurahan SUkagalih Kecamatan Megamendung Kabupaten Bogor',
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f54e8a8a-a6d2-41c6-91de-9c8a1cc3057c',
  '79da1fa1-d359-4634-b164-3329b88a5391',
  '2028-08-07'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900020'
);

-- No CSV 22: SANDI - | Daily Worker Public Area
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  'dbb8524f-bef7-43e1-a5fe-5853ea234257',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900021',
  '3201260512020015',
  'SANDI',
  '-',
  'dw.900021@hrms-local.eigeradventureland.com',
  '+62895403700601',
  'TK/0',
  'Kp. Bojong Keji RT 003 RW 003 Kelurahan Sukagalih Kecamatan Megamendung Kabupaten Bogor',
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f54e8a8a-a6d2-41c6-91de-9c8a1cc3057c',
  '79da1fa1-d359-4634-b164-3329b88a5391',
  '2028-08-07'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900021'
);

-- No CSV 23: JULIANTO - | Daily Worker Public Area
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  'fed5464e-de62-4373-b157-6896a95e394b',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900022',
  '3201260307060003',
  'JULIANTO',
  '-',
  'dw.900022@hrms-local.eigeradventureland.com',
  '+6283107732612',
  'TK/0',
  'Kp. Lemahneundeut RT 001 RW 004 Kelurahan Sukagalih Kecamatan Megamendung Kabupaten Bogor',
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f54e8a8a-a6d2-41c6-91de-9c8a1cc3057c',
  '79da1fa1-d359-4634-b164-3329b88a5391',
  '2028-08-07'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900022'
);

-- No CSV 24: RANGGA SAPIRSAH | Daily Worker Public Area
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  '9c5a1626-68e4-4d45-bf1a-fe5709f88ebb',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900023',
  '3201260906040005',
  'RANGGA',
  'SAPIRSAH',
  'dw.900023@hrms-local.eigeradventureland.com',
  '+6285780785084',
  'TK/0',
  'Kp. CIhanjawar RT 005 RW 002 Kelurahan SUkagalih Kecamatan Megamendung Kabupaten Bogor',
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f54e8a8a-a6d2-41c6-91de-9c8a1cc3057c',
  '79da1fa1-d359-4634-b164-3329b88a5391',
  '2028-08-07'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900023'
);

-- No CSV 25: LUKMAN NULHAKIM | Daily Worker Public Area
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  '1836f4fb-4588-48ec-8f1c-ade92772c353',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900024',
  '3201241308900001',
  'LUKMAN',
  'NULHAKIM',
  'dw.900024@hrms-local.eigeradventureland.com',
  NULL,
  'TK/0',
  'Bendungan RT 002 Rw 002 Kel. Bendungan Kec. Ciawi',
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f54e8a8a-a6d2-41c6-91de-9c8a1cc3057c',
  '79da1fa1-d359-4634-b164-3329b88a5391',
  '2026-01-01'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900024'
);

-- No CSV 26: AJHARI - | Daily Worker Public Area
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  '44b232da-3264-4c62-839a-0ea14a442ee1',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900025',
  '3201241002000001',
  'AJHARI',
  '-',
  'dw.900025@hrms-local.eigeradventureland.com',
  '+628984951764',
  'TK/0',
  'Bendungan Rt 004 Rw 002 kel. Bendungan Kec. Ciawi',
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f54e8a8a-a6d2-41c6-91de-9c8a1cc3057c',
  '79da1fa1-d359-4634-b164-3329b88a5391',
  '2026-01-01'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900025'
);

-- No CSV 27: MUHAMMAD RENALDI | Daily Worker Public Area
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  'af4fbc29-ebe6-4c56-a02a-4713962c042b',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900026',
  '3201262109030001',
  'MUHAMMAD',
  'RENALDI',
  'dw.900026@hrms-local.eigeradventureland.com',
  NULL,
  'TK/0',
  'Kp, Cihanjawar Rt 004 Rw 002 Kel. Sukagalih Kec. Megamendung',
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f54e8a8a-a6d2-41c6-91de-9c8a1cc3057c',
  '79da1fa1-d359-4634-b164-3329b88a5391',
  '2026-01-01'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900026'
);

-- No CSV 28: MOCHAMADARIAMDANI - | Daily Worker Public Area
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  'ff28b69c-c664-4076-ac00-fdc83305143f',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900027',
  '3201260205000004',
  'MOCHAMADARIAMDANI',
  '-',
  'dw.900027@hrms-local.eigeradventureland.com',
  '+6283838229997',
  'TK/0',
  'Kp. Lemahneundeut RT 005 RW 004 Kelurahan Sukagalih Kecamatan Megamendung Kabupaten Bogor',
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f54e8a8a-a6d2-41c6-91de-9c8a1cc3057c',
  '79da1fa1-d359-4634-b164-3329b88a5391',
  '2026-01-01'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900027'
);

-- No CSV 29: M, HUSEN | Daily Worker Waste Sorter
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  '9a5677d4-a319-4248-9a70-329df7f51ad1',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900028',
  '3201260105040003',
  'M,',
  'HUSEN',
  'dw.900028@hrms-local.eigeradventureland.com',
  '+6283898271005',
  'TK/0',
  'Kp. Lemahneundeut Rt 005 Rw 004 Kel, Sukagalih Kec. megamendung',
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f949d311-a5b6-4587-b3a5-e3959943da3c',
  'a207d1f9-dbbd-4a02-ad12-e9deac59b679',
  '2026-01-01'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900028'
);

-- No CSV 30: MUHAMAD SAID KOSIM SOLEHUDIN | Daily Worker Waste Sorter
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  '5519e09a-9e79-441f-8b22-617a092c3a3e',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900029',
  '3201261006050007',
  'MUHAMAD SAID KOSIM',
  'SOLEHUDIN',
  'dw.900029@hrms-local.eigeradventureland.com',
  '+6283143260365',
  'TK/0',
  'Kp. Lemahneundeut Rt 005 Rw 004 Kel, Sukagalih Kec. megamendung',
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f949d311-a5b6-4587-b3a5-e3959943da3c',
  'a207d1f9-dbbd-4a02-ad12-e9deac59b679',
  '2026-01-01'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900029'
);

-- No CSV 31: JAENAL RAMDANI | Daily Worker Disposal Driver
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  '2e9f8486-d2a2-4415-9f63-ad486f215630',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900030',
  '3201252503890003',
  'JAENAL',
  'RAMDANI',
  'dw.900030@hrms-local.eigeradventureland.com',
  '+6283836136730',
  'TK/0',
  'Kp. Lemah Neundeut Rt 005 Rw 004 Kelurahan Sukagalih Kecamatan Megamendung Kabupaten Bogor',
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f949d311-a5b6-4587-b3a5-e3959943da3c',
  '241fad8e-0c72-40dd-a9ba-506fae1ce2ce',
  '2026-01-01'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900030'
);

-- No CSV 32: MUHAMAD RIZKI | Daily Worker Waste Sorter
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  '73fb442e-3c1d-42ff-a85a-67a76943196d',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900031',
  '3201260705990010',
  'MUHAMAD',
  'RIZKI',
  'dw.900031@hrms-local.eigeradventureland.com',
  '+6285814397014',
  'TK/0',
  'Kp. Pakancilan RT 005 RW 003 Kelurahan Kuta Kecamatan Megamendung Kabupaten Bogor',
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f949d311-a5b6-4587-b3a5-e3959943da3c',
  'a207d1f9-dbbd-4a02-ad12-e9deac59b679',
  '2026-01-01'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900031'
);

-- No CSV 33: ELIH - | Daily Worker Waste Sorter
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  '666fb64a-4bf8-4b54-8637-4ea4ea778103',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900032',
  '3201266104850006',
  'ELIH',
  '-',
  'dw.900032@hrms-local.eigeradventureland.com',
  '+6281324579721',
  'TK/0',
  'Kp. Lemahneunduet Rt 005 Rw 004 Kel. Sukagalih Kec. Megamendung',
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f949d311-a5b6-4587-b3a5-e3959943da3c',
  'a207d1f9-dbbd-4a02-ad12-e9deac59b679',
  '2026-08-24'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900032'
);

-- No CSV 34: DIAH NOVARINI | Daily Worker Waste Sorter
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  '6dce2062-8eeb-4439-a689-636edf0478d3',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900033',
  '3201264111890006',
  'DIAH',
  'NOVARINI',
  'dw.900033@hrms-local.eigeradventureland.com',
  '+6281388215763',
  'TK/0',
  'Kp. Lemahneunduet Rt 005 Rw 004 Kel. Sukagalih Kec. Megamendung',
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f949d311-a5b6-4587-b3a5-e3959943da3c',
  'a207d1f9-dbbd-4a02-ad12-e9deac59b679',
  '2026-08-24'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900033'
);

-- No CSV 35: ELAWATI - | Daily Worker Waste Sorter
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  '9a87b3b4-fe5e-47d0-8122-14f42714a922',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900034',
  '3201266103940003',
  'ELAWATI',
  '-',
  'dw.900034@hrms-local.eigeradventureland.com',
  '+6283811689501',
  'TK/0',
  'Kp. Lemahneunduet Rt 005 Rw 004 Kel. Sukagalih Kec. Megamendung',
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f949d311-a5b6-4587-b3a5-e3959943da3c',
  'a207d1f9-dbbd-4a02-ad12-e9deac59b679',
  '2026-08-24'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900034'
);

-- No CSV 36: LILIS - | Daily Worker Waste Sorter
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  '37e4fcb0-cf58-4d34-9462-44fd2698d34f',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900035',
  '3201266603570001',
  'LILIS',
  '-',
  'dw.900035@hrms-local.eigeradventureland.com',
  '+6283838403319',
  'TK/0',
  'Kp. Lemahneunduet Rt 004 Rw 004 Kel. Sukagalih Kec. Megamendung',
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f949d311-a5b6-4587-b3a5-e3959943da3c',
  'a207d1f9-dbbd-4a02-ad12-e9deac59b679',
  '2026-08-24'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900035'
);

-- No CSV 37: INDAH WULANDARI | Daily Worker Waste Sorter
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  '853cd78f-a630-4373-9fb5-cb861e15a9d2',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900036',
  '3201265101080001',
  'INDAH',
  'WULANDARI',
  'dw.900036@hrms-local.eigeradventureland.com',
  NULL,
  'TK/0',
  'Kp. Bojong Keji Rt 003 Rw 003 Kel. Sukagalih Kec. Megamendung',
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f949d311-a5b6-4587-b3a5-e3959943da3c',
  'a207d1f9-dbbd-4a02-ad12-e9deac59b679',
  '2026-08-24'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900036'
);

-- No CSV 38: MUHAMAD ABDUL MANAF | Daily Worker Waste Sorter
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  'e6791fbf-e82c-4b1a-b932-3cb1ad559272',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900037',
  '3201261607010004',
  'MUHAMAD ABDUL',
  'MANAF',
  'dw.900037@hrms-local.eigeradventureland.com',
  '+6281287507040',
  'TK/0',
  'Kp. Lemahneundeut Rt 005 Rw 004 Kel. Sukagalih Kec. Megamendung',
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f949d311-a5b6-4587-b3a5-e3959943da3c',
  'a207d1f9-dbbd-4a02-ad12-e9deac59b679',
  '2026-08-24'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900037'
);

-- No CSV 39: HENDAR - | Daily Worker Waste Sorter
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  'ce74f02c-fa44-4a69-8954-c68e3ac1772d',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900038',
  '3201260410040006',
  'HENDAR',
  '-',
  'dw.900038@hrms-local.eigeradventureland.com',
  '+6283105715937',
  'TK/0',
  'Kp. Lemahneundeut Rt 005 Rw 004 Kel. Sukagalih Kec. Megamendung',
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f949d311-a5b6-4587-b3a5-e3959943da3c',
  'a207d1f9-dbbd-4a02-ad12-e9deac59b679',
  '2026-08-24'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900038'
);

-- No CSV 41: RATIH - | Daily Worker Waste Sorter
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  '070c3aaf-1f59-4075-bf62-2f03df9eb307',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900039',
  '3201264508890006',
  'RATIH',
  '-',
  'dw.900039@hrms-local.eigeradventureland.com',
  '+6285893065699',
  'TK/0',
  'Kp. Pakancilan Rt 003 Rw 003 Kel, Kuta Kec. megamendung',
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f949d311-a5b6-4587-b3a5-e3959943da3c',
  'a207d1f9-dbbd-4a02-ad12-e9deac59b679',
  '2026-09-10'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900039'
);

-- No CSV 42: M. RIPAI | Daily Worker Waste Sorter
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  'af5ded20-855b-42c9-94b8-aa690fcb8790',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900040',
  '3201260908060002',
  'M.',
  'RIPAI',
  'dw.900040@hrms-local.eigeradventureland.com',
  '+6285282502637',
  'TK/0',
  'Kp. Pakancilan Rt 003 Rw 003 Kel, Kuta Kec. megamendung',
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f949d311-a5b6-4587-b3a5-e3959943da3c',
  'a207d1f9-dbbd-4a02-ad12-e9deac59b679',
  '2026-09-10'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900040'
);

-- No CSV 43: ALDI SAPUTRA | Daily Worker Traffic
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  'd26c732d-27ca-43d8-8fc7-64999abe8da1',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900041',
  '3201242303020002',
  'ALDI',
  'SAPUTRA',
  'dw.900041@hrms-local.eigeradventureland.com',
  '+6285282503624',
  'TK/0',
  'Kp. Lemah Neundeut RT 005 RW 004 Kelurahan Sukagalih Kecamatan Megamendung Kabupaten Bogor',
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f63d4628-afc4-4730-99fc-651571660d32',
  '996882bd-7344-441b-a5b1-a82e73fe8e41',
  '2026-08-07'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900041'
);

-- No CSV 44: NCEP SUGANDI | Daily Worker Traffic
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  '55f1fad0-0106-4053-ba4e-0490639cd876',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900042',
  '3201261210930002',
  'NCEP',
  'SUGANDI',
  'dw.900042@hrms-local.eigeradventureland.com',
  '+6283847841515',
  'K/2',
  'Kp. Lemah Neundeut RT 005 RW 004 Kelurahan Sukagalih Kecamatan Megamendung Kabupaten Bogor',
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f63d4628-afc4-4730-99fc-651571660d32',
  '996882bd-7344-441b-a5b1-a82e73fe8e41',
  '2026-08-07'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900042'
);

-- No CSV 45: ALIMUDIN 1988 | Daily Worker Traffic
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  '63ea3fd3-6a4c-4629-aaa0-87623a23a4f1',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900043',
  '3201241008880006',
  'ALIMUDIN',
  '1988',
  'dw.900043@hrms-local.eigeradventureland.com',
  '+628561457992',
  'K/2',
  'Kp. Bendungan RT 003 RW 002 Kelurahan Bendungan Kecamatan Ciawi Kabupaten Bogor',
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f63d4628-afc4-4730-99fc-651571660d32',
  '996882bd-7344-441b-a5b1-a82e73fe8e41',
  '2026-08-07'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900043'
);

-- No CSV 46: M RIDWAN SAPUTRA | Daily Worker Traffic
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  '8c06ba08-476a-40c1-adc3-08c1df2b321e',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900044',
  '3203282006020009',
  'M RIDWAN',
  'SAPUTRA',
  'dw.900044@hrms-local.eigeradventureland.com',
  '+6285890177175',
  'TK/0',
  'Kp. Pakancilan RT 005 RW 003 Kelurahan Kuta Kecamatan Megamendung Kabupaten Bogor',
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f63d4628-afc4-4730-99fc-651571660d32',
  '996882bd-7344-441b-a5b1-a82e73fe8e41',
  '2026-08-07'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900044'
);

-- No CSV 47: ALIMUDIN 1985 | Daily Worker Traffic
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  'badb2a97-4d9e-4b90-86c2-ad056bc37a1a',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900045',
  '3201261012850003',
  'ALIMUDIN',
  '1985',
  'dw.900045@hrms-local.eigeradventureland.com',
  '+6283806482243',
  'K/3',
  'Kp. Lemahneundeut RT 004 RW 004 Kelurahan Sukagalih Kecamatan Megamendung Kabupaten Bogor',
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f63d4628-afc4-4730-99fc-651571660d32',
  '996882bd-7344-441b-a5b1-a82e73fe8e41',
  '2026-08-07'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900045'
);

-- No CSV 48: ALPIN MAULANA | Daily Worker Traffic
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  '99adfb14-0a67-4b01-9669-ac586c10637e',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900046',
  '3202091008980003',
  'ALPIN',
  'MAULANA',
  'dw.900046@hrms-local.eigeradventureland.com',
  '+6285719131621',
  'TK/0',
  'Kp. Bantarkalong RT 001 RW 001 Kelurahan Hegarmanah Kecamatan Warung Kiara Kabupaten Sukabumi',
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f63d4628-afc4-4730-99fc-651571660d32',
  '996882bd-7344-441b-a5b1-a82e73fe8e41',
  '2026-08-07'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900046'
);

-- No CSV 49: ERI IRAWAN | Daily Worker Traffic
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  '4abf25b9-76e9-45d9-b083-a02bd7ff979d',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900047',
  '3201261706020003',
  'ERI',
  'IRAWAN',
  'dw.900047@hrms-local.eigeradventureland.com',
  '+6283846757615',
  'TK/0',
  'Kp. Coblong RT 004 RW 001 Kelurahan Sukagalih Kecamatan Megamendung Kabupaten Bogor',
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f63d4628-afc4-4730-99fc-651571660d32',
  '996882bd-7344-441b-a5b1-a82e73fe8e41',
  '2026-08-07'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900047'
);

-- No CSV 50: NIFTAH SOLAHUDIN | Daily Worker Traffic
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  '04e8fb63-2bde-4e7e-93d4-3263896c545d',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900048',
  '3201261906860006',
  'NIFTAH',
  'SOLAHUDIN',
  'dw.900048@hrms-local.eigeradventureland.com',
  '+6287860469149',
  'K/2',
  'Kp. Lemahneundeut RT 003 RW 004 Kelurahan Sukagalih Kecamatan Megamendung Kabupaten Bogor',
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f63d4628-afc4-4730-99fc-651571660d32',
  '996882bd-7344-441b-a5b1-a82e73fe8e41',
  '2026-08-07'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900048'
);

-- No CSV 51: ARIYA RIZKI SAPUTRA | Daily Worker Traffic
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  '90fc0853-35f7-4a9d-8e88-0beaf044dad5',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900049',
  '3201250107030035',
  'ARIYA RIZKI',
  'SAPUTRA',
  'dw.900049@hrms-local.eigeradventureland.com',
  '+6285719437664',
  'TK/0',
  'kp. Cidokom RT 002 RW 009 Kelurahan Kopo Kecamatan Cisarua Kabupaten Bogor',
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f63d4628-afc4-4730-99fc-651571660d32',
  '996882bd-7344-441b-a5b1-a82e73fe8e41',
  '2026-08-07'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900049'
);

-- No CSV 52: MOCH. MULYANA | Daily Worker Traffic
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  'a9a25c54-2048-4f56-a01c-6a21c0fd867f',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900050',
  '3201261207930006',
  'MOCH.',
  'MULYANA',
  'dw.900050@hrms-local.eigeradventureland.com',
  '+6283126526171',
  'K/0',
  'Kp. Lemah Neundeut RT 004 RW 003 Kelurahan Sukagalih Kecamatan Megamendung Kabupaten Bogor',
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f63d4628-afc4-4730-99fc-651571660d32',
  '996882bd-7344-441b-a5b1-a82e73fe8e41',
  '2026-08-07'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900050'
);

-- No CSV 53: ABDUL ARIPIN | Daily Worker Traffic
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  '53d2a615-0d20-4b82-88a5-f4e470393e81',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900051',
  '3201262703810002',
  'ABDUL',
  'ARIPIN',
  'dw.900051@hrms-local.eigeradventureland.com',
  '+6283105589213',
  'K/2',
  'Kp. Lemahneundeut RT 005 RW 004 Kelurahan Sukagalih Kecamatan Megamendung Kabupaten Bogor',
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f63d4628-afc4-4730-99fc-651571660d32',
  '996882bd-7344-441b-a5b1-a82e73fe8e41',
  '2026-08-07'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900051'
);

-- No CSV 54: HASAN - | Daily Worker Traffic
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  '49825892-aa7d-435e-9e1f-1afd33bcbecd',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900052',
  '3201260706000004',
  'HASAN',
  '-',
  'dw.900052@hrms-local.eigeradventureland.com',
  '+6283143267652',
  'K/2',
  'Kp. Bojong Keji RT 004 RW 003 Kelurahan Sukagalih Kecamatan Megamendung Kabupaten Bogor',
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f63d4628-afc4-4730-99fc-651571660d32',
  '996882bd-7344-441b-a5b1-a82e73fe8e41',
  '2026-08-07'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900052'
);

-- No CSV 55: ELAN MAULANA | Daily Worker Traffic
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  '804bf0d7-f66c-4324-8f5d-7c9d30633ca2',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900053',
  '3201261902980001',
  'ELAN',
  'MAULANA',
  'dw.900053@hrms-local.eigeradventureland.com',
  '+6283838407613',
  'K/1',
  'Kp. Lemahneundeut RT 005 RW 004 Kelurahan Sukagalih Kecamatan Megamendung Kabupaten Bogor',
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f63d4628-afc4-4730-99fc-651571660d32',
  '996882bd-7344-441b-a5b1-a82e73fe8e41',
  '2026-08-07'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900053'
);

-- No CSV 56: HERDIAN NUGYANTO | Daily Worker Traffic
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  '9912bd7c-7a7e-4702-8a76-002ddc6f8dc0',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900054',
  '3217072611950006',
  'HERDIAN',
  'NUGYANTO',
  'dw.900054@hrms-local.eigeradventureland.com',
  '+62895336292010',
  'K/2',
  'Kp. Bojong Keji RT 004 RW 003 Kelurahan Sukagalih Kecamatan Megamendung Kabupaten Bogor',
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f63d4628-afc4-4730-99fc-651571660d32',
  '996882bd-7344-441b-a5b1-a82e73fe8e41',
  '2026-08-07'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900054'
);

-- No CSV 57: FAISAL - | Daily Worker Traffic
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  '38f9cd53-d9ab-4b67-a883-fd5bf5426822',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900055',
  '3201263105850002',
  'FAISAL',
  '-',
  'dw.900055@hrms-local.eigeradventureland.com',
  '+6281213036081',
  'TK/0',
  'Kp. Lemahneundeut RT 003 RW 004 Kelurahan Sukagalih Kecamatan Megamendung kabupaten Bogor',
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f63d4628-afc4-4730-99fc-651571660d32',
  '996882bd-7344-441b-a5b1-a82e73fe8e41',
  '2026-08-07'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900055'
);

-- No CSV 58: AZHAR ZAELANI | Daily Worker Traffic
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  '89130a01-c9da-47dd-9b7c-701490767f88',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900056',
  '3201292007950002',
  'AZHAR',
  'ZAELANI',
  'dw.900056@hrms-local.eigeradventureland.com',
  '+6285782832467',
  'K/1',
  'Kp. Cibinong RT 003 RW 002 Kelurahan Ciapus Kecamatan Ciomas Kabupaten Bogor',
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f63d4628-afc4-4730-99fc-651571660d32',
  '996882bd-7344-441b-a5b1-a82e73fe8e41',
  '2026-08-07'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900056'
);

-- No CSV 59: DENI RAHMAT SELAMET ASKAR | Daily Worker Traffic
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  '1d023555-6b61-4844-8d43-f3cc2489dd7e',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900057',
  '3271012501700001',
  'DENI RAHMAT SELAMET',
  'ASKAR',
  'dw.900057@hrms-local.eigeradventureland.com',
  '+6281398625328',
  'K/2',
  'Bendungan RT 004 RW 003 Kelurahan Bendungan Kecamatan Ciawi Kabupaten Bogor',
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f63d4628-afc4-4730-99fc-651571660d32',
  '996882bd-7344-441b-a5b1-a82e73fe8e41',
  '2026-08-07'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900057'
);

-- No CSV 60: ASEP MAULANA | Daily Worker Traffic
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  'f4261592-b7f6-4297-8251-0c7e8f61b8c2',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900058',
  '3201261206950002',
  'ASEP',
  'MAULANA',
  'dw.900058@hrms-local.eigeradventureland.com',
  '+6289663935518',
  'K/2',
  'Kp. Babakan RT 006 RW 003 Kelurahan Kuta Kecamatan Megamendung Kabupaten Bogor',
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f63d4628-afc4-4730-99fc-651571660d32',
  '996882bd-7344-441b-a5b1-a82e73fe8e41',
  '2026-08-07'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900058'
);

-- No CSV 61: HERMAWAN - | Daily Worker Traffic
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  '01b70a1e-bc10-4736-94d2-b8134dcba44e',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900059',
  '3201261605980001',
  'HERMAWAN',
  '-',
  'dw.900059@hrms-local.eigeradventureland.com',
  '+6283813675429',
  'TK/0',
  'Kp. Waru Doyong RT 002 RW 001 Kelurahan Kuta Kecamatan Megamendung Kabupaten Bogor',
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f63d4628-afc4-4730-99fc-651571660d32',
  '996882bd-7344-441b-a5b1-a82e73fe8e41',
  '2026-08-07'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900059'
);

-- No CSV 62: MOCHAMMAD FEZZER AGUS SUBANDI | Daily Worker Traffic
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  'f32e97f1-a5df-486e-a2d8-998f32d8fb05',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900060',
  '3201282412010001',
  'MOCHAMMAD FEZZER AGUS',
  'SUBANDI',
  'dw.900060@hrms-local.eigeradventureland.com',
  '+62895411763599',
  'TK/0',
  'Kp. Cimenteng RT 003 RW 001 Kelurahan Warung Menteng Kecamatan Cijeruk Kabupaten Bogor',
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f63d4628-afc4-4730-99fc-651571660d32',
  '996882bd-7344-441b-a5b1-a82e73fe8e41',
  '2026-08-07'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900060'
);

-- No CSV 63: ERYAWAN SETIAWAN | Daily Worker Traffic
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  '2a6978f5-4fcc-42b2-8b21-6b04d9dfbb46',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900061',
  '3201260909840004',
  'ERYAWAN',
  'SETIAWAN',
  'dw.900061@hrms-local.eigeradventureland.com',
  '+6283862473699',
  'TK/0',
  'Kp. Cihanjawar RT 005 RW 002 Kelurahan Sukagalih Kecamatan Megamendung Kabupaten Bogor',
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f63d4628-afc4-4730-99fc-651571660d32',
  '996882bd-7344-441b-a5b1-a82e73fe8e41',
  '2026-08-07'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900061'
);

-- No CSV 64: MOCH FIKI FIRMANSYAH | Daily Worker Traffic
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  '28035eaf-f1e6-4652-bcb7-b46e33cef5c0',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900062',
  '3201262107990006',
  'MOCH FIKI',
  'FIRMANSYAH',
  'dw.900062@hrms-local.eigeradventureland.com',
  '+6282211050778',
  'TK/0',
  'Kp. Lemahneundeut RT 003 RW 004 Kelurahan Sukagalih Kecamatan Megamendung Kabupaten Bogor',
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f63d4628-afc4-4730-99fc-651571660d32',
  '996882bd-7344-441b-a5b1-a82e73fe8e41',
  '2026-08-07'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900062'
);

-- No CSV 65: ALDIANSYAH - | Daily Worker Traffic
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  'af928346-f94a-4615-bcb3-2da30774fbbe',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900063',
  '3201263001020002',
  'ALDIANSYAH',
  '-',
  'dw.900063@hrms-local.eigeradventureland.com',
  '+6283830906658',
  'TK/0',
  'Kp. Lemah Neundeut rt05/rw04 Sukagalih, Megamendung',
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f63d4628-afc4-4730-99fc-651571660d32',
  '996882bd-7344-441b-a5b1-a82e73fe8e41',
  '2026-08-07'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900063'
);

-- No CSV 66: FARHANUL IKBAL RAMADHAN | Daily Worker Traffic
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  'dfb1ca52-180e-44a4-91b9-4e64b55dd02d',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900064',
  '3201242311980003',
  'FARHANUL IKBAL',
  'RAMADHAN',
  'dw.900064@hrms-local.eigeradventureland.com',
  '+6289516973665',
  'TK/0',
  'Kp. Bendungan Rt 002 Rw 001 Kel. Bendungan Kec. Ciawi',
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f63d4628-afc4-4730-99fc-651571660d32',
  '996882bd-7344-441b-a5b1-a82e73fe8e41',
  '2026-09-02'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900064'
);

-- No CSV 67: HENDY HERDINANDES | Daily Worker Traffic
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  '3b64f4c9-1757-43f4-af64-24ef650e9aa7',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900065',
  '3201291712880004',
  'HENDY',
  'HERDINANDES',
  'dw.900065@hrms-local.eigeradventureland.com',
  '+6285282918801',
  'K/1',
  'Kp Sukabirius Rt 001 Rw 001 Kel, Sukamahi Kec. Megamendung - Bogor',
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f63d4628-afc4-4730-99fc-651571660d32',
  '996882bd-7344-441b-a5b1-a82e73fe8e41',
  '2026-09-02'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900065'
);

-- No CSV 68: USUP SUPRIADI | Daily Worker Traffic
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  '56741597-8e4c-47f5-9730-a3540cd116b5',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900066',
  '3201260512990007',
  'USUP',
  'SUPRIADI',
  'dw.900066@hrms-local.eigeradventureland.com',
  '+6285881896799',
  'TK/0',
  'Kp. Lemahneundeut Rt 002 Rw 004 Kel. Sukagalih Kec. Megamendung - Bogor',
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f63d4628-afc4-4730-99fc-651571660d32',
  '996882bd-7344-441b-a5b1-a82e73fe8e41',
  '2026-09-02'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900066'
);

-- No CSV 69: MOCHAMAD RENDIANSYAH | Daily Worker Traffic
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  '47ef5db3-9aaa-4cf0-bf0b-e5d36a98ecb9',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900067',
  '3201250906020006',
  'MOCHAMAD',
  'RENDIANSYAH',
  'dw.900067@hrms-local.eigeradventureland.com',
  '+628381016654',
  'TK/0',
  'Kp. Tugu Rt 001 Rw 001 Kel. Tugu Utara Kec. Cisarua Bogor',
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f63d4628-afc4-4730-99fc-651571660d32',
  '996882bd-7344-441b-a5b1-a82e73fe8e41',
  '2026-09-02'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900067'
);

-- No CSV 70: MUHAMAD GILANG SAPUTRA | Daily Worker Traffic
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  '597fda58-3472-4932-9cd2-16cc17a0b219',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900068',
  '3201260706060002',
  'MUHAMAD GILANG',
  'SAPUTRA',
  'dw.900068@hrms-local.eigeradventureland.com',
  '+6281574616127',
  'TK/0',
  'Kp, Jawa Rt 002 Rw 003 Kel. Sukamaju Kec. Megamendung',
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f63d4628-afc4-4730-99fc-651571660d32',
  '996882bd-7344-441b-a5b1-a82e73fe8e41',
  '2026-09-02'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900068'
);

-- No CSV 71: ADE RUSMANA | Daily Worker Traffic
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  'e74b8c62-2a60-44cf-a791-a722ec8c93ce',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900069',
  '3201251802810002',
  'ADE',
  'RUSMANA',
  'dw.900069@hrms-local.eigeradventureland.com',
  '+6283891807211',
  'K/2',
  'Kp. Leuwimalang Rt 003 Rw 001 Kel. Leuwimalang Kec. CIsarua',
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f63d4628-afc4-4730-99fc-651571660d32',
  '996882bd-7344-441b-a5b1-a82e73fe8e41',
  '2026-09-02'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900069'
);

-- No CSV 72: M HERLAN JAELANI | Daily Worker Traffic
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  '32a9f21d-bded-4027-9d72-efbf678494a9',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900070',
  '3201262007860001',
  'M HERLAN',
  'JAELANI',
  'dw.900070@hrms-local.eigeradventureland.com',
  '+6285719198804',
  'TK/0',
  NULL,
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f63d4628-afc4-4730-99fc-651571660d32',
  '996882bd-7344-441b-a5b1-a82e73fe8e41',
  '2026-09-02'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900070'
);

-- No CSV 73: MUHAMAD DANDI | Daily Worker Traffic
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  '168af027-704f-4e52-8a2a-9521b613bb5c',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900071',
  '3201262709000002',
  'MUHAMAD',
  'DANDI',
  'dw.900071@hrms-local.eigeradventureland.com',
  '+6285122972069',
  'TK/0',
  'Kp. pasir Kalong Rt 002 Rw 003 Kel. Sukakarya Kec. megamendung ''',
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f63d4628-afc4-4730-99fc-651571660d32',
  '996882bd-7344-441b-a5b1-a82e73fe8e41',
  '2026-09-02'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900071'
);

-- No CSV 74: FAJAR AULIA RAHMAN | Daily Worker Traffic
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  '819860be-a6ee-4102-a517-c75c73b1f2f9',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900072',
  '3201243103960004',
  'FAJAR AULIA',
  'RAHMAN',
  'dw.900072@hrms-local.eigeradventureland.com',
  '+6285692923333',
  NULL,
  NULL,
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f63d4628-afc4-4730-99fc-651571660d32',
  '996882bd-7344-441b-a5b1-a82e73fe8e41',
  '2026-09-02'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900072'
);

-- No CSV 75: MUHAMAD ROSIYANA | Daily Worker Traffic
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  '5ba33d2d-93fa-4649-9e0a-a3ad7937f7cd',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900073',
  '3201261603030003',
  'MUHAMAD',
  'ROSIYANA',
  'dw.900073@hrms-local.eigeradventureland.com',
  '+6283893131810',
  'TK/0',
  'Kp. Lemahneundeut Rt 001 Rw 004 Kel, Sukagalih Kec. Megamendung',
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f63d4628-afc4-4730-99fc-651571660d32',
  '996882bd-7344-441b-a5b1-a82e73fe8e41',
  '2026-09-02'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900073'
);

-- No CSV 76: MUHAMAD WISNU | Daily Worker Traffic
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  'd473275b-35f0-44b9-b39e-4b5b380f094a',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900074',
  '3201241502010001',
  'MUHAMAD',
  'WISNU',
  'dw.900074@hrms-local.eigeradventureland.com',
  '+6285892218010',
  'TK/0',
  NULL,
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f63d4628-afc4-4730-99fc-651571660d32',
  '996882bd-7344-441b-a5b1-a82e73fe8e41',
  '2026-09-02'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900074'
);

-- No CSV 77: MUHAMAD FARHANUDIN | Daily Worker Traffic
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  '4d596f82-1fad-4a23-8be0-7443ab1684b2',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900075',
  '3201263103030001',
  'MUHAMAD',
  'FARHANUDIN',
  'dw.900075@hrms-local.eigeradventureland.com',
  '+6285715105419',
  'TK/0',
  'Kp. Bojongkeji Rt 003 Rw 003 Kel. Sukagalih Kec. Megamendung - Bogor',
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f63d4628-afc4-4730-99fc-651571660d32',
  '996882bd-7344-441b-a5b1-a82e73fe8e41',
  '2026-09-02'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900075'
);

-- No CSV 78: MUHAMAD IKBAL SAPUTRA | Daily Worker Traffic
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  '69533ab1-d55b-420b-aaa9-8b1af9827d07',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900076',
  '3201311106920002',
  'MUHAMAD IKBAL',
  'SAPUTRA',
  'dw.900076@hrms-local.eigeradventureland.com',
  '+6283109845794',
  'K/2',
  'Kp. Cisarua Dalam Rt 005 Rw 006 Kel. Kopo Kec. Cisarua',
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f63d4628-afc4-4730-99fc-651571660d32',
  '996882bd-7344-441b-a5b1-a82e73fe8e41',
  '2026-09-02'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900076'
);

-- No CSV 79: DEDE YUNUS | Daily Worker Engineering
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  'c76bec32-20a4-4d99-a26d-c0ee160b3426',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900077',
  '3201260711960002',
  'DEDE',
  'YUNUS',
  'dw.900077@hrms-local.eigeradventureland.com',
  '+6289507904352',
  'TK/0',
  'Kp. CIhanjawar RT 001 RW 003 Kelurahan Sukagalih Kecamatan Megamendung Kabupaten Bogor',
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f54e8a8a-a6d2-41c6-91de-9c8a1cc3057c',
  '9da2c2ef-b076-4719-bec7-7233bf2cf927',
  '2028-08-07'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900077'
);

-- No CSV 80: HENDI - | Daily Worker Engineering
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  '8bb992b2-83f4-48e7-a063-7532d688ad73',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900078',
  '3201262406970005',
  'HENDI',
  '-',
  'dw.900078@hrms-local.eigeradventureland.com',
  '+6283878309446',
  'K/1',
  'Kp. Siliwangi RT 004 RW 003 Keluraham Cigombong Kecamatan Cigombong kabupaten Bogor',
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f54e8a8a-a6d2-41c6-91de-9c8a1cc3057c',
  '9da2c2ef-b076-4719-bec7-7233bf2cf927',
  '2028-08-07'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900078'
);

-- No CSV 81: DURAHMAN - | Daily Worker Engineering
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  '951eac21-4297-4026-9abe-a2e92073cf02',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900079',
  '3201261601940001',
  'DURAHMAN',
  '-',
  'dw.900079@hrms-local.eigeradventureland.com',
  '+6281400693196',
  'K/2',
  'Kp. Coblong RT 004 RW 001 Kelurahan Sukakarya Kecamatan Megamendung Kabupaten Bogor',
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f54e8a8a-a6d2-41c6-91de-9c8a1cc3057c',
  '9da2c2ef-b076-4719-bec7-7233bf2cf927',
  '2028-08-07'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900079'
);

-- No CSV 82: IBAM SETIAWAN | Daily Worker Engineering
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  'c3ff961d-8a59-4465-9637-56c5c72f9a45',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900080',
  '3201242103961001',
  'IBAM',
  'SETIAWAN',
  'dw.900080@hrms-local.eigeradventureland.com',
  '+6289670747312',
  'K/1',
  'Kp. Lebak Pilar RT 002 RW 004 Kelurahan Bendungan Kecamatan Ciawi Kabupaten Bogor',
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f54e8a8a-a6d2-41c6-91de-9c8a1cc3057c',
  '9da2c2ef-b076-4719-bec7-7233bf2cf927',
  '2028-08-07'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900080'
);

-- No CSV 83: MUHAMAD IRPAN FAUJI | Daily Worker Engineering
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  '0db6490e-9efb-4869-b741-2b827baeda56',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900081',
  '3201240909990018',
  'MUHAMAD IRPAN',
  'FAUJI',
  'dw.900081@hrms-local.eigeradventureland.com',
  '+6281280593317',
  'TK/0',
  'Kp. Lebak Gudang RT 003 RW 011 Kelurahan Bendungan Kecamatan Ciawi Kabupaten Bogor',
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f54e8a8a-a6d2-41c6-91de-9c8a1cc3057c',
  '9da2c2ef-b076-4719-bec7-7233bf2cf927',
  '2028-08-07'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900081'
);

-- No CSV 84: MUKHLISAN - | Daily Worker Engineering
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  '22a93bd8-9ea4-48ef-b31f-8106278ac34f',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900082',
  '3201261602850003',
  'MUKHLISAN',
  '-',
  'dw.900082@hrms-local.eigeradventureland.com',
  '+6283897221956',
  'K/2',
  'Kp. Lemahneundeut RT 005 RW 004 Kelurahan SUkagalih Kecamatan Megamendung Kabupaten Bogor',
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f54e8a8a-a6d2-41c6-91de-9c8a1cc3057c',
  '9da2c2ef-b076-4719-bec7-7233bf2cf927',
  '2028-08-07'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900082'
);

-- No CSV 85: DENI IRAWAN | Daily Worker Engineering
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  '0253aee8-cf0c-403f-a7a8-85054fde0134',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900083',
  '3201261105980003',
  'DENI',
  'IRAWAN',
  'dw.900083@hrms-local.eigeradventureland.com',
  '+6283837572448',
  'K/2',
  'Kp. Lemahneundeut RT 003 RW 004 Kelurahan Sukagalih Kecamatan Megamendung Kabupaten Bogor',
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f54e8a8a-a6d2-41c6-91de-9c8a1cc3057c',
  '9da2c2ef-b076-4719-bec7-7233bf2cf927',
  '2028-08-07'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900083'
);

-- No CSV 86: ANASTASYA RAMADHANI | Adventure Guide
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  '86300762-0356-455b-9b1b-86ef0b50b93f',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900084',
  '3201262411060001',
  'ANASTASYA',
  'RAMADHANI',
  'dw.900084@hrms-local.eigeradventureland.com',
  '+6281290238835',
  'TK/0',
  'Kp. Lemahneundeut RT 002 RW 004 Kelurahan Sukagalih Kecamatan Megamendung Kabupaten Bogor',
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f63d4628-afc4-4730-99fc-651571660d32',
  '43941f3a-9ac5-4276-b765-bdd982ab0318',
  '2028-08-07'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900084'
);

-- No CSV 87: AVRILYA DIANTY | Adventure Guide
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  '5d573a17-ff3d-4553-b544-74c79c56a23b',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900085',
  '3201255204070007',
  'AVRILYA',
  'DIANTY',
  'dw.900085@hrms-local.eigeradventureland.com',
  '+6283805845243',
  'TK/0',
  'Kp. Cipari RT 004 RW 003 Kelurahan Leuwimalang Kecamatan Cisarua Kabupaten Bogor',
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f63d4628-afc4-4730-99fc-651571660d32',
  '43941f3a-9ac5-4276-b765-bdd982ab0318',
  '2028-08-07'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900085'
);

-- No CSV 88: KUSNADI - | Daily Worker Attraction-Experience Host
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  'c62c76bc-c1cc-47e9-b7e2-531b7416694f',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900086',
  '3201260607030007',
  'KUSNADI',
  '-',
  'dw.900086@hrms-local.eigeradventureland.com',
  '+6285719173643',
  'TK/0',
  'Kp. Bojongkeji RT 003 RW 003 Kelurahan SUkagalih Kecamatan Megamendung Kabupaten Bogor',
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f63d4628-afc4-4730-99fc-651571660d32',
  '0096184f-ec46-46e3-b200-11be57750b69',
  '2028-08-07'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900086'
);

-- No CSV 89: SEVIRA OKTAVIANI | Daily Worker Attraction-Experience Host
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  '840a5234-ae36-4fd1-a5a0-2e74b4eb62b7',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900087',
  '3201244310010012',
  'SEVIRA',
  'OKTAVIANI',
  'dw.900087@hrms-local.eigeradventureland.com',
  '+6289630897902',
  'TK/0',
  'Bendungan RT 003 RW 003 Kelurahan Bendungan Kecamatan Ciawi Kabupaten Bogor',
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f63d4628-afc4-4730-99fc-651571660d32',
  '0096184f-ec46-46e3-b200-11be57750b69',
  '2028-08-07'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900087'
);

-- No CSV 90: SITI JAOJAH | Adventure Guide
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  '236bfb49-6d42-45ae-bed1-f84eaa4ad6e4',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900088',
  '3201266205070003',
  'SITI',
  'JAOJAH',
  'dw.900088@hrms-local.eigeradventureland.com',
  '+6283834628037',
  'TK/0',
  'Kp, Situ Rt 003 Rw 001 Kel. Sukaresmi Kec. Megamendung ''',
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f63d4628-afc4-4730-99fc-651571660d32',
  '43941f3a-9ac5-4276-b765-bdd982ab0318',
  '2026-08-26'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900088'
);

-- No CSV 91: SITI FATIMAH AZ-ZAHRA | Daily Worker Attraction-Experience Host
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  '6e9a9531-aba7-4b27-8067-c38ccd5ecb72',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900089',
  '3201265411040007',
  'SITI FATIMAH',
  'AZ-ZAHRA',
  'dw.900089@hrms-local.eigeradventureland.com',
  '+6283159026751',
  'TK/0',
  'Kp, Lemahneundeut Rt 004 Rw 004 Kel, Sukagalih Kec. megamendung',
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f63d4628-afc4-4730-99fc-651571660d32',
  '0096184f-ec46-46e3-b200-11be57750b69',
  '2026-08-26'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900089'
);

-- No CSV 92: ERIANSYAH ERANGGA | Daily Worker Attraction-Experience Host
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  '9563cb67-4001-434f-900e-8e87996c5abd',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900090',
  '3201260804010001',
  'ERIANSYAH',
  'ERANGGA',
  'dw.900090@hrms-local.eigeradventureland.com',
  '+62895704258264',
  'TK/0',
  'Kp. Cihanjawar Rt 001 Rw 003 Kel, Sukagalih Kec. Megamendung',
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f63d4628-afc4-4730-99fc-651571660d32',
  '0096184f-ec46-46e3-b200-11be57750b69',
  '2026-09-16'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900090'
);

-- No CSV 93: M RAMDAN WIGUNA | Daily Worker Attraction-Experience Host
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  'bae63ba9-5185-4429-8f37-a31073c752ad',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900091',
  '3201261710050006',
  'M RAMDAN',
  'WIGUNA',
  'dw.900091@hrms-local.eigeradventureland.com',
  '+6283194378254',
  'TK/0',
  'Kp. Pasirmuncang Rt 004 Rw 001 Kel. Sukamanah Kec. Megamendung',
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f63d4628-afc4-4730-99fc-651571660d32',
  '0096184f-ec46-46e3-b200-11be57750b69',
  '2026-09-16'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900091'
);

-- No CSV 94: ADELITA SAFIRA | Daily Worker Attraction-Experience Host
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  'da5be320-9224-4323-a85b-b27edd5ad833',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900092',
  '3201264702020002',
  'ADELITA',
  'SAFIRA',
  'dw.900092@hrms-local.eigeradventureland.com',
  '+6281517172508',
  'TK/0',
  'Kp. pasir Muncang Rt 002 Rw 001 Kel. Sukamanah kec. Megamendung',
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f63d4628-afc4-4730-99fc-651571660d32',
  '0096184f-ec46-46e3-b200-11be57750b69',
  '2026-09-16'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900092'
);

-- No CSV 95: TSABITH ALZAMKY | Adventure Guide
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  'b396b9d8-c9de-4a2f-b94d-45850b554ae7',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900093',
  '3201251101080002',
  'TSABITH',
  'ALZAMKY',
  'dw.900093@hrms-local.eigeradventureland.com',
  '+6289502385691',
  'TK/0',
  'Kp. Cipari Rt 004 Rw 003 Kel. Leuwimalang Kec. Cisarua',
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f63d4628-afc4-4730-99fc-651571660d32',
  '43941f3a-9ac5-4276-b765-bdd982ab0318',
  '2026-09-16'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900093'
);

-- No CSV 96: ANISA NURAENI | Daily Worker Ticketing
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  '9b40ecee-ae04-4c9c-8508-5c838c62351e',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900094',
  '3201266304070008',
  'ANISA',
  'NURAENI',
  'dw.900094@hrms-local.eigeradventureland.com',
  '+6282114667393',
  'TK/0',
  'Kp. Lemahneundeut RT 001 RW 004 Kelurahan Sukagalih Kecamatan Megamendung Kabupaten Bogor',
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f63d4628-afc4-4730-99fc-651571660d32',
  '5d1c243d-c5dd-46a2-8662-b7e8bf30df5e',
  '2026-08-10'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900094'
);

-- No CSV 97: SITI DEVA IRIANTI | Daily Worker Ticketing
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  'f8632e4a-7a4b-43fa-8357-933a00b59f3c',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900095',
  '3201264407050001',
  'SITI DEVA',
  'IRIANTI',
  'dw.900095@hrms-local.eigeradventureland.com',
  '+6283875133338',
  'TK/0',
  'Kp. CIhanjawar RT 004 RW 002 Kelurahan Sukagalih Kecamatan Megamendung Kabupaten Bogor',
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f63d4628-afc4-4730-99fc-651571660d32',
  '5d1c243d-c5dd-46a2-8662-b7e8bf30df5e',
  '2026-08-10'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900095'
);

-- No CSV 98: MUHAMAD MUGNI SAPUTRA | Daily Worker Ticketing
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  'd3b4ad25-057a-49d6-9377-3b36477101ff',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900096',
  '3201260705060002',
  'MUHAMAD MUGNI',
  'SAPUTRA',
  'dw.900096@hrms-local.eigeradventureland.com',
  '+628138214125',
  'TK/0',
  'Kp. Pasir Kalong RT 002 RW 005 Kelurahan Sukakarya Kecamatan Megamendung Kabupaten Bogor',
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f63d4628-afc4-4730-99fc-651571660d32',
  '5d1c243d-c5dd-46a2-8662-b7e8bf30df5e',
  '2026-08-10'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900096'
);

-- No CSV 99: SITI ELSA STEVANDI | Daily Worker Ticketing
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  '5df90078-3f6d-4d54-863b-4ef29d3940a8',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900097',
  '3201266307050006',
  'SITI ELSA',
  'STEVANDI',
  'dw.900097@hrms-local.eigeradventureland.com',
  '+6283806481791',
  'TK/0',
  'Kp. Lemahneundeut RT 004 RW 004 Kelurahan Sukagalih Kecamatan Megamendung Kabupaten Bogor',
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f63d4628-afc4-4730-99fc-651571660d32',
  '5d1c243d-c5dd-46a2-8662-b7e8bf30df5e',
  '2026-08-10'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900097'
);

-- No CSV 100: SITI HANA ZYAH | Daily Worker Ticketing
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  'c998abde-d6ac-49d5-a0c2-24c4f3cf7da1',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900098',
  '3201265105070002',
  'SITI HANA',
  'ZYAH',
  'dw.900098@hrms-local.eigeradventureland.com',
  '+6283101432311',
  'TK/0',
  'Kp. Sirnagalih Rt 003 Rw 001 Kel. megamendung Kec. Megamendung',
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f63d4628-afc4-4730-99fc-651571660d32',
  '5d1c243d-c5dd-46a2-8662-b7e8bf30df5e',
  '2026-09-21'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900098'
);

-- No CSV 101: SITI HELDA AULIA | Daily Worker Ticketing
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  '79e1336d-c63b-4a0d-9cd4-51b84924e650',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900099',
  '3201246209050004',
  'SITI HELDA',
  'AULIA',
  'dw.900099@hrms-local.eigeradventureland.com',
  '+6285846722005',
  'TK/0',
  'Kp. Pangkalan Rt 006 Rw 003 Kel. Citeras Kec. Malangbong',
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f63d4628-afc4-4730-99fc-651571660d32',
  '5d1c243d-c5dd-46a2-8662-b7e8bf30df5e',
  '2026-09-21'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900099'
);

-- No CSV 102: ADITIA PRAYOGA | Daily Worker Ticketing
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  '5973c638-4ebc-4f14-95cd-caf8bebbd384',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900100',
  '3201241401060004',
  'ADITIA',
  'PRAYOGA',
  'dw.900100@hrms-local.eigeradventureland.com',
  '+6285771089630',
  'TK/0',
  'Kp. Ciawi Girang Rt 001 Rw 003 Kel. Ciawi Kec. Ciawi',
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f63d4628-afc4-4730-99fc-651571660d32',
  '5d1c243d-c5dd-46a2-8662-b7e8bf30df5e',
  '2026-09-21'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900100'
);

-- No CSV 103: MOCHAMAD RIFQI MAULANA PADILAH | Cook Helper
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  'b35a5d20-9e76-4f4d-a53d-8356d06dc327',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900101',
  '3201250605040003',
  'MOCHAMAD RIFQI MAULANA',
  'PADILAH',
  'dw.900101@hrms-local.eigeradventureland.com',
  '+62881011126467',
  'TK/0',
  'Jl. Pancamarga RT 001 RW 015 Kelurahan Tugu Selatan Kecamatan Cisarua Kabupaten Bogor',
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  '208644c4-f3f7-495d-a23e-94bc1551f7ce',
  '4937a517-c854-46fb-9f66-874ee4746ff1',
  '2026-08-18'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900101'
);

-- No CSV 104: WENI NUR ANGGRAENI | Cook Helper
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  'f6fa5695-4c7f-4fce-830b-a36a1b079206',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900102',
  '3217026409080001',
  'WENI NUR',
  'ANGGRAENI',
  'dw.900102@hrms-local.eigeradventureland.com',
  '+6283192881710',
  'TK/0',
  'Kp. Cihideung RT 001 RW 008 Kelurahan Cihideung Kecamatan parongpong Kabupaten Bandung Barat',
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  '208644c4-f3f7-495d-a23e-94bc1551f7ce',
  '4937a517-c854-46fb-9f66-874ee4746ff1',
  '2026-08-18'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900102'
);

-- No CSV 105: ALDI ATORIP | Cook Helper
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  '9d027d79-e62b-46a0-8434-0111d6359a62',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900103',
  '3201261008050003',
  'ALDI',
  'ATORIP',
  'dw.900103@hrms-local.eigeradventureland.com',
  '+6285771089139',
  'TK/0',
  'Kp. CInangka RT 001 RW 002 Kelurahan Cipayung Girang Kecamatan Megamendung Kabupaten Bogor',
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  '208644c4-f3f7-495d-a23e-94bc1551f7ce',
  '4937a517-c854-46fb-9f66-874ee4746ff1',
  '2026-08-18'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900103'
);

-- No CSV 106: MUHAMAD YUDA WIJAYA | Cook Helper
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  '069e160e-27f3-4ed0-9179-eaf0b69634d1',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900104',
  '3201261002000002',
  'MUHAMAD YUDA',
  'WIJAYA',
  'dw.900104@hrms-local.eigeradventureland.com',
  NULL,
  'Tk/0',
  'Kp. Cihanjawar Rt 004 Rw 002 Kel. Sukagalih Kec. Megamendung',
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  '208644c4-f3f7-495d-a23e-94bc1551f7ce',
  '4937a517-c854-46fb-9f66-874ee4746ff1',
  '2026-09-15'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900104'
);

-- No CSV 108: M AGUNG SUPRIADI | RUNNER
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  'bae5ddab-b438-4dd5-8df1-6a1f074b71d2',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900105',
  '3201261808060006',
  'M AGUNG',
  'SUPRIADI',
  'dw.900105@hrms-local.eigeradventureland.com',
  '+6283832176628',
  'Tk/0',
  'Kp. Lemahneundeut Rt 004 Rw 004 Kel, Sukagalih kec. megamendung',
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'baed727e-2c27-4359-9e30-3c9c28ce6a7a',
  '5a03de43-b594-4826-b591-26a2dd7b6160',
  '2026-09-14'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900105'
);

-- No CSV 109: MUHAMAD ANJAH | Steward
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  '7ef94113-a3ef-477c-b50a-9c8e71c573bf',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900106',
  '3201261412990006',
  'MUHAMAD',
  'ANJAH',
  'dw.900106@hrms-local.eigeradventureland.com',
  '+628811315670',
  'K/0',
  'Kp. Goleah Rt 002 RW 002 Kel. Sukagalih Kec.Megamendung',
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  '208644c4-f3f7-495d-a23e-94bc1551f7ce',
  '197eb623-58a5-48af-b61b-ccf33f35134d',
  '2026-09-14'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900106'
);

-- No CSV 110: M RIVALDI SAPUTRA | Waiter
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  '5266dee6-d863-46d3-85d5-f2e0a3c7f06a',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900107',
  '3201261704950001',
  'M RIVALDI',
  'SAPUTRA',
  'dw.900107@hrms-local.eigeradventureland.com',
  NULL,
  'TK/0',
  'Kp. Cihanjawar Rt 003 Rw 002 Kel, Sukagalih Kec. megamendung',
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'baed727e-2c27-4359-9e30-3c9c28ce6a7a',
  '5a03de43-b594-4826-b591-26a2dd7b6160',
  '2026-09-14'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900107'
);

-- No CSV 111: MUHAMAD ALPIN | Runner
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  'c9e4b692-5331-4c75-b3a5-2e5cc20acb8e',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900108',
  '3201260405940006',
  'MUHAMAD',
  'ALPIN',
  'dw.900108@hrms-local.eigeradventureland.com',
  '+6281617475926',
  'TK/0',
  'Kp. Cihanjawar Rt 005 Rw 002 Kel., Sukagalih Kec. megamendung',
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'baed727e-2c27-4359-9e30-3c9c28ce6a7a',
  '5a03de43-b594-4826-b591-26a2dd7b6160',
  '2026-09-14'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900108'
);

-- No CSV 112: AGUNG SUMARNA | GRO
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  'f55d72ca-6239-412e-aca0-c5665ceaa7ae',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900109',
  '3201262308040003',
  'AGUNG',
  'SUMARNA',
  'dw.900109@hrms-local.eigeradventureland.com',
  '+6288905871801',
  'TK/0',
  'Kp. Situ Rt 004 Rw 001 Kel. Sukaresmi Kec. Megamendung',
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'baed727e-2c27-4359-9e30-3c9c28ce6a7a',
  '3050a936-cf34-43d1-affc-38fbdb24569d',
  '2026-09-14'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900109'
);

-- No CSV 113: DIAS RAMADHAN | Runner
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  'da5448ab-d87b-4bee-88b3-c53b67cb8418',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900110',
  '3201262210050004',
  'DIAS',
  'RAMADHAN',
  'dw.900110@hrms-local.eigeradventureland.com',
  NULL,
  'TK/0',
  NULL,
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'baed727e-2c27-4359-9e30-3c9c28ce6a7a',
  '5a03de43-b594-4826-b591-26a2dd7b6160',
  '2026-09-14'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900110'
);

-- No CSV 114: MUHAMAD RIZIK YASIN | Runner
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  '4045b143-1931-4527-87bc-7ac1ff63a904',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900111',
  '3201262506070002',
  'MUHAMAD RIZIK',
  'YASIN',
  'dw.900111@hrms-local.eigeradventureland.com',
  '+6283807698709',
  'TK/0',
  'Kp. Lemahneundeut Rt 005 Rw 004 Kel, Sukagalih Kec. Megamendung Bogor',
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'baed727e-2c27-4359-9e30-3c9c28ce6a7a',
  '5a03de43-b594-4826-b591-26a2dd7b6160',
  '2026-09-14'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900111'
);

-- No CSV 115: INDRI ANANDA SYAKILA | Waiter
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  '263dbc4b-25f4-488e-b9bd-1f4b2b5c6f0c',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900112',
  '3201267009040003',
  'INDRI ANANDA',
  'SYAKILA',
  'dw.900112@hrms-local.eigeradventureland.com',
  '+6283807698709',
  'TK/0',
  'Kp. lemahneundeut Rt 004 Rw 004 Kel. Sukagalih Kec.  Megamendung',
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'baed727e-2c27-4359-9e30-3c9c28ce6a7a',
  '5a03de43-b594-4826-b591-26a2dd7b6160',
  '2026-09-14'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900112'
);

-- No CSV 116: ANISA FEBRIANI | Cashier
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  '9e59cdc0-a223-4ecf-9dcb-e90996d8ce55',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900113',
  '3201264904030003',
  'ANISA',
  'FEBRIANI',
  'dw.900113@hrms-local.eigeradventureland.com',
  '+6281338847017',
  'TK/0',
  'Kp. Gadog Rt 003 Rw 004 Kel. Pandan Sari Kec. Ciawi',
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'baed727e-2c27-4359-9e30-3c9c28ce6a7a',
  '39f20e1d-2308-4393-96a7-fc2835b14cc9',
  '2026-09-14'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900113'
);

-- No CSV 117: THOMAS ADVENTHEO | Runner
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  'e2a5d085-bccc-49ae-b8c3-a6d111e57207',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900114',
  '1802082012020004',
  'THOMAS',
  'ADVENTHEO',
  'dw.900114@hrms-local.eigeradventureland.com',
  '+6285783421467',
  'TK/0',
  'Gajah Timur I Rt 059 Rw 030 Kel. Kota Gajah Timur Kec. Kota Gajah - Lampung Tengah',
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'baed727e-2c27-4359-9e30-3c9c28ce6a7a',
  '5a03de43-b594-4826-b591-26a2dd7b6160',
  '2026-09-14'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900114'
);

-- No CSV 118: M ALIF APIPUDIANSYAH | Waiter
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  'c270a4b7-1fd1-4374-96c8-0f0e91ea2f71',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900115',
  '3201260504040009',
  'M ALIF',
  'APIPUDIANSYAH',
  'dw.900115@hrms-local.eigeradventureland.com',
  '+628979564299',
  'TK/0',
  'Kp. Sukabirus Rt 003 Rw 001 Kel, Sukamaju Kec. Megamendung',
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'baed727e-2c27-4359-9e30-3c9c28ce6a7a',
  '5a03de43-b594-4826-b591-26a2dd7b6160',
  '2026-09-14'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900115'
);

-- No CSV 120: M RENDI AGUSTIAN | Runner
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  '2c4ca087-e6f0-4c07-806c-4c79989e78c9',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900116',
  '3201253108041001',
  'M RENDI',
  'AGUSTIAN',
  'dw.900116@hrms-local.eigeradventureland.com',
  '+6282261841603',
  'TK/0',
  'Kp. Jogjogan Rt 004 Rw 003 Kel. Jogjigan Kec. Cisarua',
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'baed727e-2c27-4359-9e30-3c9c28ce6a7a',
  '5a03de43-b594-4826-b591-26a2dd7b6160',
  '2026-09-14'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900116'
);

-- No CSV 121: M FAIZAL NUROHMAN | Waiter
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  '7671fc1c-6c08-4b77-806e-0f9b8ecb8c83',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900117',
  '3203281101060007',
  'M FAIZAL',
  'NUROHMAN',
  'dw.900117@hrms-local.eigeradventureland.com',
  '+6287848946772',
  'TK/0',
  'Kp. Tugaran Rr 002 Rw 012 Kel. Sindanglaya Kec. Cipanas',
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'baed727e-2c27-4359-9e30-3c9c28ce6a7a',
  '5a03de43-b594-4826-b591-26a2dd7b6160',
  '2026-09-14'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900117'
);

-- No CSV 122: M IRAWAN | Runner
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  '80816276-2aa3-4ade-a6ac-5e1251f4f19d',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900118',
  '3201251606970001',
  'M',
  'IRAWAN',
  'dw.900118@hrms-local.eigeradventureland.com',
  '+6285134947322',
  'K/1',
  'Kp. Lemahneundeut Rt 002 Rw 004 Kel. Sukagalih Kec. Megamendung',
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'baed727e-2c27-4359-9e30-3c9c28ce6a7a',
  '5a03de43-b594-4826-b591-26a2dd7b6160',
  '2026-09-14'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900118'
);

-- No CSV 123: PEDRIANSYAH - | Runner
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  'f9ee61e5-64d8-4249-8ab6-447707dc0c12',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900119',
  '3201222901000006',
  'PEDRIANSYAH',
  '-',
  'dw.900119@hrms-local.eigeradventureland.com',
  '+6285716552726',
  'TK/0',
  'Kp. Lawangtaji RT 001 Rw 011 Kel, Bunar Kec. Cigudeg - Bogor',
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'baed727e-2c27-4359-9e30-3c9c28ce6a7a',
  '5a03de43-b594-4826-b591-26a2dd7b6160',
  '2026-09-14'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900119'
);

-- No CSV 124: DEMAS BAYU SAMUDRA | Waiter
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  'b6010218-f60f-4706-80c7-8a89ba1a859e',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900120',
  '3217021605040002',
  'DEMAS BAYU',
  'SAMUDRA',
  'dw.900120@hrms-local.eigeradventureland.com',
  '+6281223452154',
  'TK/0',
  'Kp. Karyawangi rt 003 Rw 006 Kel. Karyawangi Kec. parongpong',
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'baed727e-2c27-4359-9e30-3c9c28ce6a7a',
  '5a03de43-b594-4826-b591-26a2dd7b6160',
  '2026-09-14'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900120'
);

-- No CSV 125: MUHAMAD DEFRI RAMDANI | Cook
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  'ae0db9bc-74bb-4358-80ea-55ce9719365d',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900121',
  '3201260212010003',
  'MUHAMAD DEFRI',
  'RAMDANI',
  'dw.900121@hrms-local.eigeradventureland.com',
  '+6283877144052',
  'TK/0',
  'Kp. Cihanjawar Rt 003 Rw 002 Kel. Sukagalih Kec. Megamendung',
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  '208644c4-f3f7-495d-a23e-94bc1551f7ce',
  '4937a517-c854-46fb-9f66-874ee4746ff1',
  '2026-01-01'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900121'
);

-- No CSV 126: INDRA HERMANSYAH | Cook Helper
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  'ecb58290-35cc-434f-bb9c-dccaa3d65d41',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900122',
  '3201260802020012',
  'INDRA',
  'HERMANSYAH',
  'dw.900122@hrms-local.eigeradventureland.com',
  '+62895392888878',
  'TK/0',
  'Kp, Pakancilan Rt 004 Rw 004 Kel. Kuta Kec. Megamendung',
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  '208644c4-f3f7-495d-a23e-94bc1551f7ce',
  '4937a517-c854-46fb-9f66-874ee4746ff1',
  '2026-09-26'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900122'
);

-- No CSV 127: MUHAMAD AHLAN MULYADI | Steward
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  'e609a0bc-04d3-472f-9134-40fd25290c5c',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900123',
  '3201260202010003',
  'MUHAMAD AHLAN',
  'MULYADI',
  'dw.900123@hrms-local.eigeradventureland.com',
  NULL,
  'TK/0',
  'Kp. Goleah Rt 001 Rw 002 Kel, Sukagalih Kec.Megamendung',
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  '208644c4-f3f7-495d-a23e-94bc1551f7ce',
  '197eb623-58a5-48af-b61b-ccf33f35134d',
  '2026-09-26'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900123'
);

-- No CSV 128: JIDAN SUWAEPI | Steward
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  '9dccf8de-421e-4536-b7fb-c1fd008171b9',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900124',
  '3201260607060003',
  'JIDAN',
  'SUWAEPI',
  'dw.900124@hrms-local.eigeradventureland.com',
  NULL,
  'TK/0',
  'Kp. Pasir Kalong',
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  '208644c4-f3f7-495d-a23e-94bc1551f7ce',
  '197eb623-58a5-48af-b61b-ccf33f35134d',
  '2026-09-26'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900124'
);

-- No CSV 129: MUHAMAD IKHBAL MAULANA F | Cook Helper
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  '76c499b0-f64b-47d6-bd87-79547685dc7d',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900125',
  '3201262006040001',
  'MUHAMAD IKHBAL MAULANA',
  'F',
  'dw.900125@hrms-local.eigeradventureland.com',
  NULL,
  'TK/0',
  'Kp. Rawa Rt 001 Rw 002 Kel, Gadong Kec. Megamendung',
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  '208644c4-f3f7-495d-a23e-94bc1551f7ce',
  '4937a517-c854-46fb-9f66-874ee4746ff1',
  '2026-09-26'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900125'
);

-- No CSV 130: DESTRIA HERLIANI | Cook Helper
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  '62bb8107-d0da-44fd-9e11-13d76e7e734c',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900126',
  '3201246512050001',
  'DESTRIA',
  'HERLIANI',
  'dw.900126@hrms-local.eigeradventureland.com',
  NULL,
  'TK/0',
  'Kp. Cikopo Selatan Rt 001 Rw 001 Kel. Sukagalih Kec. Megamendung',
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  '208644c4-f3f7-495d-a23e-94bc1551f7ce',
  '4937a517-c854-46fb-9f66-874ee4746ff1',
  '2026-09-26'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900126'
);

-- No CSV 131: DZAKWAN DAFFA | Cook Helper
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  '966890ae-98ab-4342-abb5-391cc714aefb',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900127',
  '3201023103030014',
  'DZAKWAN',
  'DAFFA',
  'dw.900127@hrms-local.eigeradventureland.com',
  NULL,
  'TK/0',
  'Bumi Mutiara Blok JE 4/24 Rt 005 Rw 032 Kel. Bojong Kulur Kec. Gunung Putri',
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  '208644c4-f3f7-495d-a23e-94bc1551f7ce',
  '4937a517-c854-46fb-9f66-874ee4746ff1',
  '2026-09-26'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900127'
);

-- No CSV 132: MOHAMAD ARIFIN | Steward
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  '494b00c8-4454-45f5-b3c4-8c4bfdd5648e',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900128',
  '3201260102030005',
  'MOHAMAD',
  'ARIFIN',
  'dw.900128@hrms-local.eigeradventureland.com',
  NULL,
  'TK/0',
  'Kp. Coblong Rt 005 Rw 001 Kel. Sukagalih Kec. Megamendung',
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  '208644c4-f3f7-495d-a23e-94bc1551f7ce',
  '197eb623-58a5-48af-b61b-ccf33f35134d',
  '2026-09-26'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900128'
);

-- No CSV 133: ERWIN SYAH | Cook Helper
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  'a22351dd-77c9-4523-9711-cf7707b8dc1c',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900129',
  '3201260608920006',
  'ERWIN',
  'SYAH',
  'dw.900129@hrms-local.eigeradventureland.com',
  NULL,
  'TK/0',
  'Kp. Cipayung Rt 003 Rw 001 Kel. Cipayung Kec. Megamendung',
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  '208644c4-f3f7-495d-a23e-94bc1551f7ce',
  '4937a517-c854-46fb-9f66-874ee4746ff1',
  '2026-09-26'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900129'
);

-- No CSV 134: BAYU PRASETYA | Cook Helper
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  '66542dfa-0dbe-4701-9a7d-bb975adf35f9',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900130',
  '3201261004000003',
  'BAYU',
  'PRASETYA',
  'dw.900130@hrms-local.eigeradventureland.com',
  NULL,
  'TK/0',
  'Kp. Cihanjawar Rt 004 Rw 002 Kel. Sukagalih Kec.Megamendung',
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  '208644c4-f3f7-495d-a23e-94bc1551f7ce',
  '4937a517-c854-46fb-9f66-874ee4746ff1',
  '2026-09-26'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900130'
);

-- No CSV 135: AKHADI WIRA SATRIADJI | Cook Helper
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  'b19abd30-0dcc-4e45-bcb5-5fb459674505',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900131',
  '3201263006030009',
  'AKHADI WIRA',
  'SATRIADJI',
  'dw.900131@hrms-local.eigeradventureland.com',
  NULL,
  'TK/0',
  'Kp. Sukabirus Rt 002 Rw 005 Kel. Gadong Kec.Megamendung',
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  '208644c4-f3f7-495d-a23e-94bc1551f7ce',
  '4937a517-c854-46fb-9f66-874ee4746ff1',
  '2026-09-26'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900131'
);

-- No CSV 136: MUHAMAD GILMAN FADILAH | Cook Helper
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  '0f44b8c1-27a2-4c91-902a-2f1bf07a4cb1',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900132',
  '3271010704050009',
  'MUHAMAD GILMAN',
  'FADILAH',
  'dw.900132@hrms-local.eigeradventureland.com',
  NULL,
  'TK/0',
  'Parung Jambu Rt 001 Rw 010 Kel. Empang kec. Bogor Selatan',
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  '208644c4-f3f7-495d-a23e-94bc1551f7ce',
  '4937a517-c854-46fb-9f66-874ee4746ff1',
  '2026-09-26'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900132'
);

-- No CSV 137: MUHAMAD LUTFI FAUZI | Barista
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  '0f19bbaf-10b7-49a2-91e9-2ae697b4eb18',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900133',
  '3217012610020011',
  'MUHAMAD LUTFI',
  'FAUZI',
  'dw.900133@hrms-local.eigeradventureland.com',
  NULL,
  'TK/0',
  'Kp. Sindangwangi Rt 002 Rw 009 Kel. Mekarwangi Kec. lembang',
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'baed727e-2c27-4359-9e30-3c9c28ce6a7a',
  '5a03de43-b594-4826-b591-26a2dd7b6160',
  '2026-09-26'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900133'
);

-- No CSV 138: AZRIEL NAFIS FAYYADH ABBAD | Barista
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  '127a3fb7-f96d-4ad0-9826-e85416ec13b3',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900134',
  '3201151303040006',
  'AZRIEL NAFIS FAYYADH',
  'ABBAD',
  'dw.900134@hrms-local.eigeradventureland.com',
  NULL,
  'TK/0',
  'JL, Benteng No, 46 Kp. Gedong Rt 005 Rw 001 Kel. Benteng Kec. Ciampea',
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'baed727e-2c27-4359-9e30-3c9c28ce6a7a',
  '5a03de43-b594-4826-b591-26a2dd7b6160',
  '2026-09-26'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900134'
);

-- No CSV 139: YARIS JULIAN | Barista
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  '4f2d1a59-e95e-4b70-be99-788d395a528a',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900135',
  '3201261803050001',
  'YARIS',
  'JULIAN',
  'dw.900135@hrms-local.eigeradventureland.com',
  NULL,
  'TK/0',
  'Kp. Cihjanjawar Rt 003 Rw 002 Kel. Sukagalih Kec. Megamendung',
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'baed727e-2c27-4359-9e30-3c9c28ce6a7a',
  '5a03de43-b594-4826-b591-26a2dd7b6160',
  '2026-09-07'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900135'
);

-- No CSV 140: SITI MAWARNI FRATIWI | Barista
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  '9dad738b-61e1-46f0-8dee-4ffc0c9e5287',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900136',
  '3201264907070005',
  'SITI MAWARNI',
  'FRATIWI',
  'dw.900136@hrms-local.eigeradventureland.com',
  NULL,
  'TK/0',
  'Kp. Cihanjawar Rt 003 Rw 002 Kel. Sukagalih Kec.Megamendung',
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'baed727e-2c27-4359-9e30-3c9c28ce6a7a',
  '5a03de43-b594-4826-b591-26a2dd7b6160',
  '2026-09-07'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900136'
);

-- No CSV 141: SITI ASIPA AMALIA | Daily Worker Procurement
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  'af4b0dd2-91dc-4b58-89b0-34636592443e',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900137',
  '3201266310030001',
  'SITI ASIPA',
  'AMALIA',
  'dw.900137@hrms-local.eigeradventureland.com',
  NULL,
  'TK/0',
  'Kp. Lemahneundeut Rt 003 Rw 004 Kel, Sukagalih Kec. Megamendung',
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'a50a2581-993f-429a-a07f-06f11cd25969',
  'dd86544c-d28e-4a07-9784-1c05d93a1750',
  '2026-09-01'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900137'
);

-- No CSV 142: MUHAMAD SOMANTRI | Daily Worker F&A
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  'f56d6fca-0f3f-4b85-bf78-936c55146643',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900138',
  '3201262404940001',
  'MUHAMAD',
  'SOMANTRI',
  'dw.900138@hrms-local.eigeradventureland.com',
  NULL,
  'K/0',
  'Kp. Cihanjawar RT 005 RW 002 Kelurahan Sukagalih Kecamatan Megamendung Kabupaten Bogor',
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  '03ab7044-774e-43d1-9c55-647ec5acc433',
  '0a55647e-a8c2-4f34-9f4c-c6b310537df2',
  '2026-08-20'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900138'
);

-- No CSV 143: CECEP RAHMATULLOH | Receiving
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  'af013885-e76d-42e3-a136-6a2c0b44050d',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900139',
  '3201251103880004',
  'CECEP',
  'RAHMATULLOH',
  'dw.900139@hrms-local.eigeradventureland.com',
  NULL,
  'K/2',
  'Kp. SukabirusRt 002 Rw 001 Kel., Sukamahi Kec, megamendung',
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  '03ab7044-774e-43d1-9c55-647ec5acc433',
  '4d2bff5a-be6c-4d57-b60c-8e1549ab24dd',
  '2026-01-01'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900139'
);

-- No CSV 144: Muhamad Rifal Oki Rahayu | Traffic
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  'e4d7a0e3-5470-45a8-8469-c7011b7e7130',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900140',
  '3201262110990001',
  'Muhamad Rifal Oki',
  'Rahayu',
  'dw.900140@hrms-local.eigeradventureland.com',
  NULL,
  NULL,
  NULL,
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f63d4628-afc4-4730-99fc-651571660d32',
  '996882bd-7344-441b-a5b1-a82e73fe8e41',
  '2026-09-28'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900140'
);

-- No CSV 145: MUHAMAD JULPI ALIP ALAWI | Traffic
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  '7cb25f70-b91c-4877-8a2b-256780a79513',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900141',
  '3201261801041001',
  'MUHAMAD JULPI ALIP',
  'ALAWI',
  'dw.900141@hrms-local.eigeradventureland.com',
  NULL,
  'TK/0',
  'Kp, Situ Rt 003 Rw 003 Kel. Sukaresmi Kec. Megamendung',
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f63d4628-afc4-4730-99fc-651571660d32',
  '996882bd-7344-441b-a5b1-a82e73fe8e41',
  '2026-09-28'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900141'
);

-- No CSV 146: Nurul huda | Traffic
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  '1bd38deb-4c37-4807-bf13-c48d0741910c',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900142',
  '3201261707961001',
  'Nurul',
  'huda',
  'dw.900142@hrms-local.eigeradventureland.com',
  NULL,
  'TK/0',
  'Kp. Waru Doyong Rt 002 Rw 002 Kel, Kuta Kec. Megamendung',
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f63d4628-afc4-4730-99fc-651571660d32',
  '996882bd-7344-441b-a5b1-a82e73fe8e41',
  '2026-09-28'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900142'
);

-- No CSV 147: SUHERLAN - | Traffic
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  '85d16f86-5746-446f-adc8-9952d17d3284',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900143',
  '3201260612030001',
  'SUHERLAN',
  '-',
  'dw.900143@hrms-local.eigeradventureland.com',
  NULL,
  'TK/0',
  'Kp. Pasir Kalong Rt 003 Rw 005 Kel, Sukakarya Kec. Megamendung',
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f63d4628-afc4-4730-99fc-651571660d32',
  '996882bd-7344-441b-a5b1-a82e73fe8e41',
  '2026-09-28'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900143'
);

-- No CSV 148: Muhamad ridwanulloh | Traffic
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  '08e02f2f-88aa-4762-b20d-770c448e5dd6',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900144',
  NULL,
  'Muhamad',
  'ridwanulloh',
  'dw.900144@hrms-local.eigeradventureland.com',
  NULL,
  NULL,
  NULL,
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f63d4628-afc4-4730-99fc-651571660d32',
  '996882bd-7344-441b-a5b1-a82e73fe8e41',
  '2026-09-28'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900144'
);

-- No CSV 149: Ramadhani Artindo | Traffic
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  '24e844c1-a713-4d2b-9c05-8726f4849f36',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900145',
  '1571080502970041',
  'Ramadhani',
  'Artindo',
  'dw.900145@hrms-local.eigeradventureland.com',
  NULL,
  'K/0',
  'Kp. Munjul Rt 002 Rw 005 Kel. Sukamanah Kec. Megamendung',
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f63d4628-afc4-4730-99fc-651571660d32',
  '996882bd-7344-441b-a5b1-a82e73fe8e41',
  '2026-09-28'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900145'
);

-- No CSV 150: Novit Pratama | Traffic
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  '48c71cb8-853b-4768-b078-3b6e36c123e9',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900146',
  NULL,
  'Novit',
  'Pratama',
  'dw.900146@hrms-local.eigeradventureland.com',
  NULL,
  NULL,
  NULL,
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f63d4628-afc4-4730-99fc-651571660d32',
  '996882bd-7344-441b-a5b1-a82e73fe8e41',
  '2026-09-28'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900146'
);

-- No CSV 151: Fery - | Traffic
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  '3555e875-fc68-436a-9423-c36e4b18f8f3',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900147',
  '3201252311890002',
  'Fery',
  '-',
  'dw.900147@hrms-local.eigeradventureland.com',
  NULL,
  'TK/0',
  'Kp. Neglasari Rt 005 Rw 004 Kel. Tugu Utara Kec. Cisarua',
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f63d4628-afc4-4730-99fc-651571660d32',
  '996882bd-7344-441b-a5b1-a82e73fe8e41',
  '2026-09-28'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900147'
);

-- No CSV 152: Muhamad yogi | Traffic
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  'e47f8701-d3a4-4099-b30c-eef607562da0',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900148',
  '3201262501990001',
  'Muhamad',
  'yogi',
  'dw.900148@hrms-local.eigeradventureland.com',
  NULL,
  'K/1',
  'Kp. Pasir Kalong Rt 003 Rw 005 Kel. Sukakarya Kec. Megamendung',
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f63d4628-afc4-4730-99fc-651571660d32',
  '996882bd-7344-441b-a5b1-a82e73fe8e41',
  '2026-09-28'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900148'
);

-- No CSV 153: Ragil Apriansyah | Traffic
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  '68e91b53-36b3-444d-9fa5-f351bd87fe8a',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900149',
  NULL,
  'Ragil',
  'Apriansyah',
  'dw.900149@hrms-local.eigeradventureland.com',
  NULL,
  NULL,
  NULL,
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f63d4628-afc4-4730-99fc-651571660d32',
  '996882bd-7344-441b-a5b1-a82e73fe8e41',
  '2026-09-28'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900149'
);

-- No CSV 154: Salwa Said Abdullah | Traffic
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  '7bcb774a-d9d0-45c6-98bd-445fc255607b',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900150',
  '3201260504020003',
  'Salwa Said',
  'Abdullah',
  'dw.900150@hrms-local.eigeradventureland.com',
  NULL,
  'TK/0',
  'Kp. Sukabirus Rt 002 Rw 004 Kel. Gadog Kec. Megamendung',
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f63d4628-afc4-4730-99fc-651571660d32',
  '996882bd-7344-441b-a5b1-a82e73fe8e41',
  '2026-09-28'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900150'
);

-- No CSV 155: Raja Arya Perwira | Traffic
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  '4b61af75-cabe-4d42-8f5e-a3b69c703bfe',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900151',
  NULL,
  'Raja Arya',
  'Perwira',
  'dw.900151@hrms-local.eigeradventureland.com',
  NULL,
  NULL,
  NULL,
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f63d4628-afc4-4730-99fc-651571660d32',
  '996882bd-7344-441b-a5b1-a82e73fe8e41',
  '2026-09-28'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900151'
);

-- No CSV 156: Riki Abdurrahman | Traffic
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  '82ef153b-89d9-4004-8705-0d94aa15b0a3',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900152',
  NULL,
  'Riki',
  'Abdurrahman',
  'dw.900152@hrms-local.eigeradventureland.com',
  NULL,
  NULL,
  NULL,
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f63d4628-afc4-4730-99fc-651571660d32',
  '996882bd-7344-441b-a5b1-a82e73fe8e41',
  '2026-09-28'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900152'
);

-- No CSV 157: Alvio Dwipuri Andara | Traffic
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  '897d59fe-97e1-42ac-bbd1-b25b87505a73',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900153',
  NULL,
  'Alvio Dwipuri',
  'Andara',
  'dw.900153@hrms-local.eigeradventureland.com',
  NULL,
  NULL,
  NULL,
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f63d4628-afc4-4730-99fc-651571660d32',
  '996882bd-7344-441b-a5b1-a82e73fe8e41',
  '2026-09-28'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900153'
);

-- No CSV 158: Muhammad Diky | Traffic
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  '03ad863b-d9cb-4bc0-81ca-85bc7989a836',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900154',
  '3201251005970003',
  'Muhammad',
  'Diky',
  'dw.900154@hrms-local.eigeradventureland.com',
  NULL,
  'TK/0',
  'Kp. Cidokom Rt 001 Rw 011 Kel. Kopo Kec. CIsarua',
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f63d4628-afc4-4730-99fc-651571660d32',
  '996882bd-7344-441b-a5b1-a82e73fe8e41',
  '2026-09-28'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900154'
);

-- No CSV 159: Moh Lani | Traffic
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  '1bb7b72c-5654-4a6b-8fa4-9a3624508bb6',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900155',
  NULL,
  'Moh',
  'Lani',
  'dw.900155@hrms-local.eigeradventureland.com',
  NULL,
  NULL,
  NULL,
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f63d4628-afc4-4730-99fc-651571660d32',
  '996882bd-7344-441b-a5b1-a82e73fe8e41',
  '2026-09-28'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900155'
);

-- No CSV 160: Achmad Hamdani | Traffic
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  'cf7eafd6-320b-4a8d-9ca5-274447b649e8',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900156',
  NULL,
  'Achmad',
  'Hamdani',
  'dw.900156@hrms-local.eigeradventureland.com',
  NULL,
  NULL,
  NULL,
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f63d4628-afc4-4730-99fc-651571660d32',
  '996882bd-7344-441b-a5b1-a82e73fe8e41',
  '2026-09-28'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900156'
);

-- No CSV 161: Zulkarnaen - | Traffic
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  '908391ca-9e0f-4ead-aef1-1222e64b2174',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900157',
  NULL,
  'Zulkarnaen',
  '-',
  'dw.900157@hrms-local.eigeradventureland.com',
  NULL,
  NULL,
  NULL,
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f63d4628-afc4-4730-99fc-651571660d32',
  '996882bd-7344-441b-a5b1-a82e73fe8e41',
  '2026-09-28'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900157'
);

-- No CSV 162: Zaenal Mutaqin | Traffic
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  '6c040cd5-235f-4b90-88a0-8713f53dae5b',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900158',
  NULL,
  'Zaenal',
  'Mutaqin',
  'dw.900158@hrms-local.eigeradventureland.com',
  NULL,
  NULL,
  NULL,
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f63d4628-afc4-4730-99fc-651571660d32',
  '996882bd-7344-441b-a5b1-a82e73fe8e41',
  '2026-09-28'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900158'
);

-- No CSV 163: Rizki Andriansyah | Traffic
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  '38cc9def-ab4b-41bd-baa9-441039f28df2',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900159',
  NULL,
  'Rizki',
  'Andriansyah',
  'dw.900159@hrms-local.eigeradventureland.com',
  NULL,
  NULL,
  NULL,
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f63d4628-afc4-4730-99fc-651571660d32',
  '996882bd-7344-441b-a5b1-a82e73fe8e41',
  '2026-09-28'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900159'
);

-- No CSV 164: M Rizky Gunawan | Traffic
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  'f50e670e-4d2c-4d14-a4d4-4a34d853e043',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900160',
  NULL,
  'M Rizky',
  'Gunawan',
  'dw.900160@hrms-local.eigeradventureland.com',
  NULL,
  NULL,
  NULL,
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f63d4628-afc4-4730-99fc-651571660d32',
  '996882bd-7344-441b-a5b1-a82e73fe8e41',
  '2026-09-28'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900160'
);

-- No CSV 165: Tiara - | Public Area
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  '96518de4-ac6c-4bd1-820b-5dd818e717bb',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900161',
  '3201254108060002',
  'Tiara',
  '-',
  'dw.900161@hrms-local.eigeradventureland.com',
  NULL,
  'TK/0',
  'Kp. Lemahneundeut Rt 004 rw 004 Kel. Sukagalih Kec. Megamendung',
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f54e8a8a-a6d2-41c6-91de-9c8a1cc3057c',
  '79da1fa1-d359-4634-b164-3329b88a5391',
  '2026-09-28'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900161'
);

-- No CSV 166: Desi Amanah | Public Area
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  'a9870c3d-2423-4146-99a8-868589af7ab6',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900162',
  '3201266802080001',
  'Desi',
  'Amanah',
  'dw.900162@hrms-local.eigeradventureland.com',
  NULL,
  'TK/0',
  'Kp. Lemahneundeut Rt 005 Rw 004 Kel. Sukagalih Kec. Megamendung',
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f54e8a8a-a6d2-41c6-91de-9c8a1cc3057c',
  '79da1fa1-d359-4634-b164-3329b88a5391',
  '2026-09-28'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900162'
);

-- No CSV 167: NOVI ANDARESTA | Public Area
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  '45e8ee67-cc5f-493e-865e-6cb54f946a0a',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900163',
  '3201264810040005',
  'NOVI',
  'ANDARESTA',
  'dw.900163@hrms-local.eigeradventureland.com',
  NULL,
  'TK/0',
  'Kp. Lemahneundeut Rt 003 rw 004 kel. Sukagalih Kec, Megamendung',
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f54e8a8a-a6d2-41c6-91de-9c8a1cc3057c',
  '79da1fa1-d359-4634-b164-3329b88a5391',
  '2026-09-28'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900163'
);

-- No CSV 168: Amelia - | Public Area
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  '5afa6425-a786-48b7-a335-360b97724217',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900164',
  '3201265310070002',
  'Amelia',
  '-',
  'dw.900164@hrms-local.eigeradventureland.com',
  NULL,
  'TK/0',
  'Kp. Lemahneundeut Rt 005 Rw 004 Kel. Sukagalih Kec. Megamendung',
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f54e8a8a-a6d2-41c6-91de-9c8a1cc3057c',
  '79da1fa1-d359-4634-b164-3329b88a5391',
  '2026-09-28'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900164'
);

-- No CSV 169: IKI MAULANA | Public Area
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  '33146e39-1c37-40af-aae5-0244cd5ffae7',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900165',
  '3201260606060016',
  'IKI',
  'MAULANA',
  'dw.900165@hrms-local.eigeradventureland.com',
  NULL,
  'TK/0',
  'Kp. Pasir Kalong Rt 003 Rw 005 Kel.Sukakarya Kec. Megamendung',
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f54e8a8a-a6d2-41c6-91de-9c8a1cc3057c',
  '79da1fa1-d359-4634-b164-3329b88a5391',
  '2026-09-28'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900165'
);

-- No CSV 170: Suryana 001 | Waste Sorter
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  '9e1e057d-90b6-4809-a064-e7aae22b42e7',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900166',
  '3201262408050002',
  'Suryana',
  '001',
  'dw.900166@hrms-local.eigeradventureland.com',
  NULL,
  'TK/0',
  'Kp. Lemahneundeut Rt 001 Rw 004 Kel. Sukagalih Kec. Megamendung',
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f949d311-a5b6-4587-b3a5-e3959943da3c',
  'a207d1f9-dbbd-4a02-ad12-e9deac59b679',
  '2026-09-28'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900166'
);

-- No CSV 171: Sarifudin - | Waste Sorter
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  '44cc19a2-f407-4ece-b8e8-473ecce5f5a3',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900167',
  '3201260705020010',
  'Sarifudin',
  '-',
  'dw.900167@hrms-local.eigeradventureland.com',
  NULL,
  'TK/0',
  'Kp. Lemahneundeut Rt 001 Rw 004 Kel. Sukagalih Kec. Megamendung',
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f949d311-a5b6-4587-b3a5-e3959943da3c',
  'a207d1f9-dbbd-4a02-ad12-e9deac59b679',
  '2026-09-28'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900167'
);

-- No CSV 172: Pirman - | Waste Sorter
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  '77b3c9f6-9de8-40aa-86c9-0e1c7dcadc28',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900168',
  NULL,
  'Pirman',
  '-',
  'dw.900168@hrms-local.eigeradventureland.com',
  NULL,
  NULL,
  NULL,
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f949d311-a5b6-4587-b3a5-e3959943da3c',
  'a207d1f9-dbbd-4a02-ad12-e9deac59b679',
  '2026-09-28'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900168'
);

-- No CSV 173: Muhamad Ari Nuryawan | Helper SB2
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  '340f38de-4e20-4931-a2aa-18ea057876cd',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900169',
  '3201251301970002',
  'Muhamad Ari',
  'Nuryawan',
  'dw.900169@hrms-local.eigeradventureland.com',
  NULL,
  'TK/0',
  'Kp. Cipari Rt 001 Rw 003 Kel. Leuwimalang  Kec. Cisarua',
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  '208644c4-f3f7-495d-a23e-94bc1551f7ce',
  '4937a517-c854-46fb-9f66-874ee4746ff1',
  '2026-09-24'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900169'
);

-- No CSV 174: Musa Ardiansyah | Helper KD2
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  'b6fab26c-4ef1-4520-ac54-0e921ba7b56d',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900170',
  '3201260812000002',
  'Musa',
  'Ardiansyah',
  'dw.900170@hrms-local.eigeradventureland.com',
  NULL,
  'TK/0',
  'Kp. Pasir kaliki Rt 001 Rw 001 Kel. Sukamaju Kec. Megamendung',
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  '208644c4-f3f7-495d-a23e-94bc1551f7ce',
  '4937a517-c854-46fb-9f66-874ee4746ff1',
  '2026-09-24'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900170'
);

-- No CSV 175: M Rafi Hardiansyah | Steward KD2
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  '57622b8a-14d1-4600-938b-d9aa2fd7086d',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900171',
  '3201261411070003',
  'M Rafi',
  'Hardiansyah',
  'dw.900171@hrms-local.eigeradventureland.com',
  NULL,
  'TK/0',
  'Kp. Pasir Muncang Rt 002 Rw 003 Kel. Sukamanah Kec. Megamendung',
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  '208644c4-f3f7-495d-a23e-94bc1551f7ce',
  '197eb623-58a5-48af-b61b-ccf33f35134d',
  '2026-09-24'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900171'
);

-- No CSV 176: Izman - | Runner
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  'c3c8b96d-9599-4577-99b8-c4ac28765fb7',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900172',
  NULL,
  'Izman',
  '-',
  'dw.900172@hrms-local.eigeradventureland.com',
  NULL,
  NULL,
  NULL,
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'baed727e-2c27-4359-9e30-3c9c28ce6a7a',
  '5a03de43-b594-4826-b591-26a2dd7b6160',
  '2026-09-28'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900172'
);

-- No CSV 177: Sindi S | Waiters KD2
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  '9680fff7-1ff9-4049-9b3d-ded6306c3d50',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900173',
  '3201264307040002',
  'Sindi',
  'S',
  'dw.900173@hrms-local.eigeradventureland.com',
  NULL,
  'TK/0',
  'Kp. Lemahneundet Rt 004 Rw 004 Kel. Sukagalih Kec. Megamendung',
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'baed727e-2c27-4359-9e30-3c9c28ce6a7a',
  '5a03de43-b594-4826-b591-26a2dd7b6160',
  '2026-10-01'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900173'
);

-- No CSV 178: M Raply Fadilah | GRO KD2
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  'ffbe8014-4db4-4cc5-a29b-b1b1ec0783c9',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900174',
  '3201252606040010',
  'M Raply',
  'Fadilah',
  'dw.900174@hrms-local.eigeradventureland.com',
  NULL,
  'TK/0',
  'Jl. Sukamaju Rt 001 Rw 010 Kel. Tugu Selatan Kec. Cisarua',
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'baed727e-2c27-4359-9e30-3c9c28ce6a7a',
  '3050a936-cf34-43d1-affc-38fbdb24569d',
  '2026-10-01'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900174'
);

-- No CSV 179: Fitriani - | Cashier FB
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  'e74c1dc7-df90-4eb0-aff3-bfc1faed3ec1',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900175',
  '3201255312050001',
  'Fitriani',
  '-',
  'dw.900175@hrms-local.eigeradventureland.com',
  NULL,
  'TK/0',
  'Kp. Ciburial Karaton Rt 005 Rw 005 Kel. Tugu Utara Kec. Cisarua',
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'baed727e-2c27-4359-9e30-3c9c28ce6a7a',
  '39f20e1d-2308-4393-96a7-fc2835b14cc9',
  '2026-10-01'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900175'
);

-- No CSV 180: Vanesa Aulia Azahra | GRO KD2
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  '9bb3ed1f-d296-45e2-b918-34b8fd265650',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900176',
  '3201264605070005',
  'Vanesa Aulia',
  'Azahra',
  'dw.900176@hrms-local.eigeradventureland.com',
  NULL,
  'TK/0',
  'Kp. Sukabirus Rt 003 Rw 004 Kel. Gadog Kec. Megamendung',
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'baed727e-2c27-4359-9e30-3c9c28ce6a7a',
  '3050a936-cf34-43d1-affc-38fbdb24569d',
  '2026-10-01'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900176'
);

-- No CSV 181: Muhammad Ardiyansyah | Runner KD2
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  '180064a5-19e6-4c24-a48c-8489b4773b99',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900177',
  '3201252012011001',
  'Muhammad',
  'Ardiyansyah',
  'dw.900177@hrms-local.eigeradventureland.com',
  NULL,
  'TK/0',
  'Jl. Sidang Subur Rt 001 Rw 003 Kel. Tugu Selatabn Kec. Cisairua',
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'baed727e-2c27-4359-9e30-3c9c28ce6a7a',
  '5a03de43-b594-4826-b591-26a2dd7b6160',
  '2026-10-01'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900177'
);

-- No CSV 182: Leyzsa Maudliha Hovenier | Waitress KD2
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  'e3c85ea5-448e-42bf-89d2-24084422ffc8',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900178',
  '3201257003080003',
  'Leyzsa Maudliha',
  'Hovenier',
  'dw.900178@hrms-local.eigeradventureland.com',
  NULL,
  'TK/0',
  'Kp. Pasirmadin Rt 001 Rw 004 Kel. Cisarua Kec. Cisarua',
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'baed727e-2c27-4359-9e30-3c9c28ce6a7a',
  '5a03de43-b594-4826-b591-26a2dd7b6160',
  '2026-10-01'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900178'
);

-- No CSV 183: Childan Albany | Runner KD2
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  'f910b3be-9d40-47af-884e-53ae6eb175e3',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900179',
  '3277012807030011',
  'Childan',
  'Albany',
  'dw.900179@hrms-local.eigeradventureland.com',
  NULL,
  'TK/0',
  'Hujung Kaler Rt 003 Rw 006 Kel. Utama Kec. Cimahi Selatan',
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'baed727e-2c27-4359-9e30-3c9c28ce6a7a',
  '5a03de43-b594-4826-b591-26a2dd7b6160',
  '2026-10-02'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900179'
);

-- No CSV 184: Yanwar Aimar | Waiters KD2
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  '586dd96c-8e68-4d13-82ee-824dae75aa32',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900180',
  '3201262801030001',
  'Yanwar',
  'Aimar',
  'dw.900180@hrms-local.eigeradventureland.com',
  NULL,
  'TK/0',
  'Kp. Cihanjawar Rt 003 Rw 002 Kel. Sukagalih Kec. Megamendung',
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'baed727e-2c27-4359-9e30-3c9c28ce6a7a',
  '5a03de43-b594-4826-b591-26a2dd7b6160',
  '2026-10-01'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900180'
);

-- No CSV 185: Muhammad Abdi Wahdani | Barista
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  'e26ef84c-ef36-4b1e-bf52-4bcb2355a90b',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900181',
  '3201263012960001',
  'Muhammad Abdi',
  'Wahdani',
  'dw.900181@hrms-local.eigeradventureland.com',
  NULL,
  'TK/0',
  'Kp. Cipayung Rt 001 Rw 003 Kel. Cipayung Girang Kec. Megamendung',
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'baed727e-2c27-4359-9e30-3c9c28ce6a7a',
  '5a03de43-b594-4826-b591-26a2dd7b6160',
  '2026-10-02'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900181'
);

-- No CSV 186: Rafa Putra Pratama | Runner KD2
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  '1b06a98a-8f95-4a02-bd9c-17dae2ffc633',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900182',
  NULL,
  'Rafa Putra',
  'Pratama',
  'dw.900182@hrms-local.eigeradventureland.com',
  NULL,
  NULL,
  NULL,
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'baed727e-2c27-4359-9e30-3c9c28ce6a7a',
  '5a03de43-b594-4826-b591-26a2dd7b6160',
  '2026-10-01'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900182'
);

-- No CSV 187: Susi Agustina | Cashier SB2
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  '22556193-7f53-4e48-be9f-0af23a567e5d',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900183',
  '3201244508050003',
  'Susi',
  'Agustina',
  'dw.900183@hrms-local.eigeradventureland.com',
  NULL,
  'TK/0',
  'Kp. Gugunung Rt 005 Rw 003 Kel. Banjar Wangi Kec. Ciawi',
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'baed727e-2c27-4359-9e30-3c9c28ce6a7a',
  '39f20e1d-2308-4393-96a7-fc2835b14cc9',
  '2026-10-01'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900183'
);

-- No CSV 188: Adinda Delia Putri | Cashier Retail
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  '6a830f29-0fbe-404a-ac76-f89371e73599',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900184',
  NULL,
  'Adinda Delia',
  'Putri',
  'dw.900184@hrms-local.eigeradventureland.com',
  NULL,
  NULL,
  NULL,
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'baed727e-2c27-4359-9e30-3c9c28ce6a7a',
  '39f20e1d-2308-4393-96a7-fc2835b14cc9',
  '2026-10-01'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900184'
);

-- No CSV 189: Suma Pratama | Waiters KD2
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  '73e630ca-ef2b-4247-8fec-3c1751f50da1',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900185',
  '3204112810040011',
  'Suma',
  'Pratama',
  'dw.900185@hrms-local.eigeradventureland.com',
  NULL,
  'TK/0',
  'Kp. Gandasoli Rt 004 Rw 011 Kel. Gandasari Kec. Katapang',
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'baed727e-2c27-4359-9e30-3c9c28ce6a7a',
  '5a03de43-b594-4826-b591-26a2dd7b6160',
  '2026-10-02'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900185'
);

-- No CSV 190: Fathin Abdurrahman | Retail Assistant
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  '89c25400-278f-438b-adf0-d198bbd695a8',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900186',
  '3272032312010001',
  'Fathin',
  'Abdurrahman',
  'dw.900186@hrms-local.eigeradventureland.com',
  NULL,
  'TK/0',
  'Ciaul Pasir Rt 002 Rw 012 Kel. Cisarua Kec. Cikole',
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'baed727e-2c27-4359-9e30-3c9c28ce6a7a',
  '37d15a89-9dc3-4ff5-911d-ac1786365cfa',
  '2026-09-28'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900186'
);

-- No CSV 191: Siti Nandita Febriani | Cashier Retail
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  'a37df1e6-59e6-424f-bf40-5449e31b6800',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900187',
  '3201265002070001',
  'Siti Nandita',
  'Febriani',
  'dw.900187@hrms-local.eigeradventureland.com',
  NULL,
  'TK/0',
  'Kp. Pasirmuncang Rt 001 Re 002 Kel. Sukamanah kec. Megamendung',
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'baed727e-2c27-4359-9e30-3c9c28ce6a7a',
  '39f20e1d-2308-4393-96a7-fc2835b14cc9',
  '2026-09-28'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900187'
);

-- No CSV 192: Muhamad Maulana | Retail Assistant
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  '8d004f23-e400-425c-aa6a-e235b07b2fee',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900188',
  '3201262507970002',
  'Muhamad',
  'Maulana',
  'dw.900188@hrms-local.eigeradventureland.com',
  NULL,
  'TK/0',
  'Kp. Cihanjawar Rt 003 Rw 002 Kel. Sukagalih Kec. Megamendung',
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'baed727e-2c27-4359-9e30-3c9c28ce6a7a',
  '37d15a89-9dc3-4ff5-911d-ac1786365cfa',
  '2026-09-28'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900188'
);

-- No CSV 193: Parid Ghozali | Hidrologi
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  'd02d5fab-c64d-48bd-b39a-ca0615c0761c',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900189',
  '3203072908050010',
  'Parid',
  'Ghozali',
  'dw.900189@hrms-local.eigeradventureland.com',
  NULL,
  'TK/0',
  'Kp. Leuwiliang Rt 002 Rw 003 Kel, Sukamanah Kec. mande',
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f949d311-a5b6-4587-b3a5-e3959943da3c',
  'a207d1f9-dbbd-4a02-ad12-e9deac59b679',
  '2026-09-29'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900189'
);

-- No CSV 194: Andi - | Hidrologi
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  '3f09188f-50f9-4a92-9906-f00c26639962',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900190',
  NULL,
  'Andi',
  '-',
  'dw.900190@hrms-local.eigeradventureland.com',
  NULL,
  NULL,
  NULL,
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f949d311-a5b6-4587-b3a5-e3959943da3c',
  'a207d1f9-dbbd-4a02-ad12-e9deac59b679',
  '2026-09-21'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900190'
);

-- No CSV 195: Murdani - | Hidrologi
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  '2553927e-dcf5-47f7-b2b5-b8ae98c113f9',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900191',
  NULL,
  'Murdani',
  '-',
  'dw.900191@hrms-local.eigeradventureland.com',
  NULL,
  NULL,
  NULL,
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f949d311-a5b6-4587-b3a5-e3959943da3c',
  'a207d1f9-dbbd-4a02-ad12-e9deac59b679',
  '2026-09-21'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900191'
);

-- No CSV 196: Muhamad Rahman | Steward KD2
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  '3aa133c2-7f6d-4275-b9e2-47a65716e016',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900192',
  '3201261311030006',
  'Muhamad',
  'Rahman',
  'dw.900192@hrms-local.eigeradventureland.com',
  NULL,
  'Tk/0',
  'Kp. Sukabirus Rt 004 Rw 004 Kel. Gadog kec. Megamendung',
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  '208644c4-f3f7-495d-a23e-94bc1551f7ce',
  '197eb623-58a5-48af-b61b-ccf33f35134d',
  '2026-10-05'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900192'
);

-- No CSV 197: Muhammad Reno Renaldi | Helper KD2
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  '2f8241e0-65c1-48ae-a001-0aa80c4fbf43',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900193',
  '3201261202080003',
  'Muhammad Reno',
  'Renaldi',
  'dw.900193@hrms-local.eigeradventureland.com',
  NULL,
  'TK/0',
  'Kp, Ponmdok Gede Rt 002 Rw 004 Kel, SukamanahKec. Megamendung',
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  '208644c4-f3f7-495d-a23e-94bc1551f7ce',
  '4937a517-c854-46fb-9f66-874ee4746ff1',
  '2026-10-05'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900193'
);

-- No CSV 198: Khoerul Affandi | Cook KD2
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  '8bb9addc-3545-4b32-8a4a-c2a90afcbc72',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900194',
  NULL,
  'Khoerul',
  'Affandi',
  'dw.900194@hrms-local.eigeradventureland.com',
  NULL,
  NULL,
  NULL,
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  '208644c4-f3f7-495d-a23e-94bc1551f7ce',
  '4937a517-c854-46fb-9f66-874ee4746ff1',
  '2026-10-07'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900194'
);

-- No CSV 200: Beni Chandra Irawan | Steward SB2
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  '0fc766bf-9dcf-4a94-9556-5c1cfb70c438',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900195',
  NULL,
  'Beni Chandra',
  'Irawan',
  'dw.900195@hrms-local.eigeradventureland.com',
  NULL,
  NULL,
  NULL,
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  '208644c4-f3f7-495d-a23e-94bc1551f7ce',
  '197eb623-58a5-48af-b61b-ccf33f35134d',
  '2026-10-02'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900195'
);

-- No CSV 201: M Ramandha Alghani Putra | Ticketing
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  '94898f5d-f0c3-48b8-8752-8c33280ee8b2',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900196',
  NULL,
  'M Ramandha Alghani',
  'Putra',
  'dw.900196@hrms-local.eigeradventureland.com',
  NULL,
  NULL,
  NULL,
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f63d4628-afc4-4730-99fc-651571660d32',
  '5d1c243d-c5dd-46a2-8662-b7e8bf30df5e',
  '2026-10-02'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900196'
);

-- No CSV 202: Maulidina - | Ticketing
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  '4e67d510-e61d-403e-9b8c-dbf6710f513e',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900197',
  NULL,
  'Maulidina',
  '-',
  'dw.900197@hrms-local.eigeradventureland.com',
  NULL,
  NULL,
  NULL,
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f63d4628-afc4-4730-99fc-651571660d32',
  '5d1c243d-c5dd-46a2-8662-b7e8bf30df5e',
  '2026-10-02'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900197'
);

-- No CSV 203: Haura Afifah | Ticketing
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  '08eb5b56-482b-480e-9597-9e61cc6cdac1',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900198',
  NULL,
  'Haura',
  'Afifah',
  'dw.900198@hrms-local.eigeradventureland.com',
  NULL,
  NULL,
  NULL,
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f63d4628-afc4-4730-99fc-651571660d32',
  '5d1c243d-c5dd-46a2-8662-b7e8bf30df5e',
  '2026-10-02'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900198'
);

-- No CSV 204: Nurhamzah - | Waste Sorter
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  'bb507875-ea7b-4582-a15c-e40ebd6e7caa',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900199',
  NULL,
  'Nurhamzah',
  '-',
  'dw.900199@hrms-local.eigeradventureland.com',
  NULL,
  NULL,
  NULL,
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f949d311-a5b6-4587-b3a5-e3959943da3c',
  'a207d1f9-dbbd-4a02-ad12-e9deac59b679',
  '2026-10-04'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900199'
);

-- No CSV 205: Alfiansyah - | Waste Sorter
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  '76a4c43b-4b8f-46c2-a881-be0c6e483522',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900200',
  NULL,
  'Alfiansyah',
  '-',
  'dw.900200@hrms-local.eigeradventureland.com',
  NULL,
  NULL,
  NULL,
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f949d311-a5b6-4587-b3a5-e3959943da3c',
  'a207d1f9-dbbd-4a02-ad12-e9deac59b679',
  '2026-10-04'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900200'
);

-- No CSV 206: Sandi - | Waste Sorter
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  '823f2cff-b397-438f-8569-b6459bc02fd0',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900201',
  NULL,
  'Sandi',
  '-',
  'dw.900201@hrms-local.eigeradventureland.com',
  NULL,
  NULL,
  NULL,
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f949d311-a5b6-4587-b3a5-e3959943da3c',
  'a207d1f9-dbbd-4a02-ad12-e9deac59b679',
  '2026-10-04'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900201'
);

-- No CSV 207: Abdul Mutakin | Waste Sorter
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  'a895f412-fb1f-44da-87bf-2c4d77140f8f',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900202',
  NULL,
  'Abdul',
  'Mutakin',
  'dw.900202@hrms-local.eigeradventureland.com',
  NULL,
  NULL,
  NULL,
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f949d311-a5b6-4587-b3a5-e3959943da3c',
  'a207d1f9-dbbd-4a02-ad12-e9deac59b679',
  '2026-10-04'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900202'
);

-- No CSV 208: Fauzan Ajizi | Waste Sorter
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  '39030b27-88c9-42ea-aced-6506f4a8325b',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900203',
  NULL,
  'Fauzan',
  'Ajizi',
  'dw.900203@hrms-local.eigeradventureland.com',
  NULL,
  NULL,
  NULL,
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f949d311-a5b6-4587-b3a5-e3959943da3c',
  'a207d1f9-dbbd-4a02-ad12-e9deac59b679',
  '2026-10-04'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900203'
);

-- No CSV 209: Aita Nita | Adventure Guide
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  '4f4d8e6c-5cd3-40ad-bccd-612a6c5ad06a',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900204',
  NULL,
  'Aita',
  'Nita',
  'dw.900204@hrms-local.eigeradventureland.com',
  NULL,
  NULL,
  NULL,
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f63d4628-afc4-4730-99fc-651571660d32',
  '43941f3a-9ac5-4276-b765-bdd982ab0318',
  '2026-10-15'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900204'
);

-- No CSV 210: Gilang Permana | Disposal Driver
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  'f3872515-6a99-4b03-b3d4-93e04f9eda4a',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900205',
  NULL,
  'Gilang',
  'Permana',
  'dw.900205@hrms-local.eigeradventureland.com',
  NULL,
  NULL,
  NULL,
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f949d311-a5b6-4587-b3a5-e3959943da3c',
  '241fad8e-0c72-40dd-a9ba-506fae1ce2ce',
  '2026-10-21'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900205'
);

-- No CSV 211: Nanang Supriatna | Disposal Driver
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  'fecbd207-7256-40d6-8486-9224ea5f6dff',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900206',
  NULL,
  'Nanang',
  'Supriatna',
  'dw.900206@hrms-local.eigeradventureland.com',
  NULL,
  NULL,
  NULL,
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f949d311-a5b6-4587-b3a5-e3959943da3c',
  '241fad8e-0c72-40dd-a9ba-506fae1ce2ce',
  '2026-10-21'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900206'
);

-- No CSV 212: Nurhani Fitri Oktavia | Public Area
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  '9a2f7005-401b-468a-8be0-ae728a7b4676',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900207',
  NULL,
  'Nurhani Fitri',
  'Oktavia',
  'dw.900207@hrms-local.eigeradventureland.com',
  NULL,
  NULL,
  NULL,
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f54e8a8a-a6d2-41c6-91de-9c8a1cc3057c',
  '79da1fa1-d359-4634-b164-3329b88a5391',
  '2026-10-19'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900207'
);

-- No CSV 213: Sahril - | Public Area
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  'c04c7b63-0ea8-47f2-a75a-3d465b578f0a',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900208',
  NULL,
  'Sahril',
  '-',
  'dw.900208@hrms-local.eigeradventureland.com',
  NULL,
  NULL,
  NULL,
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f54e8a8a-a6d2-41c6-91de-9c8a1cc3057c',
  '79da1fa1-d359-4634-b164-3329b88a5391',
  '2026-10-19'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900208'
);

-- No CSV 214: Siti Leniansyah | Public Area
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  '015e622a-6d5c-41d2-81a8-f43ac2cfd9b2',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900209',
  NULL,
  'Siti',
  'Leniansyah',
  'dw.900209@hrms-local.eigeradventureland.com',
  NULL,
  NULL,
  NULL,
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f54e8a8a-a6d2-41c6-91de-9c8a1cc3057c',
  '79da1fa1-d359-4634-b164-3329b88a5391',
  '2026-10-19'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900209'
);

-- No CSV 215: Muhamad Nur Lutfan | Public Area
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  'f2399cde-15f4-4c5e-a4de-a1c84b9defad',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900210',
  NULL,
  'Muhamad Nur',
  'Lutfan',
  'dw.900210@hrms-local.eigeradventureland.com',
  NULL,
  NULL,
  NULL,
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f54e8a8a-a6d2-41c6-91de-9c8a1cc3057c',
  '79da1fa1-d359-4634-b164-3329b88a5391',
  '2026-10-19'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900210'
);

-- No CSV 216: Wildan Budiman | Public Area
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  '88bc0f60-e451-4076-bd75-949c994e190c',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900211',
  NULL,
  'Wildan',
  'Budiman',
  'dw.900211@hrms-local.eigeradventureland.com',
  NULL,
  NULL,
  NULL,
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f54e8a8a-a6d2-41c6-91de-9c8a1cc3057c',
  '79da1fa1-d359-4634-b164-3329b88a5391',
  '2026-10-19'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900211'
);

-- No CSV 217: Salman Alfarizki | Public Area
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  '787d2f65-cadf-4bec-ba1d-740553679832',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900212',
  NULL,
  'Salman',
  'Alfarizki',
  'dw.900212@hrms-local.eigeradventureland.com',
  NULL,
  NULL,
  NULL,
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f54e8a8a-a6d2-41c6-91de-9c8a1cc3057c',
  '79da1fa1-d359-4634-b164-3329b88a5391',
  '2026-10-19'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900212'
);

-- No CSV 218: Muhamad Adit Priyatna | Public Area
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  '711ae722-a133-497a-b4b4-e2eb952f31d0',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900213',
  NULL,
  'Muhamad Adit',
  'Priyatna',
  'dw.900213@hrms-local.eigeradventureland.com',
  NULL,
  NULL,
  NULL,
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f54e8a8a-a6d2-41c6-91de-9c8a1cc3057c',
  '79da1fa1-d359-4634-b164-3329b88a5391',
  '2026-10-19'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900213'
);

-- No CSV 219: Achmad Abror | Public Area
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  '8723236d-6ef6-4ced-879d-6adb3885df48',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900214',
  NULL,
  'Achmad',
  'Abror',
  'dw.900214@hrms-local.eigeradventureland.com',
  NULL,
  NULL,
  NULL,
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f54e8a8a-a6d2-41c6-91de-9c8a1cc3057c',
  '79da1fa1-d359-4634-b164-3329b88a5391',
  '2026-10-19'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900214'
);

-- No CSV 220: Dika Taufik | Public Area
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  '4758b36a-c0ea-441d-86f6-70c958d9f0af',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900215',
  NULL,
  'Dika',
  'Taufik',
  'dw.900215@hrms-local.eigeradventureland.com',
  NULL,
  NULL,
  NULL,
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f54e8a8a-a6d2-41c6-91de-9c8a1cc3057c',
  '79da1fa1-d359-4634-b164-3329b88a5391',
  '2026-10-19'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900215'
);

-- No CSV 221: Andhika - | Public Area
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  '89b2d02b-5187-4ef9-8be1-0b71e60d42c8',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900216',
  NULL,
  'Andhika',
  '-',
  'dw.900216@hrms-local.eigeradventureland.com',
  NULL,
  NULL,
  NULL,
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f54e8a8a-a6d2-41c6-91de-9c8a1cc3057c',
  '79da1fa1-d359-4634-b164-3329b88a5391',
  '2026-10-19'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900216'
);

-- No CSV 222: Siti Aulia | Public Area
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  '0691750b-49f4-4878-a0ba-c371bbe67f1e',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900217',
  NULL,
  'Siti',
  'Aulia',
  'dw.900217@hrms-local.eigeradventureland.com',
  NULL,
  NULL,
  NULL,
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f54e8a8a-a6d2-41c6-91de-9c8a1cc3057c',
  '79da1fa1-d359-4634-b164-3329b88a5391',
  '2026-10-19'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900217'
);

-- No CSV 223: Risya Pratiwi | Public Area
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  '8daf114d-4492-40fb-9060-dda5b3780ab4',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900218',
  NULL,
  'Risya',
  'Pratiwi',
  'dw.900218@hrms-local.eigeradventureland.com',
  NULL,
  NULL,
  NULL,
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f54e8a8a-a6d2-41c6-91de-9c8a1cc3057c',
  '79da1fa1-d359-4634-b164-3329b88a5391',
  '2026-10-19'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900218'
);

-- No CSV 224: Muhamad Tegar Raihan | Public Area
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  'f276ee3d-55ae-4e64-8d03-3b385b20343c',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900219',
  NULL,
  'Muhamad Tegar',
  'Raihan',
  'dw.900219@hrms-local.eigeradventureland.com',
  NULL,
  NULL,
  NULL,
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f54e8a8a-a6d2-41c6-91de-9c8a1cc3057c',
  '79da1fa1-d359-4634-b164-3329b88a5391',
  '2026-10-19'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900219'
);

-- No CSV 225: Nuri Hawa Maulida | Public Area
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  '76c2a6c8-1ea0-4a80-ad98-ff65ce3a5aa4',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900220',
  NULL,
  'Nuri Hawa',
  'Maulida',
  'dw.900220@hrms-local.eigeradventureland.com',
  NULL,
  NULL,
  NULL,
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f54e8a8a-a6d2-41c6-91de-9c8a1cc3057c',
  '79da1fa1-d359-4634-b164-3329b88a5391',
  '2026-10-19'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900220'
);

-- No CSV 226: Ririn Dwi Lestari | Public Area
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  '30efceda-1afb-4994-94fb-5bbf86cd220b',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900221',
  NULL,
  'Ririn Dwi',
  'Lestari',
  'dw.900221@hrms-local.eigeradventureland.com',
  NULL,
  NULL,
  NULL,
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f54e8a8a-a6d2-41c6-91de-9c8a1cc3057c',
  '79da1fa1-d359-4634-b164-3329b88a5391',
  '2026-10-19'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900221'
);

-- No CSV 227: Ziah Amelia | Public Area
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  'af73a050-7f48-4d7a-8179-b6a5e41e091b',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900222',
  NULL,
  'Ziah',
  'Amelia',
  'dw.900222@hrms-local.eigeradventureland.com',
  NULL,
  NULL,
  NULL,
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f54e8a8a-a6d2-41c6-91de-9c8a1cc3057c',
  '79da1fa1-d359-4634-b164-3329b88a5391',
  '2026-10-19'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900222'
);

-- No CSV 228: Ramdani - | HCGA support
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  '67bf5577-f958-46fb-8ec7-f3fc0bb4b7d0',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900223',
  NULL,
  'Ramdani',
  '-',
  'dw.900223@hrms-local.eigeradventureland.com',
  NULL,
  NULL,
  NULL,
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  '27d25208-e641-4385-908e-54d6526ce255',
  'a207d1f9-dbbd-4a02-ad12-e9deac59b679',
  '2026-10-21'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900223'
);

-- No CSV 229: M Rizqi | HCGA support
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  'c4a917b6-e318-433c-8bcc-c260a4ad083c',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900224',
  NULL,
  'M',
  'Rizqi',
  'dw.900224@hrms-local.eigeradventureland.com',
  NULL,
  NULL,
  NULL,
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  '27d25208-e641-4385-908e-54d6526ce255',
  'a207d1f9-dbbd-4a02-ad12-e9deac59b679',
  '2026-10-21'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900224'
);

-- No CSV 230: Siti Veni Rahayu Gustiarani | Public Area
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  'c023fd94-b933-401f-843f-3c75921b851f',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900225',
  NULL,
  'Siti Veni Rahayu',
  'Gustiarani',
  'dw.900225@hrms-local.eigeradventureland.com',
  NULL,
  NULL,
  NULL,
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f54e8a8a-a6d2-41c6-91de-9c8a1cc3057c',
  '79da1fa1-d359-4634-b164-3329b88a5391',
  '2026-10-22'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900225'
);

-- No CSV 231: Siti Latifah | Public Area
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  'f86f230a-6722-4d84-853d-bf94443cb677',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900226',
  NULL,
  'Siti',
  'Latifah',
  'dw.900226@hrms-local.eigeradventureland.com',
  NULL,
  NULL,
  NULL,
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f54e8a8a-a6d2-41c6-91de-9c8a1cc3057c',
  '79da1fa1-d359-4634-b164-3329b88a5391',
  '2026-10-22'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900226'
);

-- No CSV 232: Siti Saniah | Public Area
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  '71b07e60-75f0-46ae-9869-514ae4f76daa',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900227',
  NULL,
  'Siti',
  'Saniah',
  'dw.900227@hrms-local.eigeradventureland.com',
  NULL,
  NULL,
  NULL,
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f54e8a8a-a6d2-41c6-91de-9c8a1cc3057c',
  '79da1fa1-d359-4634-b164-3329b88a5391',
  '2026-10-22'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900227'
);

-- No CSV 233: Anindita Febrianti | Public Area
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  '166cd291-fb32-496b-a902-ad26427ef409',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900228',
  NULL,
  'Anindita',
  'Febrianti',
  'dw.900228@hrms-local.eigeradventureland.com',
  NULL,
  NULL,
  NULL,
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f54e8a8a-a6d2-41c6-91de-9c8a1cc3057c',
  '79da1fa1-d359-4634-b164-3329b88a5391',
  '2026-10-22'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900228'
);

-- No CSV 234: Abdul Pikri Ardiansyah | Public Area
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  'bbe246f2-0294-4ec0-9d1d-ab46bd84f6e2',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900229',
  NULL,
  'Abdul Pikri',
  'Ardiansyah',
  'dw.900229@hrms-local.eigeradventureland.com',
  NULL,
  NULL,
  NULL,
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f54e8a8a-a6d2-41c6-91de-9c8a1cc3057c',
  '79da1fa1-d359-4634-b164-3329b88a5391',
  '2026-10-22'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900229'
);

-- No CSV 235: Abilla Chuzinah | Public Area
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  '28dcf112-0740-4670-9e33-6549bd558b2e',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900230',
  NULL,
  'Abilla',
  'Chuzinah',
  'dw.900230@hrms-local.eigeradventureland.com',
  NULL,
  NULL,
  NULL,
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f54e8a8a-a6d2-41c6-91de-9c8a1cc3057c',
  '79da1fa1-d359-4634-b164-3329b88a5391',
  '2026-10-22'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900230'
);

-- No CSV 236: Siti Nuralisah | Public Area
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  '8c391584-0a40-40a9-8a85-4925a2ff15ed',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900231',
  NULL,
  'Siti',
  'Nuralisah',
  'dw.900231@hrms-local.eigeradventureland.com',
  NULL,
  NULL,
  NULL,
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f54e8a8a-a6d2-41c6-91de-9c8a1cc3057c',
  '79da1fa1-d359-4634-b164-3329b88a5391',
  '2026-10-22'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900231'
);

-- No CSV 237: Ine Yulia Safitri | Public Area
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  'd6c32276-20d3-4aed-8407-8bf26021008e',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900232',
  NULL,
  'Ine Yulia',
  'Safitri',
  'dw.900232@hrms-local.eigeradventureland.com',
  NULL,
  NULL,
  NULL,
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f54e8a8a-a6d2-41c6-91de-9c8a1cc3057c',
  '79da1fa1-d359-4634-b164-3329b88a5391',
  '2026-10-22'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900232'
);

-- No CSV 238: Abdul Muhaemin | Public Area
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  'c671c87f-3864-47c4-b593-d3f97170ccbe',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900233',
  NULL,
  'Abdul',
  'Muhaemin',
  'dw.900233@hrms-local.eigeradventureland.com',
  NULL,
  NULL,
  NULL,
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f54e8a8a-a6d2-41c6-91de-9c8a1cc3057c',
  '79da1fa1-d359-4634-b164-3329b88a5391',
  '2026-10-22'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900233'
);

-- No CSV 239: Ardiawan Rizki | Public Area
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  'fd305c83-4a9d-4a68-8dff-68f362613faa',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900234',
  NULL,
  'Ardiawan',
  'Rizki',
  'dw.900234@hrms-local.eigeradventureland.com',
  NULL,
  NULL,
  NULL,
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f54e8a8a-a6d2-41c6-91de-9c8a1cc3057c',
  '79da1fa1-d359-4634-b164-3329b88a5391',
  '2026-10-22'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900234'
);

-- No CSV 240: Rizky Ramadhan | Public Area
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  '011eca56-26f3-4c1e-ba2a-47be35accbf7',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900235',
  NULL,
  'Rizky',
  'Ramadhan',
  'dw.900235@hrms-local.eigeradventureland.com',
  NULL,
  NULL,
  NULL,
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f54e8a8a-a6d2-41c6-91de-9c8a1cc3057c',
  '79da1fa1-d359-4634-b164-3329b88a5391',
  '2026-10-22'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900235'
);

-- No CSV 241: Siti Azizah | Public Area
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  '08b9724d-08c4-438b-8ce3-86bb883a299e',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900236',
  NULL,
  'Siti',
  'Azizah',
  'dw.900236@hrms-local.eigeradventureland.com',
  NULL,
  NULL,
  NULL,
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f54e8a8a-a6d2-41c6-91de-9c8a1cc3057c',
  '79da1fa1-d359-4634-b164-3329b88a5391',
  '2026-10-22'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900236'
);

-- No CSV 242: Muhamad Syarif Hidayat | Public Area
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  '92223410-eaff-4048-a46b-f42514746da1',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900237',
  NULL,
  'Muhamad Syarif',
  'Hidayat',
  'dw.900237@hrms-local.eigeradventureland.com',
  NULL,
  NULL,
  NULL,
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f54e8a8a-a6d2-41c6-91de-9c8a1cc3057c',
  '79da1fa1-d359-4634-b164-3329b88a5391',
  '2026-10-22'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900237'
);

-- No CSV 243: Yogi Iskandar | Traffic
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  '939c8e22-d697-44a5-addb-19835155a42b',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900238',
  NULL,
  'Yogi',
  'Iskandar',
  'dw.900238@hrms-local.eigeradventureland.com',
  NULL,
  NULL,
  NULL,
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f63d4628-afc4-4730-99fc-651571660d32',
  '996882bd-7344-441b-a5b1-a82e73fe8e41',
  '2026-10-23'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900238'
);

-- No CSV 244: Muhamad Ali | Traffic
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  '33933480-92f6-4ff3-b9d5-abf8fb97c33b',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900239',
  NULL,
  'Muhamad',
  'Ali',
  'dw.900239@hrms-local.eigeradventureland.com',
  NULL,
  NULL,
  NULL,
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f63d4628-afc4-4730-99fc-651571660d32',
  '996882bd-7344-441b-a5b1-a82e73fe8e41',
  '2026-10-23'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900239'
);

-- No CSV 245: Diansah - | Traffic
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  '414666f1-fad0-49bb-a57b-c0c95faf9a09',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900240',
  NULL,
  'Diansah',
  '-',
  'dw.900240@hrms-local.eigeradventureland.com',
  NULL,
  NULL,
  NULL,
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f63d4628-afc4-4730-99fc-651571660d32',
  '996882bd-7344-441b-a5b1-a82e73fe8e41',
  '2026-10-23'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900240'
);

-- No CSV 246: Fazri Ridho Ilahi | Traffic
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  '2090cc58-1432-4e28-9d90-204f333f38a8',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900241',
  NULL,
  'Fazri Ridho',
  'Ilahi',
  'dw.900241@hrms-local.eigeradventureland.com',
  NULL,
  NULL,
  NULL,
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f63d4628-afc4-4730-99fc-651571660d32',
  '996882bd-7344-441b-a5b1-a82e73fe8e41',
  '2026-10-23'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900241'
);

-- No CSV 247: Muhamad Kiki | Traffic
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  '6d1f8c6e-aaf3-4019-befa-9a774caeafcc',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900242',
  NULL,
  'Muhamad',
  'Kiki',
  'dw.900242@hrms-local.eigeradventureland.com',
  NULL,
  NULL,
  NULL,
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f63d4628-afc4-4730-99fc-651571660d32',
  '996882bd-7344-441b-a5b1-a82e73fe8e41',
  '2026-10-23'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900242'
);

-- No CSV 248: Yudi Wahyudi | Traffic
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  'a4d373b8-90d7-4bf4-92e1-1d493cabf96e',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900243',
  NULL,
  'Yudi',
  'Wahyudi',
  'dw.900243@hrms-local.eigeradventureland.com',
  NULL,
  NULL,
  NULL,
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f63d4628-afc4-4730-99fc-651571660d32',
  '996882bd-7344-441b-a5b1-a82e73fe8e41',
  '2026-10-23'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900243'
);

-- No CSV 249: Mochamad Ariansyah | Experience Host
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  'e4deef3b-8438-4318-9f97-d34c30938b36',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900244',
  NULL,
  'Mochamad',
  'Ariansyah',
  'dw.900244@hrms-local.eigeradventureland.com',
  NULL,
  NULL,
  NULL,
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f63d4628-afc4-4730-99fc-651571660d32',
  '0096184f-ec46-46e3-b200-11be57750b69',
  '2026-10-23'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900244'
);

-- No CSV 250: Nada Fairuz | Experience Host
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  'd7bfb9cd-6dec-40d4-98ed-3c6bc96b1707',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900245',
  NULL,
  'Nada',
  'Fairuz',
  'dw.900245@hrms-local.eigeradventureland.com',
  NULL,
  NULL,
  NULL,
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f63d4628-afc4-4730-99fc-651571660d32',
  '0096184f-ec46-46e3-b200-11be57750b69',
  '2026-10-23'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900245'
);

-- No CSV 251: Sandra Pratiwi | Experience Host
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  '5ed694cb-4220-42de-b1eb-68c4979c8826',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900246',
  NULL,
  'Sandra',
  'Pratiwi',
  'dw.900246@hrms-local.eigeradventureland.com',
  NULL,
  NULL,
  NULL,
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f63d4628-afc4-4730-99fc-651571660d32',
  '0096184f-ec46-46e3-b200-11be57750b69',
  '2026-10-23'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900246'
);

-- No CSV 252: Siti Hana | Adventure Guide
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  '471140fc-7a05-428b-8c3a-a5a30a59618f',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900247',
  NULL,
  'Siti',
  'Hana',
  'dw.900247@hrms-local.eigeradventureland.com',
  NULL,
  NULL,
  NULL,
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'f63d4628-afc4-4730-99fc-651571660d32',
  '43941f3a-9ac5-4276-b765-bdd982ab0318',
  '2026-10-25'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900247'
);

-- No CSV 253: Muhammad Fazril | Helper KD2
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  '10fb15cc-c55d-486a-88a2-68b57fdacc1f',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900248',
  NULL,
  'Muhammad',
  'Fazril',
  'dw.900248@hrms-local.eigeradventureland.com',
  NULL,
  NULL,
  NULL,
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  '208644c4-f3f7-495d-a23e-94bc1551f7ce',
  '4937a517-c854-46fb-9f66-874ee4746ff1',
  '2026-10-26'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900248'
);

-- No CSV 254: Muhammad Rizki Husaini | Barista EC
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  '07a41900-d6c1-46a5-b205-5ca5ba3767c3',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900249',
  NULL,
  'Muhammad Rizki',
  'Husaini',
  'dw.900249@hrms-local.eigeradventureland.com',
  NULL,
  NULL,
  NULL,
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'baed727e-2c27-4359-9e30-3c9c28ce6a7a',
  '5a03de43-b594-4826-b591-26a2dd7b6160',
  '2026-10-26'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900249'
);

-- No CSV 255: Thalia Cahaya Buana | Barista EC
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  'e6a80927-228a-44e6-b5a3-6d34ed05e48b',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900250',
  NULL,
  'Thalia Cahaya',
  'Buana',
  'dw.900250@hrms-local.eigeradventureland.com',
  NULL,
  NULL,
  NULL,
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'baed727e-2c27-4359-9e30-3c9c28ce6a7a',
  '5a03de43-b594-4826-b591-26a2dd7b6160',
  '2026-10-26'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900250'
);

-- No CSV 256: Aldi Rizki Abdusamat Latuap | Waiter KD2
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  'fb25d141-ebfd-49b7-b7a0-dd1c1750c640',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900251',
  NULL,
  'Aldi Rizki Abdusamat',
  'Latuap',
  'dw.900251@hrms-local.eigeradventureland.com',
  NULL,
  NULL,
  NULL,
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'baed727e-2c27-4359-9e30-3c9c28ce6a7a',
  '5a03de43-b594-4826-b591-26a2dd7b6160',
  '2026-10-26'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900251'
);

-- No CSV 257: M Solihin | Waiter KD2
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  'd104a56c-b85c-48f3-98b0-23c9198405ff',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900252',
  NULL,
  'M',
  'Solihin',
  'dw.900252@hrms-local.eigeradventureland.com',
  NULL,
  NULL,
  NULL,
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'baed727e-2c27-4359-9e30-3c9c28ce6a7a',
  '5a03de43-b594-4826-b591-26a2dd7b6160',
  '2026-10-26'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900252'
);

-- No CSV 258: Muhamad Tirta | Waiter KD2
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  'ccc2a9f7-e906-4b5b-89ef-f3525399240a',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900253',
  NULL,
  'Muhamad',
  'Tirta',
  'dw.900253@hrms-local.eigeradventureland.com',
  NULL,
  NULL,
  NULL,
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'baed727e-2c27-4359-9e30-3c9c28ce6a7a',
  '5a03de43-b594-4826-b591-26a2dd7b6160',
  '2026-10-26'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900253'
);

-- No CSV 259: Arif Rahman | Waiter KD2
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  'a453690c-01dc-4792-9b9d-7d2c01efb300',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900254',
  NULL,
  'Arif',
  'Rahman',
  'dw.900254@hrms-local.eigeradventureland.com',
  NULL,
  NULL,
  NULL,
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'baed727e-2c27-4359-9e30-3c9c28ce6a7a',
  '5a03de43-b594-4826-b591-26a2dd7b6160',
  '2026-10-26'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900254'
);

-- No CSV 260: Puan Syifa Maharani | Waitress SB2
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  'b4a5d59b-fcfe-4759-aec4-257d91751242',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900255',
  NULL,
  'Puan Syifa',
  'Maharani',
  'dw.900255@hrms-local.eigeradventureland.com',
  NULL,
  NULL,
  NULL,
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'baed727e-2c27-4359-9e30-3c9c28ce6a7a',
  '5a03de43-b594-4826-b591-26a2dd7b6160',
  '2026-10-26'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900255'
);

-- No CSV 261: Muhamad Rival Zildan | Barista KD
INSERT INTO employees (
  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,
  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",
  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"
)
SELECT
  '1f3279e9-528c-4711-8278-09f3bb06600a',
  '45f39972-f027-440c-ae15-59341f13d33e',
  '900256',
  NULL,
  'Muhamad Rival',
  'Zildan',
  'dw.900256@hrms-local.eigeradventureland.com',
  NULL,
  NULL,
  NULL,
  'DAILY_WORKER'::"EmploymentType",
  'MONTHLY'::"PayType",
  1.5,
  'baed727e-2c27-4359-9e30-3c9c28ce6a7a',
  '5a03de43-b594-4826-b591-26a2dd7b6160',
  '2026-10-28'::date,
  'ACTIVE'::"EmployeeStatus",
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e."tenantId" = '45f39972-f027-440c-ae15-59341f13d33e'
    AND e."employeeCode" = '900256'
);

COMMIT;
