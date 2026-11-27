import { Injectable } from "@nestjs/common";
import * as PDFDocument from "pdfkit";
import * as fs from "fs";
import * as path from "path";

export interface PayslipForPdf {
  id: string;
  currency?: string;
  workingDays: number;
  presentDays: number;
  leaveDays: number;
  lopDays: number;
  otHours: number | string;
  basePay: number | string;
  earnings: { name: string; amount: number }[];
  deductions: { name: string; amount: number }[];
  grossPay: number | string;
  totalDeductions: number | string;
  netPay: number | string;
  otPay: number | string;
  employee?: {
    firstName: string;
    lastName: string;
    employeeCode: string;
    email?: string;
    designation?: string | { name: string } | null;
    department?: { name: string } | string | null;
    joinDate?: Date | string | null;
    employmentType?: string | null;
    payType?: string | null;
  };
  payrollRun?: {
    month?: number | null;
    year?: number | null;
    status: string;
    kind?: string;
    periodStart?: Date | string | null;
    periodEnd?: Date | string | null;
  };
  company?: {
    name?: string | null;
    legalName?: string | null;
    address?: string | null;
    email?: string | null;
    phone?: string | null;
    logoUrl?: string | null;
  };
}

const MONTH_NAMES = [
  "",
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const MONTH_NAMES_ID = [
  "",
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

export function extractDesignationName(designation: unknown): string {
  if (!designation) return "-";
  if (typeof designation === "string") return designation;
  if (
    typeof designation === "object" &&
    designation !== null &&
    "name" in designation
  ) {
    return String((designation as { name: unknown }).name) || "-";
  }
  return "-";
}

export function extractDepartmentName(department: unknown): string {
  if (!department) return "-";
  if (typeof department === "string") return department;
  if (
    typeof department === "object" &&
    department !== null &&
    "name" in department
  ) {
    return String((department as { name: unknown }).name) || "-";
  }
  return "-";
}

export function terbilang(n: number | string): string {
  const bilangan = [
    "",
    "Satu",
    "Dua",
    "Tiga",
    "Empat",
    "Lima",
    "Enam",
    "Tujuh",
    "Delapan",
    "Sembilan",
    "Sepuluh",
    "Sebelas",
  ];

  const roundN = Math.floor(Math.abs(Number(n) || 0));
  if (roundN === 0) return "Nol Rupiah";

  function convert(num: number): string {
    if (num < 12) {
      return bilangan[num];
    } else if (num < 20) {
      return convert(num - 10) + " Belas";
    } else if (num < 100) {
      return convert(Math.floor(num / 10)) + " Puluh " + convert(num % 10);
    } else if (num < 200) {
      return "Seratus " + convert(num - 100);
    } else if (num < 1000) {
      return convert(Math.floor(num / 100)) + " Ratus " + convert(num % 100);
    } else if (num < 2000) {
      return "Seribu " + convert(num - 1000);
    } else if (num < 1000000) {
      return convert(Math.floor(num / 1000)) + " Ribu " + convert(num % 1000);
    } else if (num < 1000000000) {
      return (
        convert(Math.floor(num / 1000000)) + " Juta " + convert(num % 1000000)
      );
    } else if (num < 1000000000000) {
      return (
        convert(Math.floor(num / 1000000000)) +
        " Miliar " +
        convert(num % 1000000000)
      );
    } else {
      return (
        convert(Math.floor(num / 1000000000000)) +
        " Triliun " +
        convert(num % 1000000000000)
      );
    }
  }

  const result = convert(roundN).replace(/\s+/g, " ").trim();
  return result ? `${result} Rupiah` : "Nol Rupiah";
}

export function payslipPeriodLabel(run?: {
  month?: number | null;
  year?: number | null;
  periodStart?: Date | string | null;
  periodEnd?: Date | string | null;
  kind?: string | null;
}): string {
  const isDaily =
    run?.kind === "DAILY" ||
    Boolean(
      run?.periodStart &&
      run?.periodEnd &&
      run?.month == null &&
      run?.year == null,
    );

  if (isDaily && run?.periodStart && run?.periodEnd) {
    return formatDailyPeriodHuman(run.periodStart, run.periodEnd);
  }
  const month = run?.month ?? 0;
  const year = run?.year ?? "";
  return `${MONTH_NAMES[month] ?? ""} ${year}`.trim();
}

function parseDateOnlyPdf(value: Date | string): Date {
  if (value instanceof Date) {
    return new Date(
      value.getFullYear(),
      value.getMonth(),
      value.getDate(),
      12,
      0,
      0,
    );
  }
  const iso = String(value).slice(0, 10);
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d, 12, 0, 0);
}

function formatDailyPeriodHuman(
  periodStart: Date | string,
  periodEnd: Date | string,
): string {
  const start = parseDateOnlyPdf(periodStart);
  const end = parseDateOnlyPdf(periodEnd);
  const locale = "id-ID";
  const sameMonth =
    start.getFullYear() === end.getFullYear() &&
    start.getMonth() === end.getMonth();
  if (sameMonth) {
    const monthYear = end.toLocaleDateString(locale, {
      month: "long",
      year: "numeric",
    });
    return `${start.getDate()} – ${end.getDate()} ${monthYear}`;
  }
  const opts: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "long",
    year: "numeric",
  };
  return `${start.toLocaleDateString(locale, opts)} – ${end.toLocaleDateString(locale, opts)}`;
}

