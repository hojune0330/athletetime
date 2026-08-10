import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { RecordSearchForm } from './RecordSearchForm';

describe('record search form', () => {
  it('Given a pending public-record search When it renders Then the request state is announced and repeat submit is unavailable', () => {
    const html = renderToStaticMarkup(
      <RecordSearchForm
        query="김육상"
        loading
        teamSearch={false}
        onQueryChange={() => undefined}
        onSubmit={() => undefined}
      />,
    );

    expect(html).toContain('aria-busy="true"');
    expect(html).toContain('disabled=""');
    expect(html).toContain('검색 중이에요. 잠시만 기다려 주세요.');
    expect(html).toContain('role="status"');
  });

  it('Given a team lookup When it renders Then it asks for the one supported input', () => {
    const html = renderToStaticMarkup(
      <RecordSearchForm
        query="진도"
        loading={false}
        teamSearch
        onQueryChange={() => undefined}
        onSubmit={() => undefined}
      />,
    );

    expect(html).toContain('찾을 소속을 입력하세요');
    expect(html).toContain('학교나 팀 이름을 두 글자 이상 입력해 주세요.');
  });
});
