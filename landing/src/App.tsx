import { BrowserRouter, Routes, Route } from 'react-router-dom';

import { LandingPage } from './LandingPage';
import { PrivacyPolicyPage } from './PrivacyPolicy';
import { TermsOfServicePage } from './TermsOfService';
import { GuidePage } from "./GuidePage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />

        <Route path="/privacy" element={<PrivacyPolicyPage />} />
        <Route path="/terms" element={<TermsOfServicePage />} />
          <Route path="/guide" element={<GuidePage />} />
      </Routes>
    </BrowserRouter>
  );
}