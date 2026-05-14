/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#FAFAF8',
        surface: '#FFFFFF',
        surfaceAlt: '#F4F3F0',
        hover: '#F0EFEC',
        border: '#E4E2DD',
        borderHover: '#D0CDC6',
        ink: '#1A1A1A',
        inkBody: '#3D3D3D',
        inkDim: '#6B6B6B',
        inkFaint: '#9B9B9B',
        forti: '#EE3124',
        fortiDim: 'rgba(238,49,36,0.06)',
        fortiBorder: 'rgba(238,49,36,0.22)',
        fortiSoft: 'rgba(238,49,36,0.12)',
        green: '#16A34A',
        greenDim: 'rgba(22,163,74,0.06)',
        greenBorder: 'rgba(22,163,74,0.22)',
        amber: '#B45309',
        amberDim: 'rgba(180,83,9,0.06)',
        amberBorder: 'rgba(180,83,9,0.22)',
        rose: '#DC2626',
        roseDim: 'rgba(220,38,38,0.06)',
        roseBorder: 'rgba(220,38,38,0.22)',
        info: '#2563EB',
        infoDim: 'rgba(37,99,235,0.06)',
        infoBorder: 'rgba(37,99,235,0.22)',
      },
      fontFamily: {
        sans: ["'DM Sans'", "'Helvetica Neue'", 'sans-serif'],
        mono: ["'DM Mono'", "'Menlo'", 'monospace'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(0,0,0,0.03)',
        cardHover: '0 2px 12px rgba(0,0,0,0.06)',
        panel: '-12px 0 40px rgba(0,0,0,0.08)',
      },
      keyframes: {
        slideIn: {
          from: { transform: 'translateX(100%)' },
          to: { transform: 'translateX(0)' },
        },
        fadeIn: {
          from: { opacity: 0 },
          to: { opacity: 1 },
        },
      },
      animation: {
        slideIn: 'slideIn 0.22s ease-out',
        fadeIn: 'fadeIn 0.18s ease-out',
      },
    },
  },
  plugins: [],
};
