/** @type {import('tailwindcss').Config} */
export default {
    darkMode: ["class"],
    content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./app/**/*.{js,ts,jsx,tsx}",
    "./*.{js,ts,jsx,tsx}",
  ],
  theme: {
  	extend: {
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		// Enhanced animation configuration
  		animation: {
  			'fade-in': 'fadeIn 0.5s ease-out forwards',
  			'fade-out': 'fadeOut 0.3s ease-in forwards',
  			'slide-up': 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
  			'slide-down': 'slideDown 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
  			'slide-left': 'slideLeft 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
  			'slide-right': 'slideRight 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
  			'scale-in': 'scaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
  			'scale-out': 'scaleOut 0.2s ease-in forwards',
  			'bounce-in': 'bounceIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
  			'pulse-slow': 'pulseSlow 4s ease-in-out infinite',
  			'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
  			'spin-slow': 'spin 3s linear infinite',
  			'wiggle': 'wiggle 0.5s ease-in-out',
  			'float': 'float 3s ease-in-out infinite',
  		},
  		keyframes: {
  			fadeIn: {
  				'0%': { opacity: '0' },
  				'100%': { opacity: '1' },
  			},
  			fadeOut: {
  				'0%': { opacity: '1' },
  				'100%': { opacity: '0' },
  			},
  			slideUp: {
  				'0%': { opacity: '0', transform: 'translateY(20px)' },
  				'100%': { opacity: '1', transform: 'translateY(0)' },
  			},
  			slideDown: {
  				'0%': { opacity: '0', transform: 'translateY(-20px)' },
  				'100%': { opacity: '1', transform: 'translateY(0)' },
  			},
  			slideLeft: {
  				'0%': { opacity: '0', transform: 'translateX(20px)' },
  				'100%': { opacity: '1', transform: 'translateX(0)' },
  			},
  			slideRight: {
  				'0%': { opacity: '0', transform: 'translateX(-20px)' },
  				'100%': { opacity: '1', transform: 'translateX(0)' },
  			},
  			scaleIn: {
  				'0%': { opacity: '0', transform: 'scale(0.9)' },
  				'100%': { opacity: '1', transform: 'scale(1)' },
  			},
  			scaleOut: {
  				'0%': { opacity: '1', transform: 'scale(1)' },
  				'100%': { opacity: '0', transform: 'scale(0.9)' },
  			},
  			bounceIn: {
  				'0%': { opacity: '0', transform: 'scale(0.3)' },
  				'50%': { opacity: '1', transform: 'scale(1.05)' },
  				'70%': { transform: 'scale(0.9)' },
  				'100%': { transform: 'scale(1)' },
  			},
  			pulseSlow: {
  				'0%, 100%': { opacity: '0.15', transform: 'scale(1)' },
  				'50%': { opacity: '0.25', transform: 'scale(1.05)' },
  			},
  			pulseGlow: {
  				'0%, 100%': { boxShadow: '0 0 10px rgba(157, 78, 221, 0.3)' },
  				'50%': { boxShadow: '0 0 25px rgba(157, 78, 221, 0.6)' },
  			},
  			wiggle: {
  				'0%, 100%': { transform: 'rotate(-3deg)' },
  				'50%': { transform: 'rotate(3deg)' },
  			},
  			float: {
  				'0%, 100%': { transform: 'translateY(0)' },
  				'50%': { transform: 'translateY(-10px)' },
  			},
  		},
  		transitionTimingFunction: {
  			'bounce': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  			'smooth': 'cubic-bezier(0.16, 1, 0.3, 1)',
  			'elastic': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  		},
  		transitionDuration: {
  			'400': '400ms',
  			'600': '600ms',
  		},
  		colors: {
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			}
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
}
