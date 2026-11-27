export interface LinkDepartment {
  id: string;
  parentId: string | null;
  classification?: string | null;
}

export interface LinkDesignation {
  id: string;
  name: string;
  code?: string | null;
  parentId: string | null;
  departmentId: string | null;
}

const DEPT_HEAD = /head of (dept|department)\b/i;
const DIVISION_HEAD = /head of division\b/i;

function byCode<T extends { code?: string | null }>(items: T[]): T[] {
  return [...items].sort((a, b) => (a.code || '').localeCompare(b.code || ''));
}

/**
 * Jabatan SSO yang tidak punya line report (parent kosong) disambungkan ke
 * kepala departemen yang sudah ada di pohon, atau ke kepala divisi bila
 * departemen itu belum punya jabatan yang terhubung.
 */
export function inferUnparentedPositionLinks(
  departments: LinkDepartment[],
  designations: LinkDesignation[],
): { id: string; parentId: string }[] {
  const deptById = new Map(departments.map((department) => [department.id, department]));
  const byDept = new Map<string, LinkDesignation[]>();
  for (const designation of designations) {
    if (!designation.departmentId) continue;
    const list = byDept.get(designation.departmentId) ?? [];
    list.push(designation);
    byDept.set(designation.departmentId, list);
  }

  const links: { id: string; parentId: string }[] = [];

  for (const [deptId, items] of byDept) {
    const ids = new Set(items.map((item) => item.id));
    const orphans = items.filter((item) => !item.parentId);
    if (orphans.length === 0) continue;

    const linkedTops = items.filter(
      (item) => item.parentId && !ids.has(item.parentId),
    );
    if (linkedTops.length > 0) {
      const named = linkedTops.filter(
        (item) => DEPT_HEAD.test(item.name) || DIVISION_HEAD.test(item.name),
      );
      const anchor = (byCode(named.length ? named : linkedTops))[0];
      for (const orphan of orphans) {
        if (orphan.id !== anchor.id) {
          links.push({ id: orphan.id, parentId: anchor.id });
        }
      }
      continue;
    }

    const department = deptById.get(deptId);
    const divisionItems = department?.parentId
      ? (byDept.get(department.parentId) ?? [])
      : [];
    const divisionHeads = divisionItems.filter(
      (item) => item.parentId && DIVISION_HEAD.test(item.name),
    );
    const divisionAnchor =
      divisionHeads[0] ?? divisionItems.find((item) => item.parentId) ?? null;
    if (!divisionAnchor) continue;

    const deptHeads = orphans.filter((item) => DEPT_HEAD.test(item.name));
    const divHeads = orphans.filter((item) => DIVISION_HEAD.test(item.name));
    const pool =
      department?.classification === 'DIVISION'
        ? divHeads.length > 0
          ? divHeads
          : deptHeads
        : deptHeads.length > 0
          ? deptHeads
          : divHeads;
    const localHead = pool.length > 0 ? byCode(pool)[0] : null;

    if (localHead) {
      links.push({ id: localHead.id, parentId: divisionAnchor.id });
      for (const orphan of orphans) {
        if (orphan.id !== localHead.id) {
          links.push({ id: orphan.id, parentId: localHead.id });
        }
      }
    } else {
      for (const orphan of orphans) {
        links.push({ id: orphan.id, parentId: divisionAnchor.id });
      }
    }
  }

  return links;
}
