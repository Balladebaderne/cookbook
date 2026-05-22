import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import App from '../App';

// Canvas kræver WebGL — erstat med en simpel wrapper i jsdom
vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children }) => <div data-testid="canvas-mock">{children}</div>,
  useFrame: vi.fn(),
}));

// Globe bruger useFrame/useTexture internt — mock hele komponenten
vi.mock('../components/Globe', () => ({
  default: () => null,
  COUNTRIES: [
    { id: 'italy',    name: 'Italien',  flag: '🇮🇹', lat: 42.5, lng: 12.5,   color: '#FF4D4D' },
    { id: 'france',   name: 'Frankrig', flag: '🇫🇷', lat: 46.6, lng: 2.2,    color: '#5B9BD5' },
    { id: 'denmark',  name: 'Danmark',  flag: '🇩🇰', lat: 55.7, lng: 9.5,    color: '#FF6B6B' },
    { id: 'japan',    name: 'Japan',    flag: '🇯🇵', lat: 36.2, lng: 138.2,  color: '#FF4D6A' },
    { id: 'india',    name: 'Indien',   flag: '🇮🇳', lat: 20.6, lng: 79.0,   color: '#FFB347' },
    { id: 'thailand', name: 'Thailand', flag: '🇹🇭', lat: 15.9, lng: 100.9,  color: '#47A0FF' },
    { id: 'morocco',  name: 'Marokko',  flag: '🇲🇦', lat: 31.8, lng: -7.1,   color: '#E85D5D' },
    { id: 'mexico',   name: 'Mexico',   flag: '🇲🇽', lat: 23.6, lng: -102.5, color: '#4DCB8A' },
  ],
}));

vi.mock('../components/CountryPanel', () => ({
  default: () => null,
}));

describe('App', () => {
  it('renderer uden at kaste fejl (smoke test)', () => {
    // Kaster en exception → testen fejler. Det er hele pointen med en smoke test.
    render(<App />);
  });

  it('viser Cookbook-logoet på landingssiden', () => {
    render(<App />);
    // LandingPage renderer <span className="landing-logo-title">Cookbook</span>
    expect(screen.getByText('Cookbook')).toBeInTheDocument();
  });

  it('viser subline "Verdenskøkkenet" på landingssiden', () => {
    render(<App />);
    expect(screen.getByText('Verdenskøkkenet')).toBeInTheDocument();
  });
});
