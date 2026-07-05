import { Link } from 'react-router-dom';

const readyFeatures = [
  {
    title: '경기 결과',
    description: '대회 일정과 결과를 먼저 안정적으로 확인해요.',
    path: '/competitions',
    accent: 'bg-emerald-500',
  },
  {
    title: '페이스 계산기',
    description: '거리와 기록을 넣고 목표 페이스를 빠르게 계산해요.',
    path: '/pace-calculator',
    accent: 'bg-orange-500',
  },
  {
    title: '훈련 계산기',
    description: '훈련 강도와 반복 구간을 실전적으로 정리해요.',
    path: '/training-calculator',
    accent: 'bg-sky-500',
  },
] as const;

const upcomingFeatures = ['커뮤니티', '실시간 채팅', '중고거래', '흥미로운 기록 조회'] as const;

export default function MainPage() {
  return (
    <main className="min-h-screen bg-neutral-950 text-white">
      <section className="relative overflow-hidden px-5 py-8 md:px-10 md:py-12">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(16,185,129,0.28),transparent_32%),radial-gradient(circle_at_80%_0%,rgba(14,165,233,0.22),transparent_26%)]" />
        <div className="relative mx-auto max-w-6xl">
          <header className="mb-20 flex items-center justify-between">
            <Link to="/" className="text-lg font-black tracking-tight">
              Athlete Time
            </Link>
            <div className="flex items-center gap-3 text-sm">
              <Link to="/login" className="text-white/70 transition-colors hover:text-white">
                로그인
              </Link>
              <Link
                to="/register"
                className="rounded-full border border-white/20 px-4 py-2 font-bold transition-colors hover:bg-white hover:text-neutral-950"
              >
                회원가입
              </Link>
            </div>
          </header>

          <div className="grid gap-12 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
            <div>
              <p className="mb-5 inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-bold text-white/80">
                서비스 오픈 준비 중
              </p>
              <h1 className="max-w-3xl text-5xl font-black leading-tight tracking-tight md:text-7xl">
                육상 기록과 대회 정보를 먼저 안정적으로.
              </h1>
              <p className="mt-7 max-w-2xl text-lg leading-8 text-white/68">
                Athlete Time은 지금 바로 쓸 수 있는 기능부터 열어둡니다. 커뮤니티와 채팅처럼
                운영 기준이 필요한 기능은 안전 장치를 갖춘 뒤 순서대로 공개할게요.
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link
                  to="/competitions"
                  className="rounded-2xl bg-white px-6 py-4 text-center font-black text-neutral-950 transition-transform hover:-translate-y-0.5"
                >
                  경기 결과 보기
                </Link>
                <Link
                  to="/pace-calculator"
                  className="rounded-2xl border border-white/20 px-6 py-4 text-center font-black text-white transition-colors hover:bg-white/10"
                >
                  페이스 계산하기
                </Link>
              </div>
            </div>

            <aside className="rounded-[2rem] border border-white/10 bg-white/[0.07] p-6 backdrop-blur">
              <p className="mb-4 text-sm font-bold text-white/55">이번 런칭에서 열어두는 것</p>
              <div className="space-y-3">
                {readyFeatures.map((feature) => (
                  <Link
                    key={feature.path}
                    to={feature.path}
                    className="group flex items-center gap-4 rounded-2xl bg-white p-4 text-neutral-950 transition-transform hover:-translate-y-0.5"
                  >
                    <span className={`h-10 w-2 rounded-full ${feature.accent}`} />
                    <span className="flex-1">
                      <span className="block font-black">{feature.title}</span>
                      <span className="mt-1 block text-sm leading-5 text-neutral-500">
                        {feature.description}
                      </span>
                    </span>
                    <span className="text-neutral-400 transition-transform group-hover:translate-x-1">→</span>
                  </Link>
                ))}
              </div>
            </aside>
          </div>
        </div>
      </section>

      <section className="bg-white px-5 py-16 text-neutral-950 md:px-10">
        <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-[0.85fr_1.15fr]">
          <div>
            <p className="mb-3 text-sm font-black text-neutral-400">COMING NEXT</p>
            <h2 className="text-3xl font-black tracking-tight md:text-5xl">준비 안 된 건 숨깁니다.</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {upcomingFeatures.map((feature) => (
              <div key={feature} className="rounded-3xl border border-neutral-200 p-5">
                <p className="text-lg font-black">{feature}</p>
                <p className="mt-2 text-sm leading-6 text-neutral-500">
                  실제 사용자에게 보여도 될 만큼 안정화한 뒤 공개합니다.
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
