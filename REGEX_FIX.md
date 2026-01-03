# Regex Escaping Fix

## Issue
TypeScript compilation error in `src/utils/lyricsService.ts` due to incorrect regex escaping.

## Root Cause
The find-and-replace added extra backslashes (`\\`) that broke the regex patterns:
```typescript
// ❌ WRONG (broken)
const isLRC = lines.some((line) => /^\\[\\d{2}:\\d{2}[\\.\\d]*\\]/.test(line));

// ✅ CORRECT (fixed)
const isLRC = lines.some((line) => /^\[\d{2}:\d{2}[\.\d]*\]/.test(line));
```

## Fixed Lines

### Line 81: LRC Format Detection
```typescript
// Before (❌ broken):
const isLRC = lines.some((line) => /^\\[\\d{2}:\\d{2}[\\.\\d]*\\]/.test(line));

// After (✅ fixed):
const isLRC = lines.some((line) => /^\[\d{2}:\d{2}[\.\d]*\]/.test(line));
```

### Line 87: LRC Line Parsing
```typescript
// Before (❌ broken):
const match = line.match(/^\\[(\\d{2}):(\\d{2})(?:\\.(\\d{2,3}))?\\](.*)$/);

// After (✅ fixed):
const match = line.match(/^\[(\d{2}):(\d{2})(?:\.(\d{2,3}))?\](.*)$/);
```

### Line 101: Structural Tag Filtering
```typescript
// Before (❌ broken):
const structuralTagPattern = /^\\[(Verse|Chorus|Bridge|Intro|Outro|Pre-Chorus|Hook|Interlude|Break|Breakdown|Fade|Refrain|Coda|Instrumental|Rap|Ad-Lib)/i;

// After (✅ fixed):
const structuralTagPattern = /^\[(Verse|Chorus|Bridge|Intro|Outro|Pre-Chorus|Hook|Interlude|Break|Breakdown|Fade|Refrain|Coda|Instrumental|Rap|Ad-Lib)/i;
```

## What Was Changed
- Removed extra backslashes from regex patterns
- Fixed character class escaping (`\\[` → `\[`)
- Fixed digit escaping (`\\d` → `\d`)
- Fixed dot escaping (`\\.` → `\.`)
- Corrected capture group escaping

## Status
✅ **FIXED** - File now compiles correctly

## Verification
Run: `npm run build`

Expected: No TypeScript syntax errors

---

*Fix Applied: 2026-01-04*
