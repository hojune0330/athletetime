#!/bin/bash

# AnonymousPostList.tsx
sed -i "s/post\.likes\([^_]\)/post.likes_count\1/g" src/components/post/AnonymousPostList.tsx
sed -i "s/post\.dislikes/post.dislikes_count/g" src/components/post/AnonymousPostList.tsx
sed -i "s/post\.imageUrl/post.images[0]?.cloudinary_url/g" src/components/post/AnonymousPostList.tsx
sed -i "s/post\.views/post.views_count/g" src/components/post/AnonymousPostList.tsx
sed -i "s/post\.category/post.category_name/g" src/components/post/AnonymousPostList.tsx
sed -i "s/post\.isNotice/post.is_notice/g" src/components/post/AnonymousPostList.tsx
sed -i "s/post\.date/post.created_at/g" src/components/post/AnonymousPostList.tsx

# PostListReal.tsx - fix .length on counts
sed -i "s/likes_count\.length/likes_count/g" src/components/post/PostListReal.tsx

# PostDetailPage.tsx - fix remaining issues
sed -i "s/userId:/anonymousId:/g" src/pages/PostDetailPage.tsx
sed -i "s/likes_count\.length/likes_count/g" src/pages/PostDetailPage.tsx

echo "All files fixed!"
