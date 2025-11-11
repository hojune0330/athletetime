#!/bin/bash
# Quick fix for field name changes

# PostDetailPage.tsx
sed -i "s/post\.category/post.category_name/g" src/pages/PostDetailPage.tsx
sed -i "s/post\.isNotice/post.is_notice/g" src/pages/PostDetailPage.tsx
sed -i "s/post\.date/post.created_at/g" src/pages/PostDetailPage.tsx
sed -i "s/post\.views/post.views_count/g" src/pages/PostDetailPage.tsx
sed -i "s/post\.likes/post.likes_count/g" src/pages/PostDetailPage.tsx
sed -i "s/post\.imageUrl/post.images[0]?.cloudinary_url/g" src/pages/PostDetailPage.tsx
sed -i "s/comment\.date/comment.created_at/g" src/pages/PostDetailPage.tsx
sed -i "s/userId:/anonymousId:/g" src/pages/PostDetailPage.tsx

# HomePage.tsx - add anonymousId
sed -i "s/const createPostMutation/import { getAnonymousId } from '..\/utils\/anonymousUser';\n\nconst createPostMutation/g" src/pages/HomePage.tsx

echo "Field names fixed!"
