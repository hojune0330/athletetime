#!/bin/bash
# Add import
sed -i '4a import { getAnonymousId } from "../utils/anonymousUser"' src/pages/PostDetailPage.tsx

# Fix field names
sed -i "s/post\.category\>/post.category_name/g" src/pages/PostDetailPage.tsx
sed -i "s/post\.isNotice/post.is_notice/g" src/pages/PostDetailPage.tsx
sed -i "s/post\.date\>/post.created_at/g" src/pages/PostDetailPage.tsx
sed -i "s/post\.views\>/post.views_count/g" src/pages/PostDetailPage.tsx
sed -i "s/post\.likes\>/post.likes_count/g" src/pages/PostDetailPage.tsx
sed -i "s/post\.imageUrl/post.images[0]?.cloudinary_url/g" src/pages/PostDetailPage.tsx
sed -i "s/comment\.date\>/comment.created_at/g" src/pages/PostDetailPage.tsx
sed -i "s/post\.comments\>/post.comments || []/g" src/pages/PostDetailPage.tsx

# Fix userId to anonymousId
sed -i "s/userId: localStorage/anonymousId: getAnonymousId()/g" src/pages/PostDetailPage.tsx

echo "PostDetailPage fixed!"
