import { useState, type FormEvent } from 'react';
import { submitApplication } from './api';

export default function App() {
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const TARGET_JOB_ID = "job_b3ab6e7fcb19"; // JOB_B3AB6E7FCB19
  const TARGET_POSITION = "Salesforce Developer";

  const availableSkills = [
    "Apex", "SOQL/SOSL", "Visualforce", "Lightning Web Components (LWC)",
    "Salesforce data modeling & schema design", "Git/Bitbucket repository management",
    "API integrations (REST/SOAP)", "Agile/Scrum experience", "Strong problem-solving and debugging"
  ];
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);

  const handleSkillToggle = (skill: string) => {
    setSelectedSkills(prev =>
      prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]
    );
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!file) return alert("Please upload your CV");

    if (!TARGET_JOB_ID) {
      return alert("Разработчик: Пожалуйста, пропиши TARGET_JOB_ID в коде App.tsx");
    }

    setIsSubmitting(true);
    setError(null);

    // Собираем данные формы
    const formData = new FormData(e.currentTarget);
    formData.append("file", file);

    // Прикрепляем наши жестко заданные скрытые поля
    formData.append("job_id", TARGET_JOB_ID);
    formData.append("position", TARGET_POSITION);
    formData.append("skills", selectedSkills.join(", "));

    try {
      await submitApplication(formData);
      setIsSuccess(true);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.detail || "Failed to submit application. Make sure the backend is running.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4">
        <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-sm border border-gray-100 text-center">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Application Received!</h2>
          <p className="text-gray-500">Thank you for applying to Bold Generic Solutions. Our HR team will review your profile shortly.</p>
          <button onClick={() => window.location.reload()} className="mt-6 text-sm text-indigo-600 font-bold">Submit another</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">

        <div className="w-full bg-gray-100">
          <img
            src="/banner.jpg"
            alt="Bold Generic Solutions"
            className="w-full h-auto object-cover max-h-80 sm:max-h-96 border-b border-gray-100"
          />
        </div>

        {/* --- WELCOME MESSAGE --- */}
        <div className="px-8 pt-8 pb-4 text-center">
          <h1 className="text-3xl font-extrabold text-gray-900 mb-3 tracking-tight">
            Join <span className="text-blue-600">Bold Generic Solutions</span>
          </h1>
          <p className="text-gray-600 leading-relaxed text-sm md:text-base max-w-lg mx-auto">
            We are looking for a talented and driven <strong className="text-gray-900 font-semibold">{TARGET_POSITION}</strong> to join our growing team. Please fill out the application below to share your experience with us.
          </p>
        </div>
        {/* ---------------------- */}

        <form onSubmit={handleSubmit} className="p-8 space-y-8">

          {error && (
            <div className="p-4 bg-red-50 text-red-700 text-sm font-bold rounded-xl border border-red-100">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">1. Full Name *</label>
              <input required name="name" type="text" className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-900 focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">2. Email *</label>
              <input required name="email" type="email" className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-900 focus:outline-none" />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">3. Phone Number</label>
              <input name="phone" type="tel" className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-900 focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">4. Salary Expectation</label>
              <input required name="salary_expectation" type="text" placeholder="e.g. $800 USD" className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-900 focus:outline-none" />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">5. Last Education</label>
              <input required name="education" type="text" className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-900 focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">6. Years of Experience</label>
              <input required name="experience_years" type="number" min="0" className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-900 focus:outline-none" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-3">7. Skills</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {availableSkills.map(skill => (
                <label key={skill} className="flex items-start gap-3 p-3 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors">
                  <input
                    type="checkbox"
                    className="mt-1 w-4 h-4 text-gray-900 rounded border-gray-300 focus:ring-gray-900"
                    checked={selectedSkills.includes(skill)}
                    onChange={() => handleSkillToggle(skill)}
                  />
                  <span className="text-sm text-gray-700">{skill}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">8. Motivation</label>
            <textarea name="motivation" rows={3} placeholder="Why do you want to join us?" className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-900 focus:outline-none resize-none"></textarea>
          </div>

          <div className="p-6 bg-blue-50/50 border border-blue-100 rounded-2xl">
            <label className="block text-sm font-semibold text-gray-900 mb-2">9. Upload your CV (PDF/DOCX) *</label>
            <input
              required
              type="file"
              accept=".pdf,.docx,.txt"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-4 bg-gray-900 hover:bg-gray-800 text-white font-bold rounded-xl transition-all disabled:opacity-50 flex justify-center items-center gap-2 text-lg"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Application'}
          </button>
        </form>
      </div>
    </div>
  );
}