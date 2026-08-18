const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');
const EVIDENCE_DIR = process.env.RECORDS_E2E_EVIDENCE_DIR
  || path.join(ROOT, '.omo', 'evidence', 'athletetime-division-navigation-improvement');
const VIEWPORTS = [
  { width: 320, height: 667 },
  { width: 375, height: 667 },
  { width: 768, height: 900 },
  { width: 1280, height: 900 },
];
const SOURCE_FILES = [
  'backend/tests/division-navigation-e2e.test.js',
  'backend/tests/division-navigation-e2e-capture.js',
  'backend/tests/division-navigation-e2e-config.js',
  'backend/tests/division-navigation-e2e-keyboard.js',
  'backend/tests/division-navigation-e2e-manifest.js',
  'backend/tests/division-navigation-e2e-scenarios.js',
  'backend/tests/records-flow-e2e-data.js',
  'backend/tests/records-flow-e2e-evidence.js',
  'backend/tests/records-flow-e2e-fixture.js',
  'backend/tests/records-flow-e2e-network.js',
  'backend/tests/records-flow-e2e-runtime.js',
  'card-studio/routes/recordAnalyticsRoutes.js',
  'card-studio/services/recordAnalyticsService.js',
  'data/results/index.json',
  'frontend/src/api/recordWorkspace.ts',
  'frontend/src/pages/RecordsPage.tsx',
  'frontend/src/components/records/TeamStatisticsResults.tsx',
  'frontend/src/features/record-workspace/components/RecordCandidateCard.tsx',
  'frontend/src/features/record-workspace/components/RecordCandidateList.tsx',
  'frontend/src/features/record-workspace/components/RecordDetailSheet.tsx',
  'frontend/src/features/record-workspace/components/RecordRow.tsx',
  'frontend/src/features/record-workspace/pages/RecordAthletePage.tsx',
  'frontend/src/features/record-workspace/recordWorkspacePreviewPages.ts',
  'frontend/src/features/record-workspace/season-navigation/seasonNavigation.ts',
  'frontend/src/features/record-workspace/season-navigation/SeasonRecordResults.tsx',
  'frontend/src/features/record-workspace/season-navigation/SeasonRecordRows.tsx',
  'frontend/src/features/record-workspace/season-navigation/SeasonRecordsPanel.tsx',
  'frontend/src/features/record-workspace/season-navigation/useSeasonRecordsController.ts',
  'frontend/src/features/record-workspace/useRecordAthletePreview.ts',
  'frontend/src/features/team-performance/TeamCategoryFilter.tsx',
  'frontend/src/features/team-performance/teamCategoryLabels.ts',
];

module.exports = { EVIDENCE_DIR, ROOT, SOURCE_FILES, VIEWPORTS };
