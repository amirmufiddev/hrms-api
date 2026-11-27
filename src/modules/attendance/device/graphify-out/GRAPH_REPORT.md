# Graph Report - en-hrms-be-fe/backend/src/modules/attendance/device  (2026-11-06)

## Corpus Check
- 29 files · ~13,418 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 213 nodes · 420 edges · 8 communities (7 shown, 1 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 8|Community 8]]

## God Nodes (most connected - your core abstractions)
1. `DeviceDirectorySyncService` - 46 edges
2. `DevicePace` - 27 edges
3. `PaceKind` - 16 edges
4. `AttendanceDeskService` - 13 edges
5. `DeviceDirectoryClient` - 13 edges
6. `AttendanceDeskController` - 12 edges
7. `DeviceCommandGate` - 9 edges
8. `enrollIdFromNik()` - 7 edges
9. `DevicePushIngestService` - 7 edges
10. `DeviceLogClient` - 6 edges

## Surprising Connections (you probably didn't know these)
- `DeviceDirectorySyncService` --references--> `DevicePaceError`  [EXTRACTED]
  device-directory-sync.service.ts → device-directory.client.ts
- `parsePunchQuery()` --calls--> `jakartaDayWindow()`  [EXTRACTED]
  punch-query.ts → jakarta-day.ts

## Import Cycles
- None detected.

## Communities (8 total, 1 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.07
Nodes (15): AttendanceDeskController, RemoveDirectoryUserDto, SaveAttendanceDeviceDto, SyncDirectoryDto, AttendanceDeskService, deviceData(), DeviceRow, DeviceWrite (+7 more)

### Community 1 - "Community 1"
Cohesion: 0.10
Nodes (14): DeviceCommandGate, countOf(), DeviceDirectoryClient, DeviceReply, DeviceEndpoint, DeviceLogClient, DeviceReply, endpoint (+6 more)

### Community 2 - "Community 2"
Cohesion: 0.11
Nodes (7): DeviceUserRow, cardValue(), DeviceDirectorySyncService, deviceUid(), enrollIdFromNik(), formatJakartaHm(), idleProgress()

### Community 3 - "Community 3"
Cohesion: 0.12
Nodes (12): DeviceLogRow, NormalizedDevicePunch, normalizeDeviceLog(), VERIFY_MODE, DevicePushIngestService, PushDevice, gate, DevicePushListener (+4 more)

### Community 4 - "Community 4"
Cohesion: 0.12
Nodes (13): DeviceEndpoint, DevicePaceError, BIO_SLOTS, deviceName(), DirectoryProgress, LiveDevice, OnlineDevice, parseSlots() (+5 more)

### Community 5 - "Community 5"
Cohesion: 0.19
Nodes (14): addDays(), attendanceDateKey(), buildSessions(), dateKey(), DaySummary, FoldedSession, hhmmToMinutes(), jakartaParts() (+6 more)

### Community 8 - "Community 8"
Cohesion: 0.53
Nodes (3): identityCardCanonical(), reverseUidBytes(), isNumericToken()

## Knowledge Gaps
- **30 isolated node(s):** `SaveAttendanceDeviceDto`, `RemoveDirectoryUserDto`, `SyncDirectoryDto`, `PunchRow`, `DeviceRow` (+25 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `DeviceDirectorySyncService` connect `Community 2` to `Community 0`, `Community 4`?**
  _High betweenness centrality (0.252) - this node is a cross-community bridge._
- **Why does `DevicePace` connect `Community 6` to `Community 1`, `Community 2`, `Community 4`?**
  _High betweenness centrality (0.233) - this node is a cross-community bridge._
- **Why does `DeviceLogRow` connect `Community 3` to `Community 1`?**
  _High betweenness centrality (0.092) - this node is a cross-community bridge._
- **What connects `SaveAttendanceDeviceDto`, `RemoveDirectoryUserDto`, `SyncDirectoryDto` to the rest of the system?**
  _30 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.07200929152148665 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.10317460317460317 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.11212121212121212 - nodes in this community are weakly interconnected._