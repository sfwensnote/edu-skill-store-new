import { useEffect, useState } from 'react';
import type { SkillEntry } from '../../../shared/marketplace';
import type { Verification } from '../../../shared/execution';
import { executionApi, failureMessage, isVerified, serviceConfigured, serviceIssue } from './api';

export function useVerification() {
  const [proofs, setProofs] = useState<Verification[]>([]);
  const [error, setError] = useState(serviceConfigured ? '' : serviceIssue());
  useEffect(() => {
    if (!serviceConfigured) return;
    let disposed = false;
    function refresh() {
      void executionApi<Verification[]>('/verified').then(value => { if (!disposed) { setProofs(value); setError(''); } })
        .catch(error => { if (!disposed) { setProofs([]); setError(failureMessage(error)); } });
    }
    refresh(); window.addEventListener('execution-changed', refresh); window.addEventListener('focus', refresh);
    return () => { disposed = true; window.removeEventListener('execution-changed', refresh); window.removeEventListener('focus', refresh); };
  }, []);
  return { error, proofs, verified: (entry: SkillEntry) => isVerified(entry, proofs) };
}
