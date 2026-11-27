# Graph Report - en-hrms-be-fe/backend/src/modules/employees/import  (2026-11-07)

## Corpus Check
- 16 files · ~5,041 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 61 nodes · 130 edges · 7 communities (6 shown, 1 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]

## God Nodes (most connected - your core abstractions)
1. `parseEmployeeSheet()` - 11 edges
2. `IMPORT_HEADERS` - 8 edges
3. `EmployeeImportController` - 7 edges
4. `EmployeeImportService` - 7 edges
5. `assertImportHeaders()` - 5 edges
6. `EmployeeImportJobData` - 5 edges
7. `normalizeImportProgress()` - 5 edges
8. `assertNikPrefix()` - 5 edges
9. `nextEmployeeCode()` - 5 edges
10. `buildFailedImportRowsWorkbook()` - 4 edges

## Surprising Connections (you probably didn't know these)
- `parseEmployeeSheet()` --calls--> `assertImportHeaders()`  [EXTRACTED]
  employee-import-parser.ts → employee-import-parser.ts  _Bridges community 5 → community 1_

## Import Cycles
- None detected.

## Communities (7 total, 1 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.24
Nodes (8): buildFailedImportRowsWorkbook(), buildEmployeeImportTemplate(), EmployeeImportProgress, EMPLOYMENT_TYPES, EmploymentTypeValue, EMPTY_IMPORT_PROGRESS, IMPORT_HEADERS, ImportRowError

### Community 1 - "Community 1"
Cohesion: 0.33
Nodes (8): CELL_MODES, findByCodeOrName(), isBlankRow(), normalizeBankName(), parseEmployeeSheet(), parseEmploymentType(), parseGender(), parseJoinDate()

### Community 4 - "Community 4"
Cohesion: 0.25
Nodes (6): jakartaJoinDate(), EmployeeImportProcessor, worksheetToRows(), EmployeeImportService, importRowToCells(), ParsedEmployeeRow

### Community 5 - "Community 5"
Cohesion: 0.29
Nodes (5): assertImportHeaders(), departments, designations, header, valid

### Community 6 - "Community 6"
Cohesion: 0.29
Nodes (4): countNonEmptyDataRows(), EmployeeImportController, EmployeeImportJobData, normalizeImportProgress()

## Knowledge Gaps
- **6 isolated node(s):** `departments`, `designations`, `header`, `valid`, `CELL_MODES` (+1 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `normalizeImportProgress()` connect `Community 6` to `Community 0`?**
  _High betweenness centrality (0.070) - this node is a cross-community bridge._
- **Why does `IMPORT_HEADERS` connect `Community 0` to `Community 1`, `Community 5`, `Community 6`?**
  _High betweenness centrality (0.065) - this node is a cross-community bridge._
- **What connects `departments`, `designations`, `header` to the rest of the system?**
  _6 weakly-connected nodes found - possible documentation gaps or missing edges._