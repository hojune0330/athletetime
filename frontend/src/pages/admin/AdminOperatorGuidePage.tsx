import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { getOperatorGuide, type OperatorGuide } from '../../api/admin';
import { Button } from '../../components/ui/button';

export default function AdminOperatorGuidePage() {
  const [guide, setGuide] = useState<OperatorGuide | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadGuide() {
    setLoading(true);
    setError(null);
    try {
      const nextGuide = await getOperatorGuide();
      setGuide(nextGuide);
    } catch (caught) {
      const message =
        caught instanceof Error ? caught.message : '운영 기준을 불러오지 못했습니다.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadGuide();
  }, []);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <span className="font-mono text-mono-xs uppercase tracking-widest-2 text-brand-500">
            OPERATOR GUIDE
          </span>
          <h1 className="mt-1 text-h2 font-medium tracking-tighter-2 text-ink">
            운영 기준
          </h1>
          <p className="mt-1 max-w-2xl text-body-sm text-ink-3">
            문의, 정정 요청, 커뮤니티 신고, 악용 신호를 같은 기준으로 처리하기 위한 내부용
            도움말입니다.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadGuide} disabled={loading}>
          새로고침
        </Button>
      </header>

      {loading && (
        <p className="border border-hair bg-surface px-4 py-8 text-center text-body-sm text-ink-4">
          불러오는 중…
        </p>
      )}

      {error && (
        <p className="border border-err/30 bg-err/5 px-3 py-2 text-body-sm text-err">
          {error}
        </p>
      )}

      {guide && !loading && (
        <>
          <div className="border border-warn/30 bg-warn/5 px-4 py-3">
            <p className="text-body-sm font-medium text-ink">{guide.title}</p>
            <p className="mt-1 text-caption leading-5 text-ink-3">{guide.disclaimer}</p>
            <p className="mt-2 font-mono text-mono-xs uppercase tracking-widest-2 text-ink-4">
              VERSION {guide.version} · {guide.audience}
            </p>
          </div>

          <Section title="오늘 먼저 볼 것">
            <Checklist items={guide.dailyChecks} />
          </Section>

          <Section title="대응 단계">
            <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {guide.responseFlow.map((item, index) => (
                <li key={item.step} className="border border-hair bg-surface-2 p-3">
                  <p className="font-mono text-mono-xs text-brand-500">
                    {String(index + 1).padStart(2, '0')}
                  </p>
                  <p className="mt-1 text-body-sm font-semibold text-ink">{item.label}</p>
                  <p className="mt-1 text-caption leading-5 text-ink-3">{item.body}</p>
                </li>
              ))}
            </ol>
          </Section>

          <Section title="상황별 Q&A">
            <div className="space-y-3">
              {guide.scenarios.map((scenario) => (
                <article key={scenario.id} className="border border-hair bg-surface">
                  <div className="border-b border-hair bg-surface-2 px-4 py-3">
                    <h3 className="text-body font-semibold text-ink">{scenario.title}</h3>
                    <p className="mt-1 text-body-sm text-ink-3">{scenario.summary}</p>
                  </div>
                  <div className="grid gap-4 px-4 py-4 lg:grid-cols-2">
                    <MiniList title="먼저 할 일" items={scenario.firstActions} />
                    <MiniList title="상향 검토" items={scenario.escalateWhen} />
                    <div>
                      <p className="text-caption uppercase tracking-wider-2 text-ink-4">
                        공개 답변
                      </p>
                      <p className="mt-1 text-body-sm leading-6 text-ink-2">
                        {scenario.safePublicReply}
                      </p>
                    </div>
                    <MiniList title="피할 말" items={scenario.avoid} />
                  </div>
                </article>
              ))}
            </div>
          </Section>

          <Section title="에스컬레이션">
            <div className="grid gap-3 lg:grid-cols-2">
              {guide.escalationStates.map((state) => (
                <article key={state.id} className="border border-hair bg-surface px-4 py-3">
                  <p className="text-body-sm font-semibold text-ink">{state.label}</p>
                  <p className="mt-1 text-caption leading-5 text-ink-3">{state.when}</p>
                  <p className="mt-2 font-mono text-mono-xs uppercase tracking-widest-2 text-ink-4">
                    OWNER · {state.owner}
                  </p>
                </article>
              ))}
            </div>
          </Section>

          <div className="grid gap-4 lg:grid-cols-2">
            <Section title="공개해도 되는 말">
              <Checklist items={guide.publicPhrases} />
            </Section>
            <Section title="하면 안 되는 말">
              <Checklist items={guide.forbiddenPhrases} />
            </Section>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Section title="운영 체크리스트">
              <Checklist items={guide.evidenceChecklist} />
            </Section>
            <Section title="공개 범위">
              <MiniList title="이용자에게 충분히 알려도 되는 것" items={guide.publicBoundary.publicEnough} />
              <div className="mt-4">
                <MiniList title="내부에서만 다룰 것" items={guide.publicBoundary.internalOnly} />
              </div>
            </Section>
          </div>
        </>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border border-hair bg-surface p-4">
      <h2 className="text-body font-semibold text-ink">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Checklist({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item} className="flex gap-2 text-body-sm leading-6 text-ink-2">
          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function MiniList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <p className="text-caption uppercase tracking-wider-2 text-ink-4">{title}</p>
      <ul className="mt-1 space-y-1.5">
        {items.map((item) => (
          <li key={item} className="text-body-sm leading-6 text-ink-2">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
