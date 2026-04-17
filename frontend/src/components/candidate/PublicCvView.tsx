import { useEffect, useState } from 'react';
import { resumesApi } from '../../api';

export function PublicCvView({ token }: { token: string }) {
  const [cv, setCv] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    resumesApi.getPublicResume(token)
      .then(setCv)
      .catch(() => setError('This CV link is invalid or has been revoked.'));
  }, [token]);

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto">
            <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-gray-700">{error}</p>
        </div>
      </div>
    );
  }

  if (!cv) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-gray-200 border-t-gray-900 rounded-full animate-spin" />
      </div>
    );
  }

  const d = cv.resume_data ?? {};
  const info = d.personal_info ?? {};
  const experience: any[] = d.experience ?? [];
  const education: any[] = d.education ?? [];
  const skills: any[] = d.skills ?? [];
  const languages: any[] = d.languages ?? [];
  const certifications: any[] = d.certifications ?? [];

  const skillName = (s: any) => typeof s === 'string' ? s : s.name || '';
  const langName  = (l: any) => typeof l === 'string' ? l : l.name || l.language || '';
  const certName  = (c: any) => typeof c === 'string' ? c : c.name || c.title || '';

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-3xl mx-auto space-y-8">

        <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-8">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {info.first_name || ''} {info.last_name || ''}
              </h1>
              {cv.title && <p className="text-sm text-gray-500 mt-1">{cv.title}</p>}
              <div className="flex flex-wrap gap-4 mt-3 text-sm text-gray-500">
                {info.email    && <span>{info.email}</span>}
                {info.phone    && <span>{info.phone}</span>}
                {info.city     && <span>{info.city}{info.country ? `, ${info.country}` : ''}</span>}
                {info.linkedin_url  && <a href={info.linkedin_url}  target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">LinkedIn</a>}
                {info.github_url    && <a href={info.github_url}    target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">GitHub</a>}
                {info.portfolio_url && <a href={info.portfolio_url} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">Portfolio</a>}
              </div>
            </div>
            <span className="text-xs font-semibold px-3 py-1.5 bg-gray-100 rounded-full text-gray-500 uppercase tracking-widest">
              {cv.language?.toUpperCase()}
            </span>
          </div>
          {info.summary && (
            <p className="mt-5 text-sm text-gray-700 leading-relaxed border-t border-gray-100 pt-5">{info.summary}</p>
          )}
        </div>

        {experience.length > 0 && (
          <section className="bg-white rounded-3xl shadow-sm border border-gray-200 p-8">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-5">Experience</h2>
            <div className="space-y-6">
              {experience.map((exp: any, i: number) => (
                <div key={i}>
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                      <p className="text-sm font-bold text-gray-900">{exp.title || 'Role'}</p>
                      <p className="text-sm text-gray-500">{exp.company || ''}</p>
                    </div>
                    <p className="text-xs text-gray-400 whitespace-nowrap">{exp.start_date || '—'} — {exp.end_date || 'Present'}</p>
                  </div>
                  {exp.description && <p className="mt-2 text-sm text-gray-700 leading-relaxed">{exp.description}</p>}
                  {i < experience.length - 1 && <div className="mt-5 border-t border-gray-100" />}
                </div>
              ))}
            </div>
          </section>
        )}

        {skills.length > 0 && (
          <section className="bg-white rounded-3xl shadow-sm border border-gray-200 p-8">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Skills</h2>
            <div className="flex flex-wrap gap-2">
              {skills.map((s: any, i: number) => (
                <span key={i} className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold text-gray-900">
                  {skillName(s)}
                </span>
              ))}
            </div>
          </section>
        )}

        {education.length > 0 && (
          <section className="bg-white rounded-3xl shadow-sm border border-gray-200 p-8">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-5">Education</h2>
            <div className="space-y-4">
              {education.map((edu: any, i: number) => (
                <div key={i}>
                  <p className="text-sm font-bold text-gray-900">{edu.degree || 'Degree'}</p>
                  <p className="text-sm text-gray-500">{edu.institution || ''}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {(languages.length > 0 || certifications.length > 0) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {languages.length > 0 && (
              <section className="bg-white rounded-3xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Languages</h2>
                <p className="text-sm text-gray-700">{languages.map(langName).filter(Boolean).join(', ')}</p>
              </section>
            )}
            {certifications.length > 0 && (
              <section className="bg-white rounded-3xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Certifications</h2>
                <p className="text-sm text-gray-700">{certifications.map(certName).filter(Boolean).join(', ')}</p>
              </section>
            )}
          </div>
        )}

        <p className="text-center text-xs text-gray-300 pb-6">Shared via HRAI · View only</p>
      </div>
    </div>
  );
}
