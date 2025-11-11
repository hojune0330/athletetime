#!/bin/bash
sed -i "s/post\.category/post.category_name/g" src/components/post/PostListReal.tsx
sed -i "s/post\.likes/post.likes_count/g" src/components/post/PostListReal.tsx
sed -i "s/post\.views/post.views_count/g" src/components/post/PostListReal.tsx
sed -i "s/post\.date/post.created_at/g" src/components/post/PostListReal.tsx
sed -i "s/post\.imageUrl/post.images[0]?.cloudinary_url/g" src/components/post/PostListReal.tsx
sed -i "s/post\.isNotice/post.is_notice/g" src/components/post/PostListReal.tsx
sed -i "s/post\.comments\\.length/post.comments_count/g" src/components/post/PostListReal.tsx
echo "PostListReal fixed!"
