import { Link } from 'react-router-dom';
import { ChevronDownIcon, ChevronRightIcon, UserIcon } from '@heroicons/react/24/outline';
import type { ResultEvent } from '../../../api/competitions';
import {
  AthleteNameLink,
  extractGender,
  getEventTypeInfo,
  getProfileCardLabel,
  getProfileCardPath,
  ProvenanceBadge,
  RankBadge,
} from './shared';

type ResultEventAccordionProps = {
  readonly resultEvent: ResultEvent;
  readonly index: number;
  readonly isExpanded: boolean;
  readonly resultPeriod?: string;
  readonly onToggle: (index: number) => void;
};

export function ResultEventAccordion({
  resultEvent,
  index,
  isExpanded,
  resultPeriod,
  onToggle,
}: ResultEventAccordionProps) {
  const typeInfo = getEventTypeInfo(resultEvent.eventType);
  const gender = extractGender(resultEvent.event);

  return (
    <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-sm">
      <button
        onClick={() => onToggle(index)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-neutral-50 transition-colors text-left"
      >
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <ChevronDownIcon className={`w-4 h-4 text-neutral-400 transition-transform shrink-0 ${isExpanded ? '' : '-rotate-90'}`} />
          <span className={`px-2 py-0.5 ${typeInfo.bg} ${typeInfo.text} text-xs font-medium rounded`}>
            {typeInfo.label}
          </span>
          {gender && (
            <span className="px-1.5 py-0.5 text-xs font-medium rounded bg-neutral-100 text-neutral-600">
              {gender === '남자' ? '♂' : gender === '여자' ? '♀' : '⚤'}
            </span>
          )}
          <span className="font-bold text-neutral-900 text-sm">{resultEvent.event}</span>
          {resultEvent.wind && <span className="text-xs text-neutral-400">풍속 {resultEvent.wind}m/s</span>}
        </div>
        <span className="text-xs text-neutral-400 shrink-0 ml-2">{resultEvent.totalAthletes}명</span>
      </button>

      {isExpanded && (
        <div className="border-t border-neutral-100">
          <div className="hidden sm:block">
            <table className="w-full">
              <thead><tr className="bg-neutral-50">
                <th className="px-4 py-2 text-center text-xs font-medium text-neutral-500 w-14">순위</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-neutral-500">선수명</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-neutral-500">소속</th>
                <th className="px-4 py-2 text-center text-xs font-medium text-neutral-500 w-24">기록</th>
                {resultEvent.hasWind && <th className="px-4 py-2 text-center text-xs font-medium text-neutral-500 w-16">바람</th>}
                <th className="px-4 py-2 text-center text-xs font-medium text-neutral-500 w-10"></th>
              </tr></thead>
              <tbody>
                {resultEvent.results.map((result, resultIndex) => {
                  const profileCardPath = getProfileCardPath(result.name);
                  return (
                    <tr key={resultIndex} className={`border-t border-neutral-50 ${result.rank <= 3 ? 'bg-amber-50/40' : ''}`}>
                      <td className="px-4 py-2.5 text-center">
                        <RankBadge rank={result.rank} />
                      </td>
                      <td className="px-4 py-2.5 text-sm font-medium text-neutral-900">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <AthleteNameLink row={result} className="hover:text-primary-700 hover:underline" />
                          <ProvenanceBadge provenance={result.provenance} />
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-sm text-neutral-600">{result.affiliation}</td>
                      <td className="px-4 py-2.5 text-center text-sm font-mono font-bold text-neutral-900">{result.record}</td>
                      {resultEvent.hasWind && <td className="px-4 py-2.5 text-center text-xs text-neutral-400">{result.wind || '-'}</td>}
                      <td className="px-4 py-2.5 text-center">
                        {profileCardPath && (
                          <Link
                            to={profileCardPath}
                            aria-label={getProfileCardLabel(result.name)}
                            title="프로필 카드 만들기"
                            className="inline-flex items-center justify-center w-7 h-7 bg-primary-50 text-primary-600 rounded-lg hover:bg-primary-100 transition-colors"
                          >
                            <UserIcon className="w-3.5 h-3.5" />
                          </Link>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="sm:hidden divide-y divide-neutral-50">
            {resultEvent.results.map((result, resultIndex) => {
              const profileCardPath = getProfileCardPath(result.name);
              return (
                <div
                  key={resultIndex}
                  className={`grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 px-3.5 py-3 ${
                    result.rank <= 3 ? 'bg-amber-50/30' : ''
                  }`}
                >
                  <div className="row-span-2 self-start pt-0.5">
                    <RankBadge rank={result.rank} />
                  </div>
                  <div className="min-w-0">
                    <AthleteNameLink
                      row={result}
                      className="block truncate text-[15px] font-bold leading-tight text-neutral-950 hover:text-primary-700 hover:underline"
                    />
                    <div className="mt-0.5 truncate text-xs text-neutral-500">{result.affiliation}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-base font-mono font-black leading-tight tracking-tight text-neutral-950">{result.record}</span>
                    {resultEvent.hasWind && result.wind && (
                      <div className="text-[10px] font-medium text-neutral-400">풍속 {result.wind}m/s</div>
                    )}
                  </div>
                  <div className="col-start-2 col-span-2 flex min-w-0 items-center justify-between gap-2">
                    <ProvenanceBadge provenance={result.provenance} />
                    {profileCardPath && (
                      <Link
                        to={profileCardPath}
                        aria-label={getProfileCardLabel(result.name)}
                        className="shrink-0 text-[11px] font-semibold text-neutral-500 underline-offset-2 hover:text-primary-700 hover:underline"
                      >
                        카드
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="px-4 py-2.5 bg-neutral-50 border-t border-neutral-100 flex items-center justify-between">
            {resultEvent.date && resultPeriod && !resultPeriod.startsWith(resultEvent.date) && (
              <span className="text-xs text-neutral-400">경기일 {resultEvent.date}</span>
            )}
            <Link to="/profile-card" className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1 ml-auto">
              이 종목 선수로 프로필 카드 만들기 <ChevronRightIcon className="w-3 h-3" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
