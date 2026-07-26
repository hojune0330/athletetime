import { Link } from 'react-router-dom'

type FeaturePreparingPageProps = {
  title: string
  description: string
}

export default function FeaturePreparingPage({ title, description }: FeaturePreparingPageProps) {
  return (
    <section className="mx-auto max-w-2xl py-12 sm:py-20">
      <p className="font-mono text-xs uppercase tracking-[0.18em] text-ink-4">준비 중</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">{title}</h1>
      <p className="mt-4 max-w-xl text-base leading-7 text-ink-3">{description}</p>
      <p className="mt-3 text-sm leading-6 text-ink-4">
        안전한 운영 기준과 신고·검토 절차를 먼저 갖춘 뒤 열겠습니다.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link to="/records" className="btn-primary">내 기록 찾기</Link>
        <Link to="/competitions" className="btn-secondary">대회 결과 보기</Link>
      </div>
    </section>
  )
}
