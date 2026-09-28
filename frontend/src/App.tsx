import { Link, Route, Routes } from "react-router-dom";
import LogoMark from "./components/LogoMark";
import Dashboard from "./pages/Dashboard";
import MeetingPage from "./pages/MeetingPage";

export default function App() {
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center px-6 py-5">
        <Link to="/" className="flex items-center gap-2.5 text-ink">
          <LogoMark />
          <span className="text-lg font-semibold tracking-tight">ConvoLens-ai</span>
        </Link>
      </header>

      <main className="mx-auto max-w-6xl px-6 pb-24 pt-2">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/meetings/:id" element={<MeetingPage />} />
          <Route
            path="*"
            element={
              <p className="text-mute">
                That page doesn't exist. <Link to="/" className="text-cobalt underline">Go to your meetings</Link>.
              </p>
            }
          />
        </Routes>
      </main>
    </div>
  );
}