import { HashRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import { Gate } from "./components/ui";
import Overview from "./pages/Overview";
import DecisionDesk from "./pages/DecisionDesk";
import AccuracyLab from "./pages/AccuracyLab";
import Methodology from "./pages/Methodology";

export default function App() {
  return (
    <HashRouter>
      <Layout>
        <Gate>
          <Routes>
            <Route path="/" element={<Overview />} />
            <Route path="/decision-desk" element={<DecisionDesk />} />
            <Route path="/accuracy-lab" element={<AccuracyLab />} />
            <Route path="/methodology" element={<Methodology />} />
            <Route path="*" element={<Overview />} />
          </Routes>
        </Gate>
      </Layout>
    </HashRouter>
  );
}
