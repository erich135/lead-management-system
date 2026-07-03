/**
 * Bouwa feature module — public barrel export.
 *
 * Import from this file when consuming Bouwa module components externally.
 *
 * IMPORTANT: This barrel is NOT imported into:
 *   - src/components/Dashboard.tsx
 *   - src/components/MobileNavigation.tsx
 *
 * Phase 4C-2: shell exports.
 * Phase 4C-3: route guard exported.
 * Phase 4C-4: API helpers and entity types exported.
 */

// Shell page
export { BouwaModuleShell } from './pages/BouwaModuleShell';

// Sub-components
export { BouwaPhaseCard } from './components/BouwaPhaseCard';
export { BouwaAccessNotice } from './components/BouwaAccessNotice';
export { BouwaRouteGuard } from './components/BouwaRouteGuard';
export { BouwaMachineSpecLibrary } from './components/BouwaMachineSpecLibrary';

// Shell types
export type { BouwaPhaseStatus, BouwaShellCard, BouwaAccessRequirement } from './types';

// API entity types
export type {
  BouwaId,
  ISODateString,
  BouwaMachineSpecCategory,
  BouwaMachineSpecSpeedControl,
  BouwaMachineSpec,
  CreateBouwaMachineSpecPayload,
  UpdateBouwaMachineSpecPayload,
  BouwaTariffTable,
  CreateBouwaTariffTablePayload,
  UpdateBouwaTariffTablePayload,
  BouwaAuditSessionStatus,
  BouwaAuditSession,
  CreateBouwaAuditSessionPayload,
  UpdateBouwaAuditSessionPayload,
  BouwaProposalStatus,
  BouwaProposalDraft,
  CreateBouwaProposalDraftPayload,
  UpdateBouwaProposalDraftPayload,
  BouwaFormulaApprovalStatus,
  BouwaFormulaApproval,
  CreateBouwaFormulaApprovalPayload,
  UpdateBouwaFormulaApprovalPayload,
  BouwaAssumption,
  CreateBouwaAssumptionPayload,
  UpdateBouwaAssumptionPayload,
  BouwaEvidenceFile,
  CreateBouwaEvidenceFileMetadataPayload,
  UpdateBouwaEvidenceFileMetadataPayload,
  BouwaReportTemplateStatus,
  BouwaReportTemplate,
  CreateBouwaReportTemplatePayload,
  UpdateBouwaReportTemplatePayload,
} from './types';

// API helpers (scaffolded; not yet called from BouwaModuleShell)
export {
  listBouwaMachineSpecs,
  getBouwaMachineSpec,
  createBouwaMachineSpec,
  updateBouwaMachineSpec,
  listBouwaTariffTables,
  getBouwaTariffTable,
  createBouwaTariffTable,
  updateBouwaTariffTable,
  listBouwaAuditSessions,
  getBouwaAuditSession,
  createBouwaAuditSession,
  updateBouwaAuditSession,
  listBouwaProposalDrafts,
  getBouwaProposalDraft,
  createBouwaProposalDraft,
  updateBouwaProposalDraft,
  archiveBouwaProposalDraft,
  listBouwaFormulaApprovals,
  getBouwaFormulaApproval,
  createBouwaFormulaApproval,
  updateBouwaFormulaApproval,
  listBouwaAssumptions,
  getBouwaAssumption,
  createBouwaAssumption,
  updateBouwaAssumption,
  listBouwaEvidenceFiles,
  getBouwaEvidenceFile,
  createBouwaEvidenceFileMetadata,
  updateBouwaEvidenceFileMetadata,
  listBouwaReportTemplates,
  getBouwaReportTemplate,
  createBouwaReportTemplate,
  updateBouwaReportTemplate,
} from './api/bouwaApi';

// Config re-export for convenience
export {
  BOUWA_MODULE_KEY,
  BOUWA_FEATURE_FLAG,
  BOUWA_VIEW_PERMISSION,
  BOUWA_ALL_PERMISSIONS,
  BOUWA_PERMISSIONS,
  BOUWA_MODULE_META,
} from './bouwaFrontendConfig';
