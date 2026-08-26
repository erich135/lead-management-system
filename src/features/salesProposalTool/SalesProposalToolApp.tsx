import { useParams } from 'react-router-dom';
import { SalesProposalHomePage } from './pages/SalesProposalHomePage';
import { SalesProposalEditorPage } from './pages/SalesProposalEditorPage';

export function SalesProposalToolApp() {
  const { proposalId } = useParams();
  return proposalId ? <SalesProposalEditorPage /> : <SalesProposalHomePage />;
}
