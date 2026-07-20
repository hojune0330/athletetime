import { useQuery } from '@tanstack/react-query';
import { getMagazineIssueByPostId } from '../../api/editorialPublic';

export function useMagazinePostContext(postId: number | null) {
  return useQuery({
    queryKey: ['editorial', 'magazine', 'by-post', postId],
    queryFn: () => getMagazineIssueByPostId(postId ?? 0),
    enabled: postId !== null,
    staleTime: 0,
    retry: 1,
  });
}
