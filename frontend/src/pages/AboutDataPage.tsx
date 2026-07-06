/**
 * AboutDataPage — 데이터 출처 · 원칙 안내 (/about-data)
 *
 * 목적(#9): "우리는 무엇을, 어떻게, 어떤 원칙으로 모으는가"를 이용자에게 정직하게 공개.
 *   - 분쟁/문제 제기 시 "처음부터 선의로 설계했다"는 가시적 증거가 된다.
 *   - 동시에 "육상에 관심이 모이도록"이라는 긍정 메시지를 전하는 무대.
 *
 * ⚠️ 공통 신뢰 문구는 config/dataPolicy.ts, 이 페이지 전용 설명은 aboutDataContent.ts에서 가져온다.
 *    이 페이지는 "구조"만 담당해, 정책과 설명을 나중에 따로 손보기 쉽게 한다.
 */

import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import {
  SERVICE_IDENTITY,
  CORRECTION_POLICY,
  TRUST_NOTICE,
  DATA_POLICY_VERSION,
} from '../config/dataPolicy';
import { DataCollectionSections } from './AboutDataSections';

/**
 * 화면에 보여줄 "원칙" 목록. 데이터 전략 문서(master/legal-review)의 핵심을
 * 이용자 언어로 요약한 것. 항목 추가/수정이 쉽도록 배열로 둔다.
 */
const PRINCIPLES: { title: string; body: string }[] = [
  {
    title: '공개된 사실만 모아요',
    body: '대회에서 공개된 경기 결과(누가·언제·어디서·몇 등·기록)만 모아 정리해요. 원본 페이지를 그대로 복제하는 게 아니라, 사실만 추려서 다시 정리한 자료예요.',
  },
  {
    title: '개인정보는 모으지 않아요',
    body: '생년월일·연락처·주소·식별번호 같은 민감한 개인정보는 모으지도, 저장하지도, 보여주지도 않아요. 화면에 보이는 건 공개된 경기 정보뿐이에요.',
  },
  {
    title: '출처를 함께 보여줘요',
    body: '기록마다 어느 대회에서 공개된 결과인지 출처를 함께 표시해요. 우리가 원저작자라고 주장하지 않아요 — 공개 자료를 모아 정리했을 뿐이에요.',
  },
  {
    title: '공식 기록·순위가 아니에요',
    body: 'AthleteTime은 공식 기록이나 순위를 정하는 기관이 아니에요. 우리가 모은 기록 안에서의 흐름과 사실을 보여줄 뿐, 평가나 예측은 하지 않아요.',
  },
  {
    title: '같은 이름은 다른 선수일 수 있어요',
    body: '이름이 같아도 다른 선수일 수 있어요. 한 사람으로 함부로 합치지 않고, 소속·연도를 함께 확인할 수 있게 보여줘요.',
  },
  {
    title: '미성년 선수는 더 조심해요',
    body: '경기 결과는 누구나 동일하게 보여주되, 특정 선수를 콕 집어 카드로 만들어 퍼뜨리는 일은 미성년 선수의 경우 더 신중하게 다뤄요.',
  },
  {
    title: '빼달라고 요청할 수 있어요',
    body: `${CORRECTION_POLICY.notice} 요청을 받으면 빠르게 검토해서 반영해요. (즉시·영구 같은 단정은 하지 않아요. 정직하게 처리할게요.)`,
  },
];

const PUBLIC_FAQ: { question: string; answer: string }[] = [
  {
    question: '정정·비노출은 어떻게 요청하나요?',
    answer:
      '기록이 본인 것이 아니거나 노출을 줄이고 싶다면 요청서를 남겨 주세요. 접수번호로 처리 상태를 확인할 수 있어요.',
  },
  {
    question: '공식 기록 서비스인가요?',
    answer:
      '아니요. AthleteTime은 공개 경기 결과를 모아 탐색하기 쉽게 정리한 서비스예요. 공식 기록은 원출처를 함께 확인해 주세요.',
  },
  {
    question: '내부 운영 기준은 왜 모두 공개하지 않나요?',
    answer:
      '요청 처리 기준은 공개하되, 악용될 수 있는 세부 절차는 운영자만 확인해요. 대신 출처, 정정 경로, 노출 원칙은 이 페이지에 계속 공개합니다.',
  },
];

export default function AboutDataPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      {/* 헤더 */}
      <header className="space-y-2">
        <p className="text-sm font-medium text-brand-500">데이터 안내</p>
        <h1 className="text-2xl font-bold text-ink sm:text-3xl">
          AthleteTime은 이렇게 기록을 모아요
        </h1>
        <p className="text-sm leading-6 text-ink-3">{SERVICE_IDENTITY.what}</p>
      </header>

      {/* 무엇인가 / 아닌가 / 왜 */}
      <Card>
        <CardHeader>
          <CardTitle>무엇을 하는 서비스인가요?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm leading-6 text-ink-2">
          <div>
            <p className="font-semibold text-ink">하는 일</p>
            <p>{SERVICE_IDENTITY.what}</p>
          </div>
          <div>
            <p className="font-semibold text-ink">하지 않는 일</p>
            <p>{SERVICE_IDENTITY.whatNot}</p>
          </div>
          <div>
            <p className="font-semibold text-ink">왜 만드나요?</p>
            <p>{SERVICE_IDENTITY.why}</p>
          </div>
        </CardContent>
      </Card>

      <DataCollectionSections />

      {/* 원칙 */}
      <Card>
        <CardHeader>
          <CardTitle>우리가 지키는 원칙</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {PRINCIPLES.map((p) => (
            <div key={p.title} className="border-l-2 border-brand-500/40 pl-3">
              <p className="font-semibold text-ink">{p.title}</p>
              <p className="mt-0.5 text-sm leading-6 text-ink-3">{p.body}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>자주 묻는 질문</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm leading-6 text-ink-2">
          {PUBLIC_FAQ.map((faq) => (
            <div key={faq.question} className="border-b border-hair pb-3 last:border-b-0 last:pb-0">
              <p className="font-semibold text-ink">{faq.question}</p>
              <p className="mt-1 text-ink-3">{faq.answer}</p>
            </div>
          ))}
          <Link
            to="/data-request"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 transition hover:text-brand-700"
          >
            정정·비노출 요청으로 이동
          </Link>
        </CardContent>
      </Card>

      {/* 정정·비노출 요청 CTA */}
      <Card>
        <CardHeader>
          <CardTitle>내 기록을 빼거나 고치고 싶다면</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm leading-6 text-ink-2">
          <p>{CORRECTION_POLICY.notice}</p>
          <p className="text-ink-4">{TRUST_NOTICE.snapshot}</p>
          <Link
            to={CORRECTION_POLICY.requestPath}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
          >
            정정·비노출 요청하기
          </Link>
        </CardContent>
      </Card>

      <p className="text-center text-[11px] text-ink-4">
        데이터 안내 기준일 · {DATA_POLICY_VERSION}
      </p>
    </div>
  );
}
