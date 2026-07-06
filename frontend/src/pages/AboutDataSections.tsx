import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import {
  COLLECTION_METHODS,
  DATA_PROCESSING_STEPS,
  DATA_USE_BOUNDARIES,
  KOGL_LICENSE_TYPES,
  SOURCE_LEDGER_FIELDS,
} from './aboutDataContent';

export function DataCollectionSections() {
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>자료를 모으는 방식</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          {COLLECTION_METHODS.map((method) => (
            <section key={method.title} className="border border-hair bg-surface-2 p-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-semibold text-ink">{method.title}</h2>
                <span className="shrink-0 border border-hair px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-ink-4">
                  {method.badge}
                </span>
              </div>
              <p className="mt-2 text-sm leading-6 text-ink-3">{method.body}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {method.examples.map((example) => (
                  <span key={example} className="rounded-full bg-white px-2.5 py-1 text-xs text-ink-3">
                    {example}
                  </span>
                ))}
              </div>
            </section>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>단순 복사가 아니라 이렇게 가공해요</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          {DATA_PROCESSING_STEPS.map((step) => (
            <section key={step.title} className="border-l-2 border-brand-500/40 pl-3">
              <p className="font-semibold text-ink">{step.title}</p>
              <p className="mt-1 text-sm leading-6 text-ink-3">{step.body}</p>
            </section>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>원출처 기록에 남기는 것</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm leading-6 text-ink-3">
            대회 결과를 자료화할 때는 나중에 다시 확인할 수 있도록 파일명과 다운로드 주소까지 함께 남겨요.
          </p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {SOURCE_LEDGER_FIELDS.map((field) => (
              <div key={field.label} className="border border-hair p-3">
                <p className="font-semibold text-ink">{field.label}</p>
                <p className="mt-1 text-sm leading-5 text-ink-3">{field.body}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>공공누리 4유형은 무엇인가요?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm leading-6 text-ink-3">
            공공누리는 공공저작물 이용조건을 알려주는 표시예요. 유형마다 상업적 이용과 변경 가능 여부가 달라요.
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            {KOGL_LICENSE_TYPES.map((license) => (
              <section
                key={license.type}
                className="border border-hair bg-white p-4 data-[limited=true]:border-orange-200 data-[limited=true]:bg-orange-50/50"
                data-limited={license.type === '공공누리 4유형'}
              >
                <p className="font-semibold text-ink">{license.type}</p>
                <p className="mt-1 text-sm text-ink-2">{license.condition}</p>
                <p className="mt-2 text-sm leading-6 text-ink-3">{license.serviceUse}</p>
              </section>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>우리가 지키는 경계</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          {DATA_USE_BOUNDARIES.map((boundary) => (
            <section key={boundary.title} className="border border-hair p-4">
              <p className="font-semibold text-ink">{boundary.title}</p>
              <p className="mt-1 text-sm leading-6 text-ink-3">{boundary.body}</p>
            </section>
          ))}
        </CardContent>
      </Card>
    </>
  );
}
