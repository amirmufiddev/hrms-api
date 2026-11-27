#!/usr/bin/env python3
"""Generate SQL INSERT for daily workers from CSV (HRMS employee only, no SSO/user)."""

from __future__ import annotations

import csv
import re
import uuid
from datetime import datetime, timezone
from pathlib import Path

TENANT_ID = "45f39972-f027-440c-ae15-59341f13d33e"

DEPT_MAP = {
    "facility management": "f54e8a8a-a6d2-41c6-91de-9c8a1cc3057c",
    "guest experience": "f63d4628-afc4-4730-99fc-651571660d32",
    "complience & suistainability": "f949d311-a5b6-4587-b3a5-e3959943da3c",
    "compliance & sustainability": "f949d311-a5b6-4587-b3a5-e3959943da3c",
    "fb kitchen": "208644c4-f3f7-495d-a23e-94bc1551f7ce",
    "fb service": "baed727e-2c27-4359-9e30-3c9c28ce6a7a",
    "procurement": "a50a2581-993f-429a-a07f-06f11cd25969",
    "fa unit": "03ab7044-774e-43d1-9c55-647ec5acc433",
    "hcga unit": "27d25208-e641-4385-908e-54d6526ce255",
}

DESIG_MAP = {
    "public area staff": "79da1fa1-d359-4634-b164-3329b88a5391",
    "traffic control staff": "996882bd-7344-441b-a5b1-a82e73fe8e41",
    "experience host": "0096184f-ec46-46e3-b200-11be57750b69",
    "adventure guide": "43941f3a-9ac5-4276-b765-bdd982ab0318",
    "ticketing staff": "5d1c243d-c5dd-46a2-8662-b7e8bf30df5e",
    "commis": "4937a517-c854-46fb-9f66-874ee4746ff1",
    "demi chef": "df14a5a8-86ed-40c8-afa6-9f51359fa703",
    "steward": "197eb623-58a5-48af-b61b-ccf33f35134d",
    "waiters": "5a03de43-b594-4826-b591-26a2dd7b6160",
    "fb gro": "3050a936-cf34-43d1-affc-38fbdb24569d",
    "cashier": "39f20e1d-2308-4393-96a7-fc2835b14cc9",
    "driver": "241fad8e-0c72-40dd-a9ba-506fae1ce2ce",
    "procurement staff": "dd86544c-d28e-4a07-9784-1c05d93a1750",
    "finance staff": "0a55647e-a8c2-4f34-9f4c-c6b310537df2",
    "receiving staff": "4d2bff5a-be6c-4d57-b60c-8e1549ab24dd",
    "retail assistant": "37d15a89-9dc3-4ff5-911d-ac1786365cfa",
    "office & operation support": "a207d1f9-dbbd-4a02-ad12-e9deac59b679",
    "engineering admin": "9da2c2ef-b076-4719-bec7-7233bf2cf927",
}

MONTHS = {
    "jan": 1,
    "january": 1,
    "feb": 2,
    "february": 2,
    "mar": 3,
    "march": 3,
    "apr": 4,
    "april": 4,
    "may": 5,
    "jun": 6,
    "june": 6,
    "jul": 7,
    "july": 7,
    "aug": 8,
    "august": 8,
    "sep": 9,
    "sept": 9,
    "september": 9,
    "oct": 10,
    "october": 10,
    "nov": 11,
    "november": 11,
    "dec": 12,
    "december": 12,
}


def norm(s: str) -> str:
    return re.sub(r"\s+", " ", (s or "").strip().lower())


def sql_str(value: str | None) -> str:
    if value is None or value == "":
        return "NULL"
    return "'" + value.replace("'", "''") + "'"


def parse_join_date(raw: str) -> str | None:
    raw = (raw or "").strip()
    if not raw:
        return None
    for fmt in ("%d/%m/%Y", "%d-%m-%Y"):
        try:
            return datetime.strptime(raw, fmt).strftime("%Y-%m-%d")
        except ValueError:
            pass
    m = re.match(r"^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$", raw)
    if m:
        day, mon, year = int(m.group(1)), norm(m.group(2)), int(m.group(3))
        month = MONTHS.get(mon[:3], MONTHS.get(mon))
        if month:
            return f"{year:04d}-{month:02d}-{day:02d}"
    return None


