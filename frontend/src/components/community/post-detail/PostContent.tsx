import type { PostImage } from '../../../types';

type PostContentProps = {
  readonly content: string;
  readonly images: readonly PostImage[];
};

export function PostContent({ content, images }: PostContentProps) {
  return (
    <div className="p-6">
      {images.length > 0 && (
        <div className="mb-6 space-y-4">
          {images.map((image, index) => (
            <img
              key={image.id ?? index}
              src={image.cloudinary_url}
              alt={`이미지 ${index + 1}`}
              className="w-full rounded-xl shadow-soft"
              loading="lazy"
            />
          ))}
        </div>
      )}

      <div className="prose prose-neutral max-w-none">
        <p className="text-neutral-700 leading-relaxed whitespace-pre-wrap">{content}</p>
      </div>
    </div>
  );
}
