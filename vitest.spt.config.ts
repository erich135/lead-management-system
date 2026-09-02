import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'spt-behavioural',
    environment: 'node',
    include: [
      'src/features/salesProposalTool/proposedConfigurationValidity.test.ts',
      'src/features/salesProposalTool/publishedPackageInput.test.ts',
      'src/features/salesProposalTool/currentMachinePerformance.test.ts',
      'src/features/salesProposalTool/salesProposalPersistence.test.ts',
      'src/features/salesProposalTool/sitePerformancePresentation.test.ts',
      'src/features/salesProposalTool/noAuditOperatingPresentation.test.ts',
      'src/features/salesProposalTool/specSheetConfirm.test.ts',
    ],
  },
});