def split_name(full: str) -> tuple[str, str]:
    full = re.sub(r"\s+", " ", (full or "").strip())
    if not full:
        return "Unknown", "-"
    parts = full.split(" ")
    if len(parts) == 1:
        return parts[0], "-"
    return " ".join(parts[:-1]), parts[-1]


def normalize_phone(raw: str) -> str | None:
    raw = (raw or "").strip()
    if not raw:
        return None
    digits = re.sub(r"\D", "", raw)
    if not digits:
        return None
    if digits.startswith("62"):
        return "+" + digits
    if digits.startswith("0"):
        return "+62" + digits[1:]
    if len(digits) >= 9:
        return "+62" + digits
    return raw


def map_designation(position: str) -> str:
    p = norm(position)
    if not p:
        return DESIG_MAP["office & operation support"]
    rules: list[tuple[str, str]] = [
        (r"daily worker public area|^public area$", "public area staff"),
        (r"daily worker traffic|^traffic$", "traffic control staff"),
        (r"daily worker attraction|experience host", "experience host"),
        (r"adventure guide", "adventure guide"),
        (r"daily worker ticketing|^ticketing$", "ticketing staff"),
        (r"daily worker engineering", "engineering admin"),
        (r"waste sorter|hidrologi", "office & operation support"),
        (r"disposal driver", "driver"),
        (r"daily worker procurement", "procurement staff"),
        (r"daily worker f&a", "finance staff"),
        (r"^receiving", "receiving staff"),
        (r"cook helper|helper", "commis"),
        (r"^cook", "commis"),
        (r"steward", "steward"),
        (r"waiter|waitress", "waiters"),
        (r"^runner", "waiters"),
        (r"\bgro\b", "fb gro"),
        (r"cashier", "cashier"),
        (r"barista", "waiters"),
        (r"retail assistant", "retail assistant"),
        (r"hcga support", "office & operation support"),
    ]
    for pattern, key in rules:
        if re.search(pattern, p):
            return DESIG_MAP[key]
    return DESIG_MAP["office & operation support"]


def map_department(dept: str) -> str | None:
    key = norm(dept)
    return DEPT_MAP.get(key)


