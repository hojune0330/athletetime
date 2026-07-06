import { Link } from 'react-router-dom';
import { ChevronDownIcon, UserIcon } from '@heroicons/react/24/outline';
import type { SearchResultRow, SearchSection } from '../../../api/competitions';
import {
  AthleteNameLink,
  getEventTypeInfo,
  getProfileCardLabel,
  getProfileCardPath,
  getRankLabel,
  ProvenanceBadge,
  RankBadge,
} from './shared';

type SearchResultSectionProps = {
  readonly section: SearchSection;
  readonly isExpanded: boolean;
  readonly onToggle: (event: string) => void;
};

export function SearchResultSection({ section, isExpanded, onToggle }: SearchResultSectionProps) {
  const typeInfo = getEventTypeInfo(section.eventType);

  return (
    <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-sm">
      <button
        onClick={() => onToggle(section.event)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-neutral-50 transition-colors text-left"
      >
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <ChevronDownIcon className={`w-4 h-4 text-neutral-400 transition-transform shrink-0 ${isExpanded ? '' : '-rotate-90'}`} />
          <span className={`px-2 py-0.5 ${typeInfo.bg} ${typeInfo.text} text-xs font-medium rounded`}>
            {typeInfo.label}
          </span>
          <span className="font-bold text-neutral-900 text-sm">{section.event}</span>
        </div>
        <span className="text-xs shrink-0 ml-2">
          <span className={`font-bold ${section.bestMatchRank === 1 ? 'text-success-600' : 'text-neutral-700'}`}>
            {getRankLabel(section.bestMatchRank)}
          </span>
        </span>
      </button>

      {isExpanded && (
        <div className="border-t border-neutral-100">
          {section.subSections.map((subSection, subSectionIndex) => (
            <div key={subSectionIndex} className="border-b border-neutral-50 last:border-b-0">
              <div className="px-4 py-2 bg-neutral-50 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2 text-xs text-neutral-600">
                  <span className="font-bold">{subSection.label}</span>
                  <span className="text-neutral-300">·</span>
                  <span>{subSection.compName}</span>
                  {subSection.wind && <span className="text-neutral-400">풍속 {subSection.wind}m/s</span>}
                </div>
                <span className="text-xs text-neutral-400">{subSection.totalAthletes}명</span>
              </div>

              <div className="hidden sm:block">
                <table className="w-full">
                  <tbody>
                    {subSection.results.map((result: SearchResultRow, resultIndex: number) => {
                      if (result.isSeparator) {
                        return (
                          <tr key={`sep-${resultIndex}`}>
                            <td colSpan={6} className="px-4 py-1 text-center text-xs text-neutral-300">
                              ··· {result.skipped}명 생략 ···
                            </td>
                          </tr>
                        );
                      }
                      const profileCardPath = getProfileCardPath(result.name);
                      return (
                        <tr key={resultIndex} className={`border-t border-neutral-50 ${result.isMatch ? 'bg-amber-50 ring-1 ring-inset ring-amber-200' : ''}`}>
                          <td className="px-4 py-2 text-center w-12">
                            <RankBadge rank={result.rank || 0} />
                          </td>
                          <td className={`px-4 py-2 text-sm ${result.isMatch ? 'font-bold text-amber-900' : 'text-neutral-900'}`}>
                            <div className="flex flex-wrap items-center gap-1.5">
                              <AthleteNameLink row={result} className="hover:text-primary-700 hover:underline" />
                              {result.isMatch && <span className="text-[10px] text-amber-600 font-normal">매칭</span>}
                              <ProvenanceBadge provenance={result.provenance || subSection.provenance} />
                            </div>
                          </td>
                          <td className="px-4 py-2 text-sm text-neutral-600">{result.affiliation}</td>
                          <td className="px-4 py-2 text-center text-sm font-mono font-bold text-neutral-900 w-24">{result.record}</td>
                          <td className="px-4 py-2 text-center w-10">
                            {result.isMatch && profileCardPath && (
                              <Link
                                to={profileCardPath}
                                aria-label={getProfileCardLabel(result.name)}
                                title="프로필 카드 만들기"
                                className="inline-flex items-center justify-center w-7 h-7 bg-primary-100 text-primary-600 rounded-lg hover:bg-primary-200 transition-colors"
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
                {subSection.results.map((result: SearchResultRow, resultIndex: number) => {
                  if (result.isSeparator) {
                    return (
                      <div key={`sep-${resultIndex}`} className="px-3 py-1 text-center text-xs text-neutral-300">
                        ··· {result.skipped}명 생략 ···
                      </div>
                    );
                  }
                  const profileCardPath = getProfileCardPath(result.name);
                  return (
                    <div
                      key={resultIndex}
                      className={`grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 px-3.5 py-3 ${
                        result.isMatch ? 'bg-amber-50 ring-1 ring-inset ring-amber-200' : ''
                      }`}
                    >
                      <div className="row-span-2 self-start pt-0.5">
                        <RankBadge rank={result.rank || 0} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex min-w-0 items-center gap-1.5">
                          <AthleteNameLink
                            row={result}
                            className={`truncate text-[15px] leading-tight hover:text-primary-700 hover:underline ${
                              result.isMatch ? 'font-bold text-amber-900' : 'font-bold text-neutral-950'
                            }`}
                          />
                          {result.isMatch && <span className="shrink-0 text-[10px] font-semibold text-amber-600">매칭</span>}
                        </div>
                        <div className="mt-0.5 truncate text-xs text-neutral-500">{result.affiliation}</div>
                      </div>
                      <span className="shrink-0 text-base font-mono font-black leading-tight tracking-tight text-neutral-950">
                        {result.record}
                      </span>
                      <div className="col-start-2 col-span-2 flex min-w-0 items-center justify-between gap-2">
                        <ProvenanceBadge provenance={result.provenance || subSection.provenance} />
                        {result.isMatch && profileCardPath && (
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
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
