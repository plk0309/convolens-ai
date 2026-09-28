import { Link, Route, Routes } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import MeetingPage from "./pages/MeetingPage";

export default function App() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-neutral-800">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link to="/" className="text-lg font-semibold tracking-tight">
            Convo<span className="text-sky-400">Lens</span>-ai
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-8">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/meetings/:id" element={<MeetingPage />} />
          <Route path="*" element={<p className="text-neutral-400">Page not found.</p>} />
        </Routes>
      </main>
    </div>
  );
}