def main() -> None:
    root = Path(__file__).resolve().parents[3]
    csv_path = root / "Data DW Updated  - On Board.csv"
    out_path = root / "en-hrms-be-fe" / "docs" / "sql" / "import-daily-workers-onboard.sql"

    rows: list[dict] = []
    seen_ktp: set[str] = set()
    next_code = 900_001
    skipped: list[str] = []

    with csv_path.open(newline="", encoding="utf-8-sig") as f:
        reader = csv.reader(f)
        for line in reader:
            if len(line) < 6:
                continue
            if not line[0].strip().isdigit():
                continue
            no = line[0].strip()
            name = line[1].strip() if len(line) > 1 else ""
            join_raw = line[2].strip() if len(line) > 2 else ""
            position = line[3].strip() if len(line) > 3 else ""
            dept = line[4].strip() if len(line) > 4 else ""
            nik = re.sub(r"\D", "", (line[5] if len(line) > 5 else "").strip())
            phone = line[6].strip() if len(line) > 6 else ""
            address = line[7].strip() if len(line) > 7 else ""
            marital = line[8].strip() if len(line) > 8 else ""

            if not name:
                skipped.append(f"-- SKIP baris {no}: nama kosong")
                continue

            ktp_number: str | None = None
            if nik:
                if len(nik) != 16:
                    skipped.append(
                        f"-- SKIP baris {no} ({name}): KTP bukan 16 digit ({nik})"
                    )
                    continue
                if nik in seen_ktp:
                    skipped.append(
                        f"-- SKIP baris {no} ({name}): KTP duplikat dalam CSV ({nik})"
                    )
                    continue
                seen_ktp.add(nik)
                ktp_number = nik

            employee_code = str(next_code)
            next_code += 1

            dept_id = map_department(dept)
            if not dept_id:
                skipped.append(f"-- SKIP baris {no} ({name}): dept tidak dikenali: {dept!r}")
                continue

            first, last = split_name(name)
            join_date = parse_join_date(join_raw) or "2026-01-01"
            desig_id = map_designation(position)
            email = f"dw.{employee_code.lower()}@hrms-local.eigernature.com"

            rows.append(
                {
                    "no": no,
                    "employee_code": employee_code,
                    "ktp_number": ktp_number,
                    "first": first,
                    "last": last,
                    "email": email,
                    "phone": normalize_phone(phone),
                    "address": address or None,
                    "marital": marital or None,
                    "dept_id": dept_id,
                    "desig_id": desig_id,
                    "join_date": join_date,
                    "position": position,
                }
            )

    lines: list[str] = [
        "-- Import Daily Worker (DAILY_WORKER) — hanya tabel employees",
        "-- Tenant: PT Eiger Ekowisata Nusantara (EEN)",
        "-- TIDAK membuat users / SSO (ssoUserId tetap NULL)",
        "-- Sumber: Data DW Updated  - On Board.csv",
        f"-- Generated: {datetime.now(timezone.utc).isoformat()}",
        "--",
        "-- Pastikan enum DAILY_WORKER sudah di-migrate:",
        "--   cd en-hrms-be-fe/backend && npx prisma migrate deploy",
        "--",
        "BEGIN;",
        "",
        f"-- Total insert: {len(rows)} karyawan",
        "",
    ]
    lines.extend(skipped)
    if skipped:
        lines.append("")

    for r in rows:
        emp_id = str(uuid.uuid4())
        lines.append(
            f"-- No CSV {r['no']}: {r['first']} {r['last']} | {r['position']}"
        )
        lines.append(
            "INSERT INTO employees (\n"
            '  id, "tenantId", "employeeCode", "ktpNumber", "firstName", "lastName", email, phone,\n'
            '  "maritalStatus", "currentAddress", "employmentType", "payType", "otMultiplier",\n'
            '  "departmentId", "designationId", "joinDate", status, "createdAt", "updatedAt"\n'
            ")\n"
            "SELECT\n"
            f"  {sql_str(emp_id)},\n"
            f"  {sql_str(TENANT_ID)},\n"
            f"  {sql_str(r['employee_code'])},\n"
            f"  {sql_str(r['ktp_number'])},\n"
            f"  {sql_str(r['first'])},\n"
            f"  {sql_str(r['last'])},\n"
            f"  {sql_str(r['email'])},\n"
            f"  {sql_str(r['phone'])},\n"
            f"  {sql_str(r['marital'])},\n"
            f"  {sql_str(r['address'])},\n"
            "  'DAILY_WORKER'::\"EmploymentType\",\n"
            "  'MONTHLY'::\"PayType\",\n"
            "  1.5,\n"
            f"  {sql_str(r['dept_id'])},\n"
            f"  {sql_str(r['desig_id'])},\n"
            f"  {sql_str(r['join_date'])}::date,\n"
            "  'ACTIVE'::\"EmployeeStatus\",\n"
            "  NOW(),\n"
            "  NOW()\n"
            "WHERE NOT EXISTS (\n"
            "  SELECT 1 FROM employees e\n"
            f"  WHERE e.\"tenantId\" = {sql_str(TENANT_ID)}\n"
            f"    AND e.\"employeeCode\" = {sql_str(r['employee_code'])}\n"
            ");\n"
        )

    lines.extend(["COMMIT;", ""])

    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text("\n".join(lines), encoding="utf-8")
    print(f"Wrote {len(rows)} inserts -> {out_path}")
    print(f"Skipped/comments: {len(skipped)}")


if __name__ == "__main__":
    main()
