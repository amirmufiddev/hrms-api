#!/usr/bin/env python3
"""
Backfill daily workers: pindahkan NIK 16 digit dari employeeCode ke ktpNumber,
ganti employeeCode dengan kode HRMS awalan 9 (900001, ...).

Usage:
  cd en-hrms-be-fe/backend
  python3 scripts/backfill-daily-worker-employee-codes.py
  python3 scripts/backfill-daily-worker-employee-codes.py --dry-run
"""

from __future__ import annotations

import argparse
import os
import re
from pathlib import Path

try:
    import psycopg2
    from psycopg2.extras import RealDictCursor
except ImportError:
    psycopg2 = None  # type: ignore

EMPLOYEE_CODE_PATTERN = re.compile(r"^9\d{5,9}$")
KTP_PATTERN = re.compile(r"^\d{16}$")


def load_database_url() -> str:
    env_path = Path(__file__).resolve().parents[1] / ".env"
    if env_path.is_file():
        for line in env_path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line.startswith("DATABASE_URL="):
                value = line.split("=", 1)[1].strip().strip('"').strip("'")
                if value:
                    return value
    url = os.environ.get("DATABASE_URL")
    if not url:
        raise SystemExit("DATABASE_URL tidak ditemukan (.env atau environment)")
    return url


def next_code_start(cur, tenant_id: str) -> int:
    cur.execute(
        """
        SELECT "employeeCode"
        FROM employees
        WHERE "tenantId" = %s AND "employeeCode" ~ '^9[0-9]{5,9}$'
        """,
        (tenant_id,),
    )
    maximum = 900_000
    for row in cur.fetchall():
        try:
            value = int(row["employeeCode"])
            if value > maximum:
                maximum = value
        except (TypeError, ValueError):
            continue
    return maximum + 1


def backfill(*, dry_run: bool) -> None:
    if psycopg2 is None:
        raise SystemExit("Install psycopg2: pip install psycopg2-binary")

    conn = psycopg2.connect(load_database_url())
    conn.autocommit = False

    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT DISTINCT "tenantId"
                FROM employees
                WHERE "employmentType" = 'DAILY_WORKER'
                """
            )
            tenant_ids = [r["tenantId"] for r in cur.fetchall()]

            total = 0
            for tenant_id in tenant_ids:
                cur.execute(
                    """
                    SELECT id, "employeeCode", "ktpNumber", email
                    FROM employees
                    WHERE "tenantId" = %s
                      AND "employmentType" = 'DAILY_WORKER'
                      AND NOT ("employeeCode" ~ '^9[0-9]{5,9}$')
                    ORDER BY "createdAt", "employeeCode"
                    """,
                    (tenant_id,),
                )
                rows = cur.fetchall()
                if not rows:
                    continue

                next_num = next_code_start(cur, tenant_id)
                print(f"Tenant {tenant_id}: {len(rows)} pegawai daily worker akan di-backfill (mulai {next_num})")

                for index, row in enumerate(rows):
                    old_code = row["employeeCode"]
                    new_code = str(next_num + index)
                    new_ktp = row["ktpNumber"]
                    if not new_ktp and KTP_PATTERN.match(old_code):
                        new_ktp = old_code

                    new_email = row["email"]
                    if new_email and f"dw.{old_code.lower()}@" in new_email.lower():
                        new_email = re.sub(
                            re.escape(old_code),
                            new_code,
                            new_email,
                            count=1,
                        )

                    print(f"  {old_code} -> {new_code}" + (f" | KTP {new_ktp}" if new_ktp else ""))

                    if dry_run:
                        continue

                    cur.execute(
                        """
                        UPDATE employees
                        SET "employeeCode" = %s,
                            "ktpNumber" = %s,
                            email = %s,
                            "updatedAt" = NOW()
                        WHERE id = %s
                        """,
                        (new_code, new_ktp, new_email, row["id"]),
                    )

                    cur.execute(
                        """
                        UPDATE attendance_punches
                        SET nik = %s
                        WHERE "tenantId" = %s AND nik = %s
                        """,
                        (new_code, tenant_id, old_code),
                    )
                    cur.execute(
                        """
                        UPDATE attendance_punch_jobs
                        SET nik = %s, "updatedAt" = NOW()
                        WHERE "tenantId" = %s AND nik = %s
                        """,
                        (new_code, tenant_id, old_code),
                    )

                    total += 1

            if dry_run:
                conn.rollback()
                print(f"Dry-run selesai ({total} baris simulasi).")
            else:
                conn.commit()
                print(f"Backfill selesai: {total} pegawai diperbarui.")
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true", help="Hanya tampilkan mapping, tanpa UPDATE")
    args = parser.parse_args()
    backfill(dry_run=args.dry_run)


if __name__ == "__main__":
    main()
