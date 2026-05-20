import { useState, useEffect } from 'react';
import { authApi } from '../../../api';
import { useStore } from '../../../store';
import { LANGUAGES, DICT } from '../../../internationalization.ts';

export function CandidateSettingsTab() {
  const { theme, setTheme, language, setLanguage, logoutStore } = useStore();

  const t = DICT[language as keyof typeof DICT]?.settings || DICT.en.settings;

  const [visibility, setVisibility] = useState<'public' | 'private' | null>(null);
  const [publicSlug, setPublicSlug] = useState<string | null>(null);
  // const [emailToShare, setEmailToShare] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    const loadSettings = async () => {
      setIsLoading(true);
      try {
        const profile = await authApi.getProfile();
        if (profile) {
          setVisibility(profile.visibility_level === 'private' ? 'private' : 'public');
          setPublicSlug(profile.public_url_slug || null);
        }
      } catch (err) {
        console.error("Failed to load settings", err);
        setVisibility('public');
      } finally {
        setIsLoading(false);
      }
    };
    loadSettings();
  }, []);

  const handleSaveSettings = async () => {
    if (!visibility) return;
    setIsSaving(true);
    setMessage(null);
    try {
      await authApi.updatePrivacy({ visibility_level: visibility, public_url_slug: publicSlug });
      setMessage(t.successSave || "Settings saved successfully!");
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      console.error("Save failed", err);
      alert("Failed to save privacy settings");
    } finally {
      setIsSaving(false);
    }
  };

  // Автоматически генерируем, делаем публичным и сохраняем
  const generatePublicLink = async () => {
    const randomId = Math.random().toString(36).substring(2, 10);
    const newSlug = `cand-${randomId}`;
    setPublicSlug(newSlug);
    setVisibility('public');

    setIsSaving(true);
    try {
      await authApi.updatePrivacy({ visibility_level: 'public', public_url_slug: newSlug });
      setMessage((t as any).linkCreated ?? "Link created and saved!");
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      console.error("Failed to save generated link", err);
    } finally {
      setIsSaving(false);
    }
  };

  // Автоматически удаляем ссылку и закрываем профиль
  const removePublicLink = async () => {
    setPublicSlug(null);
    setVisibility('private');

    setIsSaving(true);
    try {
      await authApi.updatePrivacy({ visibility_level: 'private', public_url_slug: null });
      setMessage((t as any).linkDisabled ?? "Link disabled and profile is private");
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      console.error("Failed to remove link", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await authApi.deleteAccount();
      localStorage.clear();
      sessionStorage.clear();
      logoutStore();
      window.location.href = '/';
    } catch {
      setDeleteError((t as any).deleteAccount?.error ?? 'Deletion failed. Please try again or contact support.');
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-gray-200 dark:border-neutral-800 border-t-gray-900 dark:border-t-white rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-none mx-auto space-y-8 animate-in fade-in duration-300 pb-20 relative">

      <div className="flex justify-between items-end border-b border-gray-100 dark:border-neutral-800 pb-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight mb-2">{t.title}</h2>
          <p className="text-sm text-gray-500 dark:text-neutral-400">{t.desc}</p>
        </div>
        <div className="flex items-center gap-4">
          {message && (
             <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-4 py-2 rounded-xl border border-emerald-100 dark:border-emerald-900/50 animate-in slide-in-from-right-4">
               {message}
             </span>
          )}
          <button
            onClick={handleSaveSettings}
            disabled={isSaving}
            className="px-5 py-2.5 bg-gray-900 dark:bg-white hover:bg-gray-800 dark:hover:bg-neutral-200 text-white dark:text-black rounded-xl text-sm font-bold shadow-sm transition-all disabled:bg-gray-400 dark:disabled:bg-neutral-700 active:scale-95"
          >
            {isSaving ? (t.saving || 'Saving...') : (t.save || 'Save')}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">

        <div className="md:col-span-5 space-y-6">
          <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-3xl p-6 shadow-sm transition-colors">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <svg className="w-4 h-4 text-gray-400 dark:text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
              {t.appearance}
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setTheme('light')}
                className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${theme === 'light' ? 'border-gray-900 dark:border-neutral-500 bg-gray-50 dark:bg-neutral-800' : 'border-gray-100 dark:border-neutral-800 hover:border-gray-200 dark:hover:border-neutral-700 bg-white dark:bg-neutral-900'}`}
              >
                <div className="w-8 h-8 rounded-full bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 shadow-sm flex items-center justify-center">
                  <svg className="w-4 h-4 text-amber-500 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <span className={`text-xs font-bold ${theme === 'light' ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-neutral-500'}`}>{t.light}</span>
              </button>

              <button
                onClick={() => setTheme('dark')}
                className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${theme === 'dark' ? 'border-gray-900 dark:border-white bg-gray-900 dark:bg-black' : 'border-gray-100 dark:border-neutral-800 hover:border-gray-200 dark:hover:border-neutral-700 bg-white dark:bg-neutral-900'}`}
              >
                <div className="w-8 h-8 rounded-full bg-gray-800 dark:bg-black border border-gray-700 dark:border-neutral-800 shadow-sm flex items-center justify-center">
                  <svg className="w-4 h-4 text-indigo-400 dark:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                </div>
                <span className={`text-xs font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-500 dark:text-neutral-500'}`}>{t.dark}</span>
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-3xl p-6 shadow-sm transition-colors">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <svg className="w-4 h-4 text-gray-400 dark:text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
              </svg>
              {t.lang}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-neutral-400 mb-1.5 uppercase tracking-wider">{t.dispLang}</label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full px-4 py-3 text-sm bg-gray-50 dark:bg-neutral-800 text-gray-900 dark:text-white border border-gray-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-gray-900 dark:focus:ring-white outline-none transition-all cursor-pointer font-semibold"
                >
                  {LANGUAGES.map(lang => (
                    <option key={lang.code} value={lang.code}>{lang.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Delete account */}
          <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-3xl p-6 shadow-sm transition-colors">
            <p className="text-xs text-gray-500 dark:text-neutral-400 mb-4">
              {(t as any).deleteAccount?.desc ?? "Permanently delete your account, profile, and all CV files. This action cannot be undone."}
            </p>
            <button
              onClick={() => { setShowDeleteModal(true); setDeleteConfirmText(''); setDeleteError(null); }}
              className="w-full px-5 py-2.5 bg-gray-900 dark:bg-white hover:bg-gray-700 dark:hover:bg-neutral-200 text-white dark:text-black text-sm font-bold rounded-xl transition-all shadow-sm"
            >
              {(t as any).deleteAccount?.btn ?? "Delete Account"}
            </button>
          </div>
        </div>

        <div className="md:col-span-7 space-y-6">
          <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-3xl p-6 shadow-sm min-h-[500px] flex flex-col gap-8 transition-colors">
            <section>
              <div className="mb-4">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                   <svg className="w-5 h-5 text-gray-400 dark:text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                   {t.visibility}
                </h3>
                <p className="text-xs text-gray-500 dark:text-neutral-400">{t.visDesc}</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={() => setVisibility('public')}
                  className={`p-5 rounded-2xl border-2 text-left transition-all ${visibility === 'public' ? 'border-gray-900 dark:border-white bg-gray-50 dark:bg-neutral-800' : 'border-gray-100 dark:border-neutral-800 hover:border-gray-200 dark:hover:border-neutral-700'}`}
                >
                  <h4 className="font-bold text-sm text-gray-900 dark:text-white mb-1">{t.public}</h4>
                  <p className="text-[11px] text-gray-500 dark:text-neutral-500 leading-relaxed">{t.publicDesc}</p>
                </button>
                <button
                  onClick={() => setVisibility('private')}
                  className={`p-5 rounded-2xl border-2 text-left transition-all ${visibility === 'private' ? 'border-gray-900 dark:border-white bg-gray-50 dark:bg-neutral-800' : 'border-gray-100 dark:border-neutral-800 hover:border-gray-200 dark:hover:border-neutral-700'}`}
                >
                  <h4 className="font-bold text-sm text-gray-900 dark:text-white mb-1">{t.private}</h4>
                  <p className="text-[11px] text-gray-500 dark:text-neutral-500 leading-relaxed">{t.privateDesc}</p>
                </button>
              </div>
            </section>

            <section className="pt-6 border-t border-gray-100 dark:border-neutral-800">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                 <svg className="w-5 h-5 text-gray-400 dark:text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                 {t.share}
              </h3>
              {publicSlug ? (
                <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-neutral-800/50 border border-gray-200 dark:border-neutral-700 rounded-2xl">
                  {/* Заменили хардкод на динамический origin */}
                  <div className="flex-1 px-3 py-1 font-mono text-xs text-indigo-600 dark:text-white truncate">
                    {window.location.origin}/p/{publicSlug}
                  </div>
                  <button onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/p/${publicSlug}`);
                    setMessage(t.copied || 'Copied!');
                    setTimeout(() => setMessage(null), 2000);
                  }} className="px-4 py-2 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 hover:border-gray-900 dark:hover:border-white text-gray-900 dark:text-white rounded-xl text-xs font-bold transition-all shadow-sm">
                    {t.copy}
                  </button>
                  <button onClick={removePublicLink} className="p-2 text-red-400 dark:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              ) : (
                <button onClick={generatePublicLink} disabled={isSaving} className="w-full py-4 border-2 border-dashed border-gray-200 dark:border-neutral-800 rounded-2xl text-xs font-bold text-gray-400 dark:text-neutral-500 hover:text-gray-900 dark:hover:text-white transition-all bg-gray-50/30 dark:bg-neutral-800/30 disabled:opacity-50">
                  {isSaving ? "Generating..." : t.createLink}
                </button>
              )}
            </section>

            <section className="pt-6 border-t border-gray-100 dark:border-neutral-800 mt-auto">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
                 <svg className="w-5 h-5 text-gray-400 dark:text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                 {t.sendTo}
              </h3>
              <p className="text-xs text-gray-500 dark:text-neutral-400 mb-4">{t.sendToDesc}</p>
              <div className="relative group cursor-not-allowed">
                <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-10 px-3 py-1.5 bg-gray-800 dark:bg-neutral-700 text-white text-[11px] font-medium rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                  Coming soon
                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800 dark:border-t-neutral-700" />
                </div>
                <div className="flex gap-2 opacity-50 pointer-events-none select-none">
                  <input type="email" placeholder={t.emailPlaceholder} className="flex-1 px-4 py-2.5 text-sm bg-gray-50 dark:bg-neutral-800 text-gray-900 dark:text-white border border-gray-200 dark:border-neutral-700 rounded-xl font-medium placeholder-gray-400 dark:placeholder-neutral-500" readOnly />
                  <button disabled className="px-6 py-2.5 bg-gray-100 dark:bg-neutral-800 text-gray-900 dark:text-white rounded-xl text-xs font-bold border border-gray-200 dark:border-neutral-700">{t.send}</button>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>

      {/* Delete confirmation modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => !isDeleting && setShowDeleteModal(false)}>
          <div className="bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl border border-red-200 dark:border-red-900/50 w-full max-w-md p-8" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-5">
              <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{(t as any).deleteAccount?.modalTitle ?? "Delete your account?"}</h2>
            <p className="text-sm text-gray-500 dark:text-neutral-400 mb-6 leading-relaxed">
              {(t as any).deleteAccount?.modalDesc ?? "This will permanently remove your email, profile data, and all CV files from our systems. There is no way to recover this data."}
            </p>
            <div className="mb-5">
              <label className="block text-xs font-bold text-gray-500 dark:text-neutral-400 uppercase tracking-widest mb-2">
                {(t as any).deleteAccount?.typeLabel ?? "Type"} <span className="text-red-600 dark:text-red-400 font-mono">{(t as any).deleteAccount?.keyword ?? "DELETE"}</span> {(t as any).deleteAccount?.typeSuffix ?? "to confirm"}
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={e => setDeleteConfirmText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleDeleteAccount()}
                placeholder="DELETE"
                autoFocus
                className="w-full px-4 py-3 text-sm border border-gray-200 dark:border-neutral-700 rounded-xl bg-gray-50 dark:bg-neutral-800 text-gray-900 dark:text-white placeholder-gray-300 dark:placeholder-neutral-600 focus:outline-none focus:border-red-400 dark:focus:border-red-600 font-mono transition-colors"
              />
            </div>
            {deleteError && (
              <p className="text-xs text-red-500 mb-4">{deleteError}</p>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeleting}
                className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-neutral-700 text-gray-600 dark:text-neutral-300 hover:bg-gray-50 dark:hover:bg-neutral-800 text-sm font-semibold rounded-xl transition-all disabled:opacity-50"
              >
                {(t as any).deleteAccount?.cancelBtn ?? 'Cancel'}
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteConfirmText !== 'DELETE' || isDeleting}
                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-red-300 dark:disabled:bg-red-900 text-white text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2"
              >
                {isDeleting && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                {isDeleting ? ((t as any).deleteAccount?.deleting ?? 'Deleting…') : ((t as any).deleteAccount?.confirmBtn ?? 'Delete my account')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
