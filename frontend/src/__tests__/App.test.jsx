import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";
import App from "../App";

// Canvas requires WebGL — replace it with a simple wrapper in jsdom
vi.mock("@react-three/fiber", () => ({
  Canvas: ({ children }) => <div data-testid="canvas-mock">{children}</div>,
  useFrame: vi.fn(),
}));

// Globe uses useFrame/useTexture internally — mock the whole component
vi.mock("../components/Globe", () => ({
  default: () => null,
  COUNTRIES: [
    { id: "italy",    name: "Italy",    flag: "🇮🇹", lat: 42.5, lng: 12.5,   color: "#FF4D4D" },
    { id: "france",   name: "France",   flag: "🇫🇷", lat: 46.6, lng: 2.2,    color: "#5B9BD5" },
    { id: "denmark",  name: "Denmark",  flag: "🇩🇰", lat: 55.7, lng: 9.5,    color: "#FF6B6B" },
    { id: "japan",    name: "Japan",    flag: "🇯🇵", lat: 36.2, lng: 138.2,  color: "#FF4D6A" },
    { id: "india",    name: "India",    flag: "🇮🇳", lat: 20.6, lng: 79.0,   color: "#FFB347" },
    { id: "thailand", name: "Thailand", flag: "🇹🇭", lat: 15.9, lng: 100.9,  color: "#47A0FF" },
    { id: "morocco",  name: "Morocco",  flag: "🇲🇦", lat: 31.8, lng: -7.1,   color: "#E85D5D" },
    { id: "mexico",   name: "Mexico",   flag: "🇲🇽", lat: 23.6, lng: -102.5, color: "#4DCB8A" },
  ],
}));

vi.mock("../components/CountryPanel", () => ({
  default: () => null,
}));

describe("App", () => {
  it("renders without throwing (smoke test)", () => {
    // Throwing an exception → the test fails. That's the whole point of a smoke test.
    render(<App />);
  });

  it("shows the Cookbook logo on the landing page", () => {
    render(<App />);
    // LandingPage renders <span className="landing-logo-title">Cookbook</span>
    expect(screen.getByText("Cookbook")).toBeInTheDocument();
  });

  it("shows the \"World Cuisine\" subline on the landing page", () => {
    render(<App />);
    expect(screen.getByText("World Cuisine")).toBeInTheDocument();
  });
});

describe("DeploymentBadge", () => {
  // The badge reads a global injected by nginx at deploy time. Clean it up so
  // it never leaks into other tests.
  afterEach(() => {
    delete window.__COOKBOOK_DEPLOYMENT__;
  });

  it("renders no badge when no deployment info is injected", () => {
    render(<App />);
    expect(screen.queryByText(/^Backend:/)).not.toBeInTheDocument();
  });

  it("renders the active backend deployment badge (color normalised to upper-case)", () => {
    window.__COOKBOOK_DEPLOYMENT__ = { activeColor: "Green" };
    render(<App />);
    expect(screen.getByText(/^Backend:\s*GREEN$/)).toBeInTheDocument();
  });

  it("ignores an unknown active color", () => {
    window.__COOKBOOK_DEPLOYMENT__ = { activeColor: "purple" };
    render(<App />);
    expect(screen.queryByText(/^Backend:/)).not.toBeInTheDocument();
  });
});
