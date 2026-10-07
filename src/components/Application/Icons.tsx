import React from 'react';

export const LoaderIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" className="wholesale-loader-icon">
    <circle
      cx="8"
      cy="8"
      r="6"
      stroke="currentColor"
      strokeWidth="2"
      fill="none"
      strokeDasharray="18.84"
      strokeLinecap="round"
    >
      <animateTransform
        attributeName="transform"
        type="rotate"
        from="0 8 8"
        to="360 8 8"
        dur="1s"
        repeatCount="indefinite"
      />
    </circle>
  </svg>
);

export const DotsIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
    <path d="M3 9.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zM8 9.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zM13 9.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z"/>
  </svg>
);

export const EyeIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
    <path d="M8 2C4.5 2 1.5 4.5 0 8c1.5 3.5 4.5 6 8 6s6.5-2.5 8-6c-1.5-3.5-4.5-6-8-6zM8 12c-2.2 0-4-1.8-4-4s1.8-4 4-4 4 1.8 4 4-1.8 4-4 4z"/>
    <circle cx="8" cy="8" r="2"/>
  </svg>
);

export const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
    <path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z"/>
  </svg>
);

export const XIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
    <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
  </svg>
);

export const UndoIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
    <path d="M1.5 8a6.5 6.5 0 1 1 13 0A.5.5 0 0 1 14 8a6 6 0 1 0-6 6 .5.5 0 0 1 0 1A6.5 6.5 0 0 1 1.5 8z"/>
    <path d="M7.646 11.854a.5.5 0 0 1 0-.708L10.293 8.5H2.5a.5.5 0 0 1 0-1h7.793L7.646 4.854a.5.5 0 1 1 .708-.708l3.5 3.5a.5.5 0 0 1 0 .708l-3.5 3.5a.5.5 0 0 1-.708 0z"/>
  </svg>
);