function findLogoPath(): string | null {
  const candidates = [
    path.resolve(process.cwd(), "assets/logo.png"),
    path.resolve(process.cwd(), "../frontend/public/logo.png"),
    path.resolve(__dirname, "../../../assets/logo.png"),
    path.resolve(__dirname, "../../../../assets/logo.png"),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

@Injectable()
export class PayrollPdfService {
  async generatePayslipPdf(payslip: PayslipForPdf): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const PDFDoc: any =
        typeof PDFDocument === "function"
          ? PDFDocument
          : (PDFDocument as any).default || PDFDocument;

      // Standard A4: 595.28 x 841.89 points
      const doc = new PDFDoc({
        margin: 40,
        size: "A4",
        info: {
          Title: `Payslip - ${payslip.employee?.employeeCode || "Employee"}`,
          Author: payslip.company?.legalName || "HRMS",
          Subject: "Employee Payslip",
        },
      });

      // Avoid automatic unwanted pagebreak on bottom footer text
      doc.page.margins.bottom = 20;

      const chunks: Buffer[] = [];
      doc.on("data", (chunk: Buffer) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      const formatCurrency = (val: number | string) => {
        const num = Number(val) || 0;
        const curr = (payslip.currency || "IDR").toUpperCase();
        if (curr === "IDR") {
          return `Rp ${Math.round(num).toLocaleString("id-ID")}`;
        }
        if (curr === "USD") {
          return `$ ${num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        }
        if (curr === "INR") {
          return `₹ ${num.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
        }
        return `${curr} ${num.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
      };

      const periodLabel = payslipPeriodLabel(payslip.payrollRun);
      const emp = payslip.employee;
      const designationName = extractDesignationName(emp?.designation);
      const departmentName = extractDepartmentName(emp?.department);
      const company = payslip.company || {};
      const companyLegalName =
        company.legalName ||
        company.name ||
        "Perusahaan";
      const companyAddress =
        company.address || "Jakarta, Indonesia";
      const companyEmail = company.email || "hr@example.com";

      const isDailyRun =
        payslip.payrollRun?.kind === "DAILY" ||
        Boolean(
          payslip.payrollRun?.periodStart && payslip.payrollRun?.periodEnd,
        );

      const pageWidth = doc.page.width; // 595.28
      const margin = 40;
      const contentWidth = pageWidth - margin * 2; // 515.28

      // ======================================================================
      // 1. TOP CORPORATE ACCENT BAR
      // ======================================================================
      doc.rect(0, 0, pageWidth, 4).fill("#1e3a8a"); // Navy accent line

      // ======================================================================
      // 2. HEADER: COMPANY INFO (LEFT) & PAYSLIP DETAILS (RIGHT)
      // ======================================================================
      const headerTopY = 32;
      const logoPath = findLogoPath();
      let leftHeaderContentY = headerTopY;

      if (logoPath) {
        try {
          doc.image(logoPath, margin, headerTopY, { fit: [120, 36] });
          leftHeaderContentY += 40;
        } catch {
          doc
            .font("Helvetica-Bold")
            .fontSize(14)
            .fillColor("#0f172a")
            .text(company.name || "HRMS", margin, headerTopY);
          leftHeaderContentY += 18;
        }
      } else {
        doc
          .font("Helvetica-Bold")
          .fontSize(14)
          .fillColor("#0f172a")
          .text(company.name || "HRMS", margin, headerTopY);
        leftHeaderContentY += 18;
      }

      doc
        .font("Helvetica-Bold")
        .fontSize(8.5)
        .fillColor("#334155")
        .text(companyLegalName, margin, leftHeaderContentY, { width: 260 });

      doc
        .font("Helvetica")
        .fontSize(7.5)
        .fillColor("#64748b")
        .text(
          `${companyAddress}  •  ${companyEmail}`,
          margin,
          leftHeaderContentY + 12,
          { width: 280 },
        );

      // Right Header: Document Meta
      const rightColX = 335;
      const rightColW = pageWidth - margin - rightColX;

      doc
        .font("Helvetica-Bold")
        .fontSize(16)
        .fillColor("#0f172a")
        .text("SLIP GAJI", rightColX, headerTopY, {
          width: rightColW,
          align: "right",
        });

      doc
        .font("Helvetica-Bold")
        .fontSize(9.5)
        .fillColor("#2563eb")
        .text(periodLabel, rightColX, headerTopY + 20, {
          width: rightColW,
          align: "right",
        });

      const slipIdShort = payslip.id
        ? `PS-${payslip.id.slice(0, 8).toUpperCase()}`
        : "-";
      doc
        .font("Helvetica")
        .fontSize(8)
        .fillColor("#64748b")
        .text(`No: ${slipIdShort}`, rightColX, headerTopY + 34, {
          width: rightColW,
          align: "right",
        });

      // Status pill badge
      const runStatus = (
        payslip.payrollRun?.status || "COMPUTED"
      ).toUpperCase();
      const statusBg =
        runStatus === "PAID"
          ? "#dcfce7"
          : runStatus === "APPROVED"
            ? "#e0f2fe"
            : "#f1f5f9";
      const statusTextColor =
        runStatus === "PAID"
          ? "#166534"
          : runStatus === "APPROVED"
            ? "#0369a1"
            : "#475569";
      const badgeWidth = 64;
      const badgeHeight = 15;
      const badgeX = pageWidth - margin - badgeWidth;
      const badgeY = headerTopY + 48;

      doc
        .roundedRect(badgeX, badgeY, badgeWidth, badgeHeight, 3)
        .fill(statusBg);
      doc
        .font("Helvetica-Bold")
        .fontSize(7.5)
        .fillColor(statusTextColor)
        .text(runStatus, badgeX, badgeY + 3.5, {
          width: badgeWidth,
          align: "center",
        });

      // Header Divider Line
      const dividerY = 100;
      doc
        .moveTo(margin, dividerY)
        .lineTo(margin + contentWidth, dividerY)
        .strokeColor("#e2e8f0")
        .lineWidth(1)
        .stroke();

      // ======================================================================
      // 3. EMPLOYEE & ATTENDANCE SUMMARY CARD
      // ======================================================================
      const cardY = 112;
      const cardHeight = 84;
      doc
        .roundedRect(margin, cardY, contentWidth, cardHeight, 4)
        .fillAndStroke("#f8fafc", "#e2e8f0");

      // Left Section: Employee Details
      const empLeftX = margin + 14;
      doc
        .font("Helvetica-Bold")
        .fontSize(11)
        .fillColor("#0f172a")
        .text(
          `${emp?.firstName ?? ""} ${emp?.lastName ?? ""}`.trim() ||
            "Employee Name",
          empLeftX,
          cardY + 10,
        );

      const empDetails: Array<[string, string]> = [
        ["NIK / ID", emp?.employeeCode || "-"],
        ["Jabatan", designationName],
        ["Departemen", departmentName],
        ["Email", emp?.email || "-"],
      ];

      let empRowY = cardY + 28;
      for (const [lbl, val] of empDetails) {
        doc
          .font("Helvetica-Bold")
          .fontSize(8)
          .fillColor("#64748b")
          .text(lbl, empLeftX, empRowY, { width: 70 });
        doc
          .font("Helvetica")
          .fontSize(8)
          .fillColor("#1e293b")
          .text(`:  ${val}`, empLeftX + 68, empRowY, {
            width: 170,
            ellipsis: true,
          });
        empRowY += 13;
      }

      // Middle Vertical Divider inside card
      const cardDividerX = margin + 265;
      doc
        .moveTo(cardDividerX, cardY + 8)
        .lineTo(cardDividerX, cardY + cardHeight - 8)
        .strokeColor("#e2e8f0")
        .lineWidth(0.75)
        .stroke();

      // Right Section: Attendance & Work Summary
      const attLeftX = cardDividerX + 14;
      doc
        .font("Helvetica-Bold")
        .fontSize(8)
        .fillColor("#475569")
        .text("RINGKASAN KEHADIRAN & HARI KERJA", attLeftX, cardY + 10);

      const attDetails: Array<[string, string]> = isDailyRun
        ? [
            ["Hari Hadir", `${payslip.presentDays} Hari`],
            ["Tarif Harian", `${formatCurrency(payslip.basePay)} / hari`],
            ["Ketidakhadiran (LOP)", `${payslip.lopDays} Hari`],
            ["Tipe Penggajian", "Harian Lepas (Daily)"],
          ]
        : [
            ["Hari Kerja Standar", `${payslip.workingDays} Hari`],
            ["Hari Hadir", `${payslip.presentDays} Hari`],
            [
              "Cuti / Izin",
              `${payslip.leaveDays} Hari  (LOP: ${payslip.lopDays})`,
            ],
            ["Lembur (OT)", `${Number(payslip.otHours || 0).toFixed(1)} Jam`],
          ];

      let attRowY = cardY + 28;
      for (const [lbl, val] of attDetails) {
        doc
          .font("Helvetica-Bold")
          .fontSize(8)
          .fillColor("#64748b")
          .text(lbl, attLeftX, attRowY, { width: 110 });
        doc
          .font("Helvetica-Bold")
          .fontSize(8)
          .fillColor(lbl === "Hari Hadir" ? "#2563eb" : "#1e293b")
          .text(`:  ${val}`, attLeftX + 105, attRowY, { width: 120 });
        attRowY += 13;
      }

      // ======================================================================
      // 4. EARNINGS & DEDUCTIONS TABLES
      // ======================================================================
      const tableTopY = 210;
      const tableColWidth = (contentWidth - 20) / 2; // 247.64
      const leftTableX = margin;
      const rightTableX = margin + tableColWidth + 20;

      // Table Header Component
      const drawTableHeader = (
        x: number,
        y: number,
        title: string,
        amountLabel: string,
      ) => {
        doc.rect(x, y, tableColWidth, 22).fill("#1e293b");
        doc
          .font("Helvetica-Bold")
          .fontSize(8.5)
          .fillColor("#ffffff")
          .text(title, x + 10, y + 6.5, { width: tableColWidth - 90 });
        doc
          .font("Helvetica-Bold")
          .fontSize(8.5)
          .fillColor("#ffffff")
          .text(amountLabel, x + tableColWidth - 80, y + 6.5, {
            width: 70,
            align: "right",
          });
      };

      const curr = (payslip.currency || "IDR").toUpperCase();
      drawTableHeader(
        leftTableX,
        tableTopY,
        "PENGHASILAN (EARNINGS)",
        `JUMLAH (${curr})`,
      );
      drawTableHeader(
        rightTableX,
        tableTopY,
        "POTONGAN (DEDUCTIONS)",
        `JUMLAH (${curr})`,
      );

      // Prepare Earnings Items
      interface LineItem {
        label: string;
        amount: number;
        subtext?: string;
      }

      const earningsItems: LineItem[] = [];
      if (isDailyRun) {
        // Daily Worker: Gross = presentDays * basePay
        const baseDailyTotal =
          Number(payslip.grossPay) - Number(payslip.otPay || 0);
        earningsItems.push({
          label: `Gaji Harian (${payslip.presentDays} hari @ ${formatCurrency(payslip.basePay)})`,
          amount: baseDailyTotal,
        });
      } else {
        earningsItems.push({
          label: "Gaji Pokok (Basic Salary)",
          amount: Number(payslip.basePay) || 0,
        });
      }

      const extraEarnings =
        (payslip.earnings as { name: string; amount: number }[]) || [];
      for (const e of extraEarnings) {
        earningsItems.push({
          label: e.name,
          amount: Number(e.amount) || 0,
        });
      }

      if (Number(payslip.otPay) > 0) {
        earningsItems.push({
          label: `Upah Lembur (${Number(payslip.otHours || 0).toFixed(1)} Jam)`,
          amount: Number(payslip.otPay) || 0,
        });
      }

      // Prepare Deductions Items
      const deductionsItems: LineItem[] = [];
      const extraDeductions =
        (payslip.deductions as { name: string; amount: number }[]) || [];
      for (const d of extraDeductions) {
        deductionsItems.push({
          label: d.name,
          amount: Number(d.amount) || 0,
        });
      }

      // Row Drawer
      const rowHeight = 20;
      const maxRows = Math.max(earningsItems.length, deductionsItems.length, 2);

      const drawDataRow = (
        x: number,
        y: number,
        item?: LineItem,
        isEven = false,
      ) => {
        if (isEven) {
          doc.rect(x, y, tableColWidth, rowHeight).fill("#f8fafc");
        }
        // Bottom border
        doc
          .moveTo(x, y + rowHeight)
          .lineTo(x + tableColWidth, y + rowHeight)
          .strokeColor("#f1f5f9")
          .lineWidth(0.5)
          .stroke();

        if (item) {
          doc
            .font("Helvetica")
            .fontSize(8.5)
            .fillColor("#334155")
            .text(item.label, x + 10, y + 5.5, {
              width: tableColWidth - 95,
              ellipsis: true,
            });

          doc
            .font("Helvetica")
            .fontSize(8.5)
            .fillColor("#0f172a")
            .text(
              formatCurrency(item.amount),
              x + tableColWidth - 85,
              y + 5.5,
              {
                width: 75,
                align: "right",
              },
            );
        }
      };

      let currentTableRowY = tableTopY + 22;
      for (let i = 0; i < maxRows; i++) {
        const isEven = i % 2 === 1;
        drawDataRow(leftTableX, currentTableRowY, earningsItems[i], isEven);

        if (deductionsItems[i]) {
          drawDataRow(
            rightTableX,
            currentTableRowY,
            deductionsItems[i],
            isEven,
          );
        } else if (i === 0 && deductionsItems.length === 0) {
          drawDataRow(
            rightTableX,
            currentTableRowY,
            { label: "- Tidak ada potongan -", amount: 0 },
            isEven,
          );
        } else {
          drawDataRow(rightTableX, currentTableRowY, undefined, isEven);
        }

        currentTableRowY += rowHeight;
      }

      // Subtotal Rows
      const subtotalRowHeight = 24;
      const subtotalY = currentTableRowY;

      // Earnings Total
      doc
        .rect(leftTableX, subtotalY, tableColWidth, subtotalRowHeight)
        .fill("#f1f5f9");
      doc
        .moveTo(leftTableX, subtotalY)
        .lineTo(leftTableX + tableColWidth, subtotalY)
        .strokeColor("#cbd5e1")
        .lineWidth(1)
        .stroke();
      doc
        .moveTo(leftTableX, subtotalY + subtotalRowHeight)
        .lineTo(leftTableX + tableColWidth, subtotalY + subtotalRowHeight)
        .strokeColor("#cbd5e1")
        .lineWidth(1)
        .stroke();

      doc
        .font("Helvetica-Bold")
        .fontSize(8.5)
        .fillColor("#0f172a")
        .text(
          "Total Penghasilan Kotor (Gross)",
          leftTableX + 10,
          subtotalY + 7.5,
          {
            width: tableColWidth - 95,
          },
        );
      doc
        .font("Helvetica-Bold")
        .fontSize(8.5)
        .fillColor("#0f172a")
        .text(
          formatCurrency(payslip.grossPay),
          leftTableX + tableColWidth - 85,
          subtotalY + 7.5,
          {
            width: 75,
            align: "right",
          },
        );

      // Deductions Total
      doc
        .rect(rightTableX, subtotalY, tableColWidth, subtotalRowHeight)
        .fill("#f1f5f9");
      doc
        .moveTo(rightTableX, subtotalY)
        .lineTo(rightTableX + tableColWidth, subtotalY)
        .strokeColor("#cbd5e1")
        .lineWidth(1)
        .stroke();
      doc
        .moveTo(rightTableX, subtotalY + subtotalRowHeight)
        .lineTo(rightTableX + tableColWidth, subtotalY + subtotalRowHeight)
        .strokeColor("#cbd5e1")
        .lineWidth(1)
        .stroke();

      doc
        .font("Helvetica-Bold")
        .fontSize(8.5)
        .fillColor("#0f172a")
        .text(
          "Total Potongan (Deductions)",
          rightTableX + 10,
          subtotalY + 7.5,
          {
            width: tableColWidth - 95,
          },
        );
      doc
        .font("Helvetica-Bold")
        .fontSize(8.5)
        .fillColor("#0f172a")
        .text(
          formatCurrency(payslip.totalDeductions),
          rightTableX + tableColWidth - 85,
          subtotalY + 7.5,
          {
            width: 75,
            align: "right",
          },
        );

      // ======================================================================
      // 5. NET PAY CARD (TAKE HOME PAY)
      // ======================================================================
      const netPayY = subtotalY + subtotalRowHeight + 16;
      const netPayHeight = 46;

      doc
        .roundedRect(margin, netPayY, contentWidth, netPayHeight, 5)
        .fill("#0f172a"); // Corporate deep slate/navy

      // Net Pay Text Left
      doc
        .font("Helvetica-Bold")
        .fontSize(8.5)
        .fillColor("#94a3b8")
        .text("TOTAL GAJI BERSIH (TAKE HOME PAY)", margin + 18, netPayY + 11);

      doc
        .font("Helvetica")
        .fontSize(7.5)
        .fillColor("#cbd5e1")
        .text(
          "Total Penghasilan Kotor  -  Total Potongan",
          margin + 18,
          netPayY + 25,
        );

      // Net Pay Amount Right
      doc
        .font("Helvetica-Bold")
        .fontSize(16)
        .fillColor("#ffffff")
        .text(formatCurrency(payslip.netPay), margin + 250, netPayY + 14, {
          width: contentWidth - 268,
          align: "right",
        });

      // Terbilang Strip
      const terbilangY = netPayY + netPayHeight + 8;
      const terbilangHeight = 22;
      doc
        .roundedRect(margin, terbilangY, contentWidth, terbilangHeight, 3)
        .fillAndStroke("#f8fafc", "#e2e8f0");

      const terbilangText = terbilang(payslip.netPay);
      doc
        .font("Helvetica-Oblique")
        .fontSize(8)
        .fillColor("#475569")
        .text(
          `Terbilang: # ${terbilangText} #`,
          margin + 10,
          terbilangY + 6.5,
          {
            width: contentWidth - 20,
            align: "center",
          },
        );

      // ======================================================================
      // 6. OFFICIAL SYSTEM VALIDATION NOTE
      // ======================================================================
      const noteY = terbilangY + terbilangHeight + 16;
      doc
        .font("Helvetica-Oblique")
        .fontSize(7.5)
        .fillColor("#64748b")
        .text(
          "* Dokumen ini diterbitkan secara otomatis oleh sistem HRMS dan merupakan bukti pembayaran yang sah tanpa tanda tangan basah.",
          margin,
          noteY,
          { width: contentWidth, align: "center" },
        );

      // ======================================================================
      // 7. FOOTER & DISCLAIMER
      // ======================================================================
      const footerY = 750;
      doc
        .moveTo(margin, footerY)
        .lineTo(margin + contentWidth, footerY)
        .strokeColor("#e2e8f0")
        .lineWidth(0.75)
        .stroke();

      doc
        .font("Helvetica")
        .fontSize(7)
        .fillColor("#94a3b8")
        .text(
          "CONFIDENTIAL  ·  Dokumen ini diterbitkan secara sah oleh sistem HRMS.",
          margin,
          footerY + 8,
          { width: contentWidth, align: "center" },
        );

      const printDateStr = new Date().toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
      doc
        .font("Helvetica")
        .fontSize(6.5)
        .fillColor("#94a3b8")
        .text(
          `Halaman 1 dari 1  ·  Dicetak otomatis pada ${printDateStr}`,
          margin,
          footerY + 18,
          { width: contentWidth, align: "center" },
        );

      doc.end();
    });
  }
}
