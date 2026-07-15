import { useEffect } from 'react';
import type { AthleteSearchCard } from '../../api/recordAnalytics';
import type { MyAthleteEntry } from '../record-insights/useMyAthlete';
import { CandidateStep } from './RecordsMineCandidateStep';
import { ConfirmStep } from './RecordsMineConfirmStep';
import { DoneStep } from './RecordsMineDoneStep';
import { WizardFrame } from './RecordsMineFrame';
import { NameStep } from './RecordsMineNameStep';
import type { MineStep, RecordsLoadState } from './RecordsMineTypes';

export type { MineStep } from './RecordsMineTypes';

type RecordsMineFlowProps = {
  readonly step: MineStep;
  readonly query: string;
  readonly submittedQuery: string;
  readonly searchState: RecordsLoadState;
  readonly athletes: readonly AthleteSearchCard[];
  readonly selectedDraftKeys: readonly string[];
  readonly myEntries: readonly MyAthleteEntry[];
  readonly onQueryChange: (value: string) => void;
  readonly onSubmitName: (value: string) => void;
  readonly onToggleDraft: (athlete: AthleteSearchCard) => void;
  readonly onBack: () => void;
  readonly onQuit: () => void;
  readonly onGoToStep: (step: MineStep) => void;
  readonly onConfirm: (athletes: readonly AthleteSearchCard[]) => void;
  readonly onRemoveMyAthlete: (athleteKey: string) => void;
  readonly onSeasonForMine: () => void;
};

export function normalizeMineStep(value: string | null): MineStep {
  if (value === 'candidates' || value === 'confirm' || value === 'done') return value;
  return 'name';
}

export function RecordsMineFlow({
  step,
  query,
  submittedQuery,
  searchState,
  athletes,
  selectedDraftKeys,
  myEntries,
  onQueryChange,
  onSubmitName,
  onToggleDraft,
  onBack,
  onQuit,
  onGoToStep,
  onConfirm,
  onRemoveMyAthlete,
  onSeasonForMine,
}: RecordsMineFlowProps) {
  const selectedAthletes = athletes.filter((athlete) => selectedDraftKeys.includes(athlete.athleteKey));

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [step]);

  return (
    <section className="space-y-4" data-records-flow="mine" data-records-step={`mine-${step}`}>
      <WizardFrame step={step} onBack={onBack} onQuit={onQuit}>
        {step === 'name' && (
          <NameStep query={query} onQueryChange={onQueryChange} onSubmitName={onSubmitName} />
        )}
        {step === 'candidates' && (
          <CandidateStep
            query={submittedQuery}
            athletes={athletes}
            state={searchState}
            selectedKeys={selectedDraftKeys}
            onToggleDraft={onToggleDraft}
            onNext={() => onGoToStep('confirm')}
          />
        )}
        {step === 'confirm' && (
          <ConfirmStep
            selectedAthletes={selectedAthletes}
            onToggleDraft={onToggleDraft}
            onBackToCandidates={() => onGoToStep('candidates')}
            onConfirm={() => onConfirm(selectedAthletes)}
          />
        )}
        {step === 'done' && (
          <DoneStep
            entries={myEntries}
            onAddMore={() => onGoToStep('name')}
            onSeasonForMine={onSeasonForMine}
            onRemoveMyAthlete={onRemoveMyAthlete}
          />
        )}
      </WizardFrame>
    </section>
  );
}
