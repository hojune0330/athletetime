import React from 'react';

interface MobileMenuButtonProps {
  onClick: () => void;
  isMenuOpen: boolean;
}

export const MobileMenuButton: React.FC<MobileMenuButtonProps> = ({
  onClick,
  isMenuOpen,
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className="
        fixed bottom-5 left-5 w-14 h-14
        bg-[#00ffa3] text-black rounded-full
        flex items-center justify-center text-xl
        z-[99] shadow-lg
        md:hidden
        transition-all hover:scale-105
      "
      aria-label={isMenuOpen ? '메뉴 닫기' : '메뉴 열기'}
    >
      <i className={`fas ${isMenuOpen ? 'fa-times' : 'fa-bars'}`} />
    </button>
  );
};
