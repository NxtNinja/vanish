import { ImageResponse } from '@vercel/og';

export const runtime = 'edge';

export const alt = 'Vanish - Secure Ephemeral Chat';
export const size = {
  width: 1200,
  height: 630,
};

export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#030303',
          position: 'relative',
        }}
      >
        {/* Status indicator */}
        <div
          style={{
            position: 'absolute',
            top: 40,
            left: 40,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            fontSize: 14,
            fontWeight: 700,
            letterSpacing: '0.2em',
            color: '#22c55e',
          }}
        >
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              backgroundColor: '#22c55e',
            }}
          />
          SYSTEM STATUS: SECURE
        </div>

        {/* Main content */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 20,
          }}
        >
          {/* Main heading */}
          <div
            style={{
              fontSize: 120,
              fontWeight: 900,
              letterSpacing: '-0.05em',
              color: '#ffffff',
              lineHeight: 0.9,
              textAlign: 'center',
            }}
          >
            MESSAGES
          </div>
          <div
            style={{
              fontSize: 120,
              fontWeight: 900,
              letterSpacing: '-0.05em',
              background: 'linear-gradient(to bottom, #ffffff, #737373)',
              backgroundClip: 'text',
              color: 'transparent',
              lineHeight: 0.9,
              textAlign: 'center',
            }}
          >
            THAT VANISH
          </div>

          {/* Subtitle */}
          <div
            style={{
              fontSize: 24,
              color: '#71717a',
              marginTop: 30,
              letterSpacing: '0.02em',
            }}
          >
            End-to-end encrypted • Zero logs • Self-destructing
          </div>
        </div>

        {/* Bottom accent */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 4,
            backgroundColor: '#22c55e',
          }}
        />
      </div>
    ),
    {
      ...size,
    }
  );
}
