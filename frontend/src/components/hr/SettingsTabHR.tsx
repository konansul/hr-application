import { useState, useEffect } from 'react';
import { jobsApi } from '../../api';
import { useStore } from '../../store';
import { DICT, LANGUAGES } from '../../internationalization.ts';

export function SettingsTab() {
  const {
    globalJobId,
    globalJobTitle,
    globalJobDescription,
    globalJobStages,
    setGlobalJobStages,
    theme,
    setTheme,
    language,
    setLanguage
  } = useStore();

  const t = DICT[language as keyof typeof DICT]?.hrSettings || DICT.en.hrSettings;

  const [editedStages, setEditedStages] = useState<string[]>([]);
  const [newStage, setNewStage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setEditedStages(
      globalJobStages.length > 0
        ? globalJobStages
        : ["APPLIED", "SHORTLISTED", "INTERVIEW", "OFFER", "REJECTED"]
    );
  }, [globalJobStages]);

  const handleAddStage = (e: React.FormEvent) => {
    e.preventDefault();
    const formatted = newStage.trim().toUpperCase().replace(/\s+/g, '_');
    if (formatted && !editedStages.includes(formatted)) {
      setEditedStages([...editedStages, formatted]);
      setNewStage('');
    }
  };

  const handleRemoveStage = (stageToRemove: string) => {
    setEditedStages(editedStages.filter(s => s !== stageToRemove));
  };

  const moveStage = (index: number, direction: 'up' | 'down') => {
    const newStages = [...editedStages];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newStages.length) return;
    [newStages[index], newStages[targetIndex]] = [newStages[targetIndex], newStages[index]];
    setEditedStages(newStages);
  };

  const handleSaveSettings = async () => {
    if (!globalJobId) {
      alert(t.jobError);
      return;
    }
    setIsSaving(true);
    try {
      await jobsApi.update(globalJobId, {
        title: globalJobTitle,
        description: globalJobDescription,
        pipeline_stages: editedStages
      });
      setGlobalJobStages(editedStages);
      setMessage(t.success);
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="w-full max-w-none mx-auto space-y-8 animate-in fade-in duration-300 pb-20">

      {/* Header */}
      <div className="flex justify-between items-end border-b border-gray-100 dark:border-neutral-800 pb-4 transition-colors">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight mb-2">{t.title}</h2>
          <p className="text-sm text-gray-500 dark:text-neutral-400">{t.subtitle}</p>
        </div>
        <div className="flex items-center gap-4">
          {message && (
             <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-3 py-1.5 rounded-lg">
               {message}
             </span>
          )}
          <button
            onClick={handleSaveSettings}
            disabled={isSaving}
            className="px-5 py-2.5 bg-gray-900 dark:bg-white hover:bg-gray-800 dark:hover:bg-neutral-200 text-white dark:text-black rounded-xl text-sm font-bold shadow-sm transition-all disabled:bg-gray-400 dark:disabled:bg-neutral-800 active:scale-95"
          >
            {isSaving ? t.saving : t.saveBtn}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        {/* Left Column: App Preferences */}
        <div className="md:col-span-5 space-y-6">

          <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-3xl p-6 shadow-sm transition-colors">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <svg className="w-4 h-4 text-gray-400 dark:text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
              {t.appearance}
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setTheme('light')}
                className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${theme === 'light' ? 'border-gray-900 dark:border-neutral-500 bg-gray-50 dark:bg-neutral-800' : 'border-gray-100 dark:border-neutral-800 hover:border-gray-200 dark:hover:border-neutral-700 bg-white dark:bg-neutral-900'}`}
              >
                <div className="w-8 h-8 rounded-full bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 shadow-sm flex items-center justify-center">
                  <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                </div>
                <span className={`text-xs font-bold ${theme === 'light' ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-neutral-500'}`}>{t.light}</span>
              </button>
              <button
                onClick={() => setTheme('dark')}
                className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${theme === 'dark' ? 'border-gray-900 dark:border-white bg-gray-900 dark:bg-black' : 'border-gray-100 dark:border-neutral-800 hover:border-gray-200 dark:hover:border-neutral-700 bg-white dark:bg-neutral-900'}`}
              >
                <div className="w-8 h-8 rounded-full bg-gray-800 dark:bg-black border border-gray-700 dark:border-neutral-800 shadow-sm flex items-center justify-center">
                  <svg className="w-4 h-4 text-indigo-400 dark:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
                </div>
                <span className={`text-xs font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-500 dark:text-neutral-500'}`}>{t.dark}</span>
              </button>
            </div>
          </div>

          {/* Language selection */}
          <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-3xl p-6 shadow-sm transition-colors">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <svg className="w-4 h-4 text-gray-400 dark:text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" /></svg>
              {t.langRegion}
            </h3>
            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-neutral-400 mb-1.5 uppercase tracking-wider">{t.dispLang}</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full px-4 py-3 text-sm bg-gray-50 dark:bg-black text-gray-900 dark:text-white border border-gray-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-gray-900 dark:focus:ring-white outline-none transition-all cursor-pointer font-semibold"
              >
                {LANGUAGES.map(lang => (
                  <option key={lang.code} value={lang.code}>{lang.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Right Column: Pipeline Settings */}
        <div className="md:col-span-7 space-y-6">
          <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-3xl p-6 shadow-sm min-h-[450px] flex flex-col transition-colors">
            <div className="mb-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <svg className="w-5 h-5 text-gray-400 dark:text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                {t.pipelineTitle}
              </h3>
              <p className="text-sm text-gray-500 dark:text-neutral-400 mt-1">
                {t.pipelineDesc} <span className="font-bold text-gray-700 dark:text-white">{globalJobTitle || t.noJobSelected}</span>
              </p>
            </div>

            {!globalJobId ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-gray-50 dark:bg-neutral-800/30 rounded-2xl border border-dashed border-gray-200 dark:border-neutral-700 transition-colors">
                <p className="text-sm text-gray-500 dark:text-neutral-400 font-medium">{t.jobSelectWarning}</p>
              </div>
            ) : (
              <>
                <div className="flex-1 space-y-2 mb-6 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                  {editedStages.map((stage, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 bg-white dark:bg-black border border-gray-200 dark:border-neutral-800 rounded-xl group hover:border-gray-400 dark:hover:border-neutral-600 transition-all shadow-sm">
                      <span className="text-sm font-bold text-gray-400 dark:text-neutral-600 shrink-0 w-5 text-right select-none">{index + 1}.</span>
                      <span className="flex-1 text-sm font-bold text-gray-700 dark:text-white uppercase tracking-wider">{stage.replace(/_/g, ' ')}</span>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => moveStage(index, 'up')} disabled={index === 0} className="p-1.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 disabled:opacity-30"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg></button>
                        <button onClick={() => moveStage(index, 'down')} disabled={index === editedStages.length - 1} className="p-1.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 disabled:opacity-30"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg></button>
                        <button onClick={() => handleRemoveStage(stage)} className="p-1.5 text-gray-400 hover:text-red-500"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                      </div>
                    </div>
                  ))}
                  {editedStages.length === 0 && (
                    <p className="text-xs text-red-500 text-center py-4 font-bold">{t.mustHaveStage}</p>
                  )}
                </div>

                <form onSubmit={handleAddStage} className="mt-auto pt-4 border-t border-gray-100 dark:border-neutral-800 flex gap-3 transition-colors">
                  <input
                    type="text"
                    value={newStage}
                    onChange={(e) => setNewStage(e.target.value)}
                    placeholder={t.addStagePlaceholder}
                    className="flex-1 px-4 py-2.5 text-sm bg-gray-50 dark:bg-black text-gray-900 dark:text-white border border-gray-200 dark:border-neutral-800 rounded-xl focus:ring-2 focus:ring-gray-900 dark:focus:ring-white outline-none transition-all uppercase placeholder-gray-400 dark:placeholder-neutral-600 font-semibold"
                  />
                  <button type="submit" disabled={!newStage.trim()} className="px-5 py-2.5 bg-gray-100 dark:bg-neutral-800 text-gray-900 dark:text-white rounded-xl text-sm font-bold shadow-sm transition-all hover:bg-gray-200 dark:hover:bg-neutral-700 disabled:opacity-50">{t.addStageBtn}</button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}