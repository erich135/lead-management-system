// Module declarations for TypeScript to recognize component modules
declare module './SalesLeadDiary' {
  const SalesLeadDiary: React.FC;
  export default SalesLeadDiary;
}

declare module './SalesLeadReports' {
  const SalesLeadReports: React.FC;
  export default SalesLeadReports;
}

declare module './CanvassingPlansList' {
  const CanvassingPlansList: React.FC;
  export default CanvassingPlansList;
}

declare module './WeeklyPlanner' {
  const WeeklyPlanner: React.FC;
  export default WeeklyPlanner;
}

declare module './AppointmentScheduler' {
  import type { RepCode } from '../lib/api';
  
  interface AppointmentSchedulerProps {
    leadId: string;
    leadCompanyName: string;
    repCodes: RepCode[];
    onClose: () => void;
    onSave: () => void;
  }
  
  export function AppointmentScheduler(props: AppointmentSchedulerProps): JSX.Element;
}
