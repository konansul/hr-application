import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { jobsApi, screeningApi, authApi, documentsApi, externalJobsApi } from '../../api';
import { useStore } from '../../store';
import { DICT } from '../../internationalization.ts';

interface LocationOption {
  value: string;
  label: string;
  keywords: string[];
  group: string;
}

const LOCATION_OPTIONS: LocationOption[] = [
  // Quick Picks
  { value: 'remote',  label: 'Remote / Work from Home', keywords: ['remote', 'wfh', 'work from home', 'anywhere'], group: 'Quick Picks' },
  { value: 'europe',  label: 'Europe (all countries)',  keywords: ['eu', 'europe', 'european', 'germany', 'france', 'netherlands', 'poland', 'spain', 'italy', 'sweden', 'finland', 'norway', 'denmark', 'austria', 'belgium', 'czech', 'portugal', 'hungary', 'romania', 'bulgaria', 'ukraine', 'switzerland', 'latvia', 'lithuania', 'estonia', 'croatia', 'greece', 'ireland', 'serbia', 'slovakia', 'slovenia'], group: 'Quick Picks' },
  { value: 'usa',     label: 'United States',           keywords: ['usa', 'united states', 'america', 'new york', 'california', 'texas', 'florida', 'seattle', 'boston', 'chicago', 'denver', 'austin', 'san francisco', 'los angeles', 'washington dc', 'silicon valley', 'nyc'], group: 'Quick Picks' },
  { value: 'uk',      label: 'United Kingdom',          keywords: ['uk', 'united kingdom', 'britain', 'london', 'england', 'scotland', 'wales', 'northern ireland', 'manchester', 'birmingham', 'edinburgh', 'leeds', 'bristol'], group: 'Quick Picks' },
  { value: 'canada',  label: 'Canada',                  keywords: ['canada', 'toronto', 'vancouver', 'montreal', 'ottawa', 'calgary', 'edmonton'], group: 'Quick Picks' },
  // Europe
  { value: 'germany',     label: 'Germany',        keywords: ['germany', 'berlin', 'munich', 'hamburg', 'frankfurt', 'cologne', 'stuttgart', 'düsseldorf'], group: 'Europe' },
  { value: 'france',      label: 'France',         keywords: ['france', 'paris', 'lyon', 'marseille', 'toulouse', 'nice', 'bordeaux'], group: 'Europe' },
  { value: 'netherlands', label: 'Netherlands',    keywords: ['netherlands', 'holland', 'amsterdam', 'rotterdam', 'eindhoven', 'utrecht'], group: 'Europe' },
  { value: 'poland',      label: 'Poland',         keywords: ['poland', 'warsaw', 'krakow', 'wroclaw', 'gdansk', 'poznan'], group: 'Europe' },
  { value: 'spain',       label: 'Spain',          keywords: ['spain', 'madrid', 'barcelona', 'valencia', 'seville', 'bilbao'], group: 'Europe' },
  { value: 'italy',       label: 'Italy',          keywords: ['italy', 'rome', 'milan', 'florence', 'naples', 'turin'], group: 'Europe' },
  { value: 'sweden',      label: 'Sweden',         keywords: ['sweden', 'stockholm', 'gothenburg', 'malmo'], group: 'Europe' },
  { value: 'norway',      label: 'Norway',         keywords: ['norway', 'oslo', 'bergen', 'trondheim'], group: 'Europe' },
  { value: 'denmark',     label: 'Denmark',        keywords: ['denmark', 'copenhagen', 'aarhus'], group: 'Europe' },
  { value: 'finland',     label: 'Finland',        keywords: ['finland', 'helsinki', 'espoo', 'tampere'], group: 'Europe' },
  { value: 'switzerland', label: 'Switzerland',    keywords: ['switzerland', 'zurich', 'geneva', 'basel', 'bern'], group: 'Europe' },
  { value: 'austria',     label: 'Austria',        keywords: ['austria', 'vienna', 'graz', 'salzburg'], group: 'Europe' },
  { value: 'portugal',    label: 'Portugal',       keywords: ['portugal', 'lisbon', 'porto', 'braga'], group: 'Europe' },
  { value: 'belgium',     label: 'Belgium',        keywords: ['belgium', 'brussels', 'antwerp', 'ghent'], group: 'Europe' },
  { value: 'ireland',     label: 'Ireland',        keywords: ['ireland', 'dublin', 'cork', 'galway'], group: 'Europe' },
  { value: 'czech',       label: 'Czech Republic', keywords: ['czech', 'czechia', 'prague', 'brno', 'ostrava'], group: 'Europe' },
  { value: 'ukraine',     label: 'Ukraine',        keywords: ['ukraine', 'kyiv', 'kiev', 'lviv', 'kharkiv', 'odessa'], group: 'Europe' },
  { value: 'romania',     label: 'Romania',        keywords: ['romania', 'bucharest', 'cluj', 'timisoara'], group: 'Europe' },
  { value: 'greece',      label: 'Greece',         keywords: ['greece', 'athens', 'thessaloniki'], group: 'Europe' },
  { value: 'hungary',     label: 'Hungary',        keywords: ['hungary', 'budapest', 'debrecen'], group: 'Europe' },
  { value: 'latvia',      label: 'Latvia',         keywords: ['latvia', 'riga'], group: 'Europe' },
  { value: 'lithuania',   label: 'Lithuania',      keywords: ['lithuania', 'vilnius', 'kaunas'], group: 'Europe' },
  { value: 'estonia',     label: 'Estonia',        keywords: ['estonia', 'tallinn', 'tartu'], group: 'Europe' },
  // United Kingdom cities
  { value: 'london',      label: 'London',         keywords: ['london'], group: 'United Kingdom' },
  { value: 'manchester',  label: 'Manchester',     keywords: ['manchester'], group: 'United Kingdom' },
  { value: 'birmingham',  label: 'Birmingham',     keywords: ['birmingham'], group: 'United Kingdom' },
  { value: 'edinburgh',   label: 'Edinburgh / Scotland', keywords: ['edinburgh', 'scotland', 'glasgow'], group: 'United Kingdom' },
  { value: 'bristol',     label: 'Bristol',        keywords: ['bristol'], group: 'United Kingdom' },
  // United States — cities / states
  { value: 'new-york',    label: 'New York, NY',              keywords: ['new york', 'nyc', 'brooklyn', 'manhattan', 'queens'], group: 'United States' },
  { value: 'sf-bay',      label: 'San Francisco / Bay Area',  keywords: ['san francisco', 'sf', 'silicon valley', 'palo alto', 'san jose', 'oakland', 'bay area'], group: 'United States' },
  { value: 'los-angeles', label: 'Los Angeles, CA',           keywords: ['los angeles', 'la', 'santa monica', 'culver city'], group: 'United States' },
  { value: 'seattle',     label: 'Seattle, WA',               keywords: ['seattle', 'redmond', 'bellevue', 'kirkland'], group: 'United States' },
  { value: 'austin',      label: 'Austin, TX',                keywords: ['austin', 'dallas', 'houston', 'texas'], group: 'United States' },
  { value: 'boston',      label: 'Boston, MA',                keywords: ['boston', 'cambridge ma', 'massachusetts'], group: 'United States' },
  { value: 'chicago',     label: 'Chicago, IL',               keywords: ['chicago', 'illinois'], group: 'United States' },
  { value: 'denver',      label: 'Denver, CO',                keywords: ['denver', 'boulder', 'colorado'], group: 'United States' },
  { value: 'miami',       label: 'Miami, FL',                 keywords: ['miami', 'orlando', 'tampa', 'florida'], group: 'United States' },
  { value: 'dc',          label: 'Washington, D.C.',          keywords: ['washington dc', 'washington d.c.', ' dc ', 'arlington va', 'northern virginia'], group: 'United States' },
  // Americas
  { value: 'toronto',   label: 'Toronto, Canada',   keywords: ['toronto', 'ontario'], group: 'Americas' },
  { value: 'vancouver', label: 'Vancouver, Canada', keywords: ['vancouver', 'british columbia'], group: 'Americas' },
  { value: 'montreal',  label: 'Montréal, Canada',  keywords: ['montreal', 'québec'], group: 'Americas' },
  { value: 'brazil',    label: 'Brazil',            keywords: ['brazil', 'são paulo', 'sao paulo', 'rio de janeiro', 'brasilia'], group: 'Americas' },
  { value: 'mexico',    label: 'Mexico',            keywords: ['mexico', 'mexico city', 'guadalajara', 'monterrey'], group: 'Americas' },
  // Asia-Pacific
  { value: 'australia',  label: 'Australia',  keywords: ['australia', 'sydney', 'melbourne', 'brisbane', 'perth'], group: 'Asia-Pacific' },
  { value: 'singapore',  label: 'Singapore',  keywords: ['singapore'], group: 'Asia-Pacific' },
  { value: 'india',      label: 'India',      keywords: ['india', 'bangalore', 'bengaluru', 'mumbai', 'delhi', 'hyderabad', 'pune', 'chennai'], group: 'Asia-Pacific' },
  { value: 'japan',      label: 'Japan',      keywords: ['japan', 'tokyo', 'osaka'], group: 'Asia-Pacific' },
  // Middle East
  { value: 'uae',    label: 'UAE / Dubai', keywords: ['uae', 'dubai', 'abu dhabi', 'sharjah'], group: 'Middle East' },
  { value: 'israel', label: 'Israel',      keywords: ['israel', 'tel aviv', 'jerusalem', 'haifa'], group: 'Middle East' },
];

function locationMatchesJob(locValue: string, jobRegion: string): boolean {
  if (locValue.startsWith('custom:')) {
    return jobRegion.includes(locValue.slice(7).toLowerCase());
  }
  const opt = LOCATION_OPTIONS.find(o => o.value === locValue);
  if (opt) return opt.keywords.some(kw => jobRegion.includes(kw));
  return jobRegion === locValue.toLowerCase() || jobRegion.includes(locValue.toLowerCase());
}

function LocationCombobox({
  selectedLocation,
  setSelectedLocation,
  jobLocations,
  allLabel,
}: {
  selectedLocation: string;
  setSelectedLocation: (v: string) => void;
  jobLocations: string[];
  allLabel: string;
}) {
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const openDropdown = () => { setIsOpen(true); setTimeout(() => inputRef.current?.focus(), 0); };
  const select = (value: string) => { setSelectedLocation(value); setIsOpen(false); setSearch(''); };

  const currentLabel = (() => {
    if (selectedLocation === 'all') return allLabel;
    if (selectedLocation.startsWith('custom:')) return `"${selectedLocation.slice(7)}"`;
    const opt = LOCATION_OPTIONS.find(o => o.value === selectedLocation);
    return opt ? opt.label : selectedLocation;
  })();

  const searchLower = search.toLowerCase();
  const filteredOptions = search
    ? LOCATION_OPTIONS.filter(o =>
        o.label.toLowerCase().includes(searchLower) ||
        o.keywords.some(kw => kw.includes(searchLower))
      )
    : LOCATION_OPTIONS;

  const groups = Array.from(new Set(filteredOptions.map(o => o.group)));

  const jobOnlyLocations = jobLocations.filter(loc => {
    const lower = loc.toLowerCase();
    return !LOCATION_OPTIONS.some(o => o.keywords.includes(lower));
  }).filter(loc => !search || loc.toLowerCase().includes(searchLower));

  const showCustom = search.length > 1 && !filteredOptions.some(o => o.label.toLowerCase() === searchLower);
  const isActive = selectedLocation !== 'all';

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => isOpen ? setIsOpen(false) : openDropdown()}
        className={`flex items-center gap-1.5 pl-3 pr-2.5 py-2 text-sm font-medium rounded-xl border transition-all ${
          isActive
            ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/60'
            : 'bg-white dark:bg-neutral-800 text-gray-700 dark:text-neutral-200 border-gray-200 dark:border-neutral-700 hover:border-gray-300 dark:hover:border-neutral-600'
        }`}
      >
        <svg className="w-3.5 h-3.5 shrink-0 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <span className="max-w-[160px] truncate">{currentLabel}</span>
        {isActive ? (
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => { e.stopPropagation(); select('all'); }}
            onKeyDown={(e) => e.key === 'Enter' && (e.stopPropagation(), select('all'))}
            className="text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-200 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </span>
        ) : (
          <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1.5 w-72 bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700 rounded-2xl shadow-2xl z-50 overflow-hidden">
          <div className="p-2 border-b border-gray-100 dark:border-neutral-800">
            <div className="relative">
              <svg className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') { setIsOpen(false); setSearch(''); }
                  if (e.key === 'Enter' && showCustom) select(`custom:${search}`);
                }}
                placeholder="Search city, country, region..."
                className="w-full pl-7 pr-3 py-1.5 text-sm bg-gray-50 dark:bg-neutral-800 text-gray-900 dark:text-white border border-gray-200 dark:border-neutral-700 rounded-lg outline-none placeholder-gray-400 dark:placeholder-neutral-500"
              />
            </div>
          </div>

          <div className="max-h-72 overflow-y-auto py-1">
            <button
              onClick={() => select('all')}
              className={`w-full text-left px-3 py-2 text-sm transition-colors ${selectedLocation === 'all' ? 'bg-gray-100 dark:bg-neutral-800 text-gray-900 dark:text-white font-semibold' : 'text-gray-700 dark:text-neutral-300 hover:bg-gray-50 dark:hover:bg-neutral-800'}`}
            >
              {allLabel}
            </button>

            {groups.map(group => (
              <div key={group}>
                <div className="px-3 pt-2.5 pb-0.5 text-[9px] font-bold uppercase tracking-widest text-gray-400 dark:text-neutral-500">{group}</div>
                {filteredOptions.filter(o => o.group === group).map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => select(opt.value)}
                    className={`w-full text-left px-3 py-1.5 text-sm transition-colors ${selectedLocation === opt.value ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-semibold' : 'text-gray-700 dark:text-neutral-300 hover:bg-gray-50 dark:hover:bg-neutral-800'}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            ))}

            {jobOnlyLocations.length > 0 && (
              <div>
                <div className="px-3 pt-2.5 pb-0.5 text-[9px] font-bold uppercase tracking-widest text-gray-400 dark:text-neutral-500">From Listings</div>
                {jobOnlyLocations.map(loc => (
                  <button
                    key={loc}
                    onClick={() => select(loc)}
                    className={`w-full text-left px-3 py-1.5 text-sm transition-colors ${selectedLocation === loc ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-semibold' : 'text-gray-700 dark:text-neutral-300 hover:bg-gray-50 dark:hover:bg-neutral-800'}`}
                  >
                    {loc}
                  </button>
                ))}
              </div>
            )}

            {showCustom && (
              <div>
                <div className="px-3 pt-2.5 pb-0.5 text-[9px] font-bold uppercase tracking-widest text-gray-400 dark:text-neutral-500">Custom</div>
                <button
                  onClick={() => select(`custom:${search}`)}
                  className="w-full text-left px-3 py-1.5 text-sm text-gray-700 dark:text-neutral-300 hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors"
                >
                  Search for <span className="font-semibold text-gray-900 dark:text-white">"{search}"</span>
                </button>
              </div>
            )}

            {filteredOptions.length === 0 && jobOnlyLocations.length === 0 && !showCustom && (
              <p className="px-3 py-4 text-sm text-center text-gray-400 dark:text-neutral-500">No locations found</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function JobsTab() {
  const { language } = useStore();
  const t = DICT[language as keyof typeof DICT]?.jobs || DICT.en.jobs;
  const tl = (t as any);

  const [jobs, setJobs] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [applyingJob, setApplyingJob] = useState<any>(null);
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);
  const [showQuestionnaire, setShowQuestionnaire] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const [selectedLevelKey, setSelectedLevelKey] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [smartPrompt, setSmartPrompt] = useState('');
  const [smartTags, setSmartTags] = useState<string[]>([]);

  // Job Market (external search) state
  const [searchMode, setSearchMode] = useState<'internal' | 'external'>('internal');
  const [externalJobs, setExternalJobs] = useState<any[]>([]);
  const [externalTotal, setExternalTotal] = useState(0);
  const [externalPage, setExternalPage] = useState(1);
  const [externalLoading, setExternalLoading] = useState(false);
  const [externalError, setExternalError] = useState('');
  const [externalSource, setExternalSource] = useState('');

  const availableLocations = useMemo(() => {
    const regions = new Set<string>();
    jobs.forEach(job => { if (job.region) regions.add(job.region); });
    return Array.from(regions).sort();
  }, [jobs]);

  const applySmartPrompt = () => {
    if (!smartPrompt.trim()) return;
    const lower = smartPrompt.toLowerCase();
    const tags: string[] = [];

    if (/\bjunior\b/.test(lower)) { setSelectedLevelKey('junior'); tags.push('Junior'); }
    else if (/\bmiddle\b|\bmid[\s-]?level\b/.test(lower)) { setSelectedLevelKey('middle'); tags.push('Middle'); }
    else if (/\bsenior\b/.test(lower)) { setSelectedLevelKey('senior'); tags.push('Senior'); }
    else if (/\blead\b|\bprincipal\b/.test(lower)) { setSelectedLevelKey('lead'); tags.push('Lead'); }

    if (/\bremote\b/.test(lower)) { setSelectedType('remote'); tags.push('Remote'); }
    else if (/\bpart[- ]time\b/.test(lower)) { setSelectedType('part-time'); tags.push('Part-time'); }
    else if (/\bcontract\b|\bfreelance\b/.test(lower)) { setSelectedType('contract'); tags.push('Contract'); }
    else if (/\bfull[- ]time\b/.test(lower)) { setSelectedType('full-time'); tags.push('Full-time'); }

    // Location: prefer specific country/city options over broad regional ones (e.g. 'portugal' over 'europe')
    // First try non-aggregate options (not Quick Picks aggregates like 'europe', 'usa', 'uk', 'canada')
    const aggregateValues = new Set(['remote', 'europe', 'usa', 'uk', 'canada']);
    const specificMatch = LOCATION_OPTIONS.find(o =>
      !aggregateValues.has(o.value) && (
        o.label.toLowerCase().split(' ').some(w => w.length > 2 && lower.includes(w)) ||
        o.keywords.some(kw => kw.length > 2 && lower.includes(kw))
      )
    );
    const matchedLocOpt = specificMatch || LOCATION_OPTIONS.find(o =>
      aggregateValues.has(o.value) && (
        o.label.toLowerCase().split(' ').some(w => w.length > 2 && lower.includes(w)) ||
        o.keywords.some(kw => kw.length > 2 && lower.includes(kw))
      )
    );
    if (matchedLocOpt) {
      setSelectedLocation(matchedLocOpt.value);
      tags.push(matchedLocOpt.label);
    } else {
      const foundLoc = availableLocations.find(loc => lower.includes(loc.toLowerCase()));
      if (foundLoc) { setSelectedLocation(foundLoc); tags.push(foundLoc); }
    }

    const roleKeywords = ['developer', 'engineer', 'designer', 'manager', 'analyst', 'data scientist', 'devops', 'qa', 'product manager', 'frontend', 'backend', 'fullstack'];
    const foundRole = roleKeywords.find(kw => lower.includes(kw));
    if (foundRole) {
      setSearchQuery(foundRole);
      tags.push(foundRole.split(' ').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' '));
    }

    setSmartTags(tags);
  };

  const clearSmartFilters = () => {
    setSmartTags([]);
    setSmartPrompt('');
    setSelectedLevelKey('all');
    setSelectedType('all');
    setSelectedLocation('all');
    setSearchQuery('');
  };

  const fetchExternalJobs = useCallback(async (page: number) => {
    setExternalLoading(true);
    setExternalError('');
    // For custom free-text entries, strip the "custom:" prefix and send as location_value
    const locValue = selectedLocation.startsWith('custom:')
      ? selectedLocation.slice(7)
      : selectedLocation;
    try {
      const result = await externalJobsApi.search({
        q: searchQuery,
        location_value: locValue,
        employment_type: selectedType === 'all' ? '' : selectedType,
        level: selectedLevelKey === 'all' ? '' : selectedLevelKey,
        page,
      });
      setExternalJobs(result.jobs ?? []);
      setExternalTotal(result.total ?? 0);
      setExternalPage(page);
      setExternalSource(result.source ?? '');
      if (result.error) setExternalError(`Search error: ${result.error}`);
    } catch {
      setExternalError('Could not reach the job search service. Please try again.');
    } finally {
      setExternalLoading(false);
    }
  }, [searchQuery, selectedLocation, selectedType, selectedLevelKey]);

  // Auto-search with debounce when in external mode — only when the user has
  // set at least one filter, so opening the tab doesn't auto-load random jobs.
  useEffect(() => {
    if (searchMode !== 'external') return;
    const hasFilters = searchQuery.trim() !== '' || selectedLocation !== 'all' || selectedType !== 'all' || selectedLevelKey !== 'all';
    if (!hasFilters) return;
    const timer = setTimeout(() => { fetchExternalJobs(1); }, 600);
    return () => clearTimeout(timer);
  }, [searchMode, searchQuery, selectedLocation, selectedType, selectedLevelKey, fetchExternalJobs]);

  // Switch to external mode and trigger search when smart prompt is applied
  const applySmartAndSearch = () => {
    applySmartPrompt();
    // Use the full prompt as the search query so "Data Engineer Lisbon"
    // sends q="Data Engineer Lisbon" instead of just the extracted role word
    setSearchQuery(smartPrompt.trim());
    setSearchMode('external');
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [jobsData, myAppsData, userData] = await Promise.all([
          jobsApi.list(),
          screeningApi.getMyApplications(),
          authApi.getMe()
        ]);
        setJobs(jobsData);
        setApplications(myAppsData);
        setUser(userData);
      } catch (err) {
        console.error("Failed to load jobs data", err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const handleApplyClick = (job: any) => {
    const jid = job.id || job.job_id;
    setApplyingJob(job);
    setAnswers({});

    const rawData = job.screening_questions || job.screening_questions_json;
    let questionsArray: any[] = [];

    if (rawData) {
      if (typeof rawData === 'string') {
        try {
          const parsed = JSON.parse(rawData);
          questionsArray = Array.isArray(parsed) ? parsed : [];
        } catch (e) {
          questionsArray = [];
        }
      } else if (Array.isArray(rawData)) {
        questionsArray = rawData;
      }
    }

    if (questionsArray.length > 0) {
      setApplyingJob({ ...job, questions_to_render: questionsArray });
      setShowQuestionnaire(true);
      return;
    }

    proceedWithApplication(jid);
  };

  const handleQuestionnaireSubmit = () => {
    if (!applyingJob) return;
    const jid = applyingJob.id || applyingJob.job_id;
    setShowQuestionnaire(false);
    proceedWithApplication(jid, answers);
  };

  const proceedWithApplication = async (jobId: string, finalAnswers: any = null) => {
    try {
      const myDocs = await documentsApi.getMyDocuments();
      if (myDocs.length > 0) {
        await screeningApi.applyToJob(jobId, finalAnswers);
        completeApplication();
      } else {
        fileInputRef.current?.click();
      }
    } catch (err: any) {
      alert(err.response?.data?.detail || t.errorMsg);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !applyingJob) return;
    const jid = applyingJob.id || applyingJob.job_id;

    try {
      await documentsApi.upload(file);
      await screeningApi.applyToJob(jid, answers);
      completeApplication();
    } catch (err) {
      alert(t.cvErrorMsg);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const completeApplication = async () => {
    const updatedApps = await screeningApi.getMyApplications();
    setApplications(updatedApps);
    setApplyingJob(null);
    setAnswers({});
    alert(t.successMsg);
  };

  const getStatusNormalized = (status: string) => status?.toUpperCase().replace(/ /g, '_') || '';

  const getStatusStyles = (status: string) => {
    const s = getStatusNormalized(status);
    if (s.includes('APPL')) return 'bg-gray-100 dark:bg-neutral-800 text-gray-800 dark:text-neutral-300 border-gray-200 dark:border-neutral-700';
    if (s.includes('OFFER') || s.includes('HIRE') || s.includes('ACCEPT')) return 'bg-emerald-100 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/50';
    if (s.includes('REJECT') || s.includes('FAIL')) return 'bg-red-100 dark:bg-red-950/30 text-red-800 dark:text-red-400 border-red-200 dark:border-red-900/50';
    return 'bg-indigo-50 dark:bg-indigo-950/20 text-indigo-800 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900/30';
  };

  const displayedJobs = jobs.filter(job => {
    const jobLevelKey = job.level?.toLowerCase() || '';
    const jobRegion = (job.region || '').toLowerCase();
    const jobDesc = (job.description || '').toLowerCase();
    const jobTitle = (job.title || '').toLowerCase();

    const matchesLevel = selectedLevelKey === 'all' || jobLevelKey === selectedLevelKey;
    const matchesSearch = searchQuery === '' || jobTitle.includes(searchQuery.toLowerCase()) || jobDesc.includes(searchQuery.toLowerCase());

    let matchesType = true;
    if (selectedType !== 'all') {
      if (selectedType === 'remote') matchesType = jobRegion.includes('remote') || jobDesc.includes('remote');
      else if (selectedType === 'full-time') matchesType = jobDesc.includes('full-time') || jobDesc.includes('full time');
      else if (selectedType === 'part-time') matchesType = jobDesc.includes('part-time') || jobDesc.includes('part time');
      else if (selectedType === 'contract') matchesType = jobDesc.includes('contract') || jobDesc.includes('freelance');
    }

    const matchesLocation = selectedLocation === 'all' || locationMatchesJob(selectedLocation, jobRegion);

    return matchesLevel && matchesSearch && matchesType && matchesLocation;
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-gray-50 dark:bg-neutral-900 border border-gray-100 dark:border-neutral-800 rounded-2xl max-w-2xl mx-auto mt-10 transition-colors">
        <div className="w-8 h-8 border-4 border-gray-200 dark:border-neutral-700 border-t-gray-900 dark:border-t-white rounded-full animate-spin mb-4"></div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">{t.loadingTitle}</h3>
        <p className="text-sm text-gray-500 dark:text-neutral-400">{t.loadingDesc}</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-none mx-auto space-y-8 animate-in fade-in duration-300 pb-20">
      <input type="file" ref={fileInputRef} className="hidden" accept=".pdf,.docx,.txt" onChange={handleFileUpload} />

      <div className="space-y-4 border-b border-gray-100 dark:border-neutral-800 pb-6 transition-colors">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight mb-1">{t.title}</h2>
          <p className="text-sm text-gray-500 dark:text-neutral-400 font-medium">
            {t.subtitle.replace('{name}', user?.email?.split('@')[0] || 'User')}
          </p>
        </div>

        {/* Mode switcher */}
        <div className="flex gap-1 bg-gray-100 dark:bg-neutral-800 p-1 rounded-xl w-fit transition-colors">
          <button
            onClick={() => setSearchMode('internal')}
            className={`flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${searchMode === 'internal' ? 'bg-white dark:bg-neutral-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-neutral-400 hover:text-gray-700 dark:hover:text-neutral-200'}`}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5" /></svg>
            Company Postings
          </button>
          <button
            onClick={() => setSearchMode('external')}
            className={`flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${searchMode === 'external' ? 'bg-white dark:bg-neutral-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-neutral-400 hover:text-gray-700 dark:hover:text-neutral-200'}`}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            Job Market
          </button>
        </div>

        {/* Smart prompt bar */}
        <div className="flex gap-2 items-center bg-gray-50 dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700 rounded-2xl px-4 py-3 focus-within:border-gray-400 dark:focus-within:border-neutral-500 transition-colors">
          <svg className="w-4 h-4 text-indigo-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3l1.5 1.5M12 2v2m7-1l-1.5 1.5M3 12H1m22 0h-2M5.5 18.5L4 20M19 4l-1 1M18.5 18.5L20 20M12 22v-2M7 12a5 5 0 1110 0 5 5 0 01-10 0z" />
          </svg>
          <input
            type="text"
            value={smartPrompt}
            onChange={(e) => setSmartPrompt(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && applySmartAndSearch()}
            placeholder={tl.smartPromptPlaceholder || 'e.g. "Senior developer jobs in EU, full-time"'}
            className="flex-1 bg-transparent text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-neutral-500 outline-none"
          />
          {smartPrompt.trim() && (
            <button
              onClick={applySmartAndSearch}
              className="shrink-0 flex items-center gap-1.5 px-3 py-1 bg-gray-900 dark:bg-white text-white dark:text-black text-xs font-semibold rounded-lg hover:bg-gray-800 dark:hover:bg-neutral-200 transition-all"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              {tl.smartApply || 'Search Jobs'}
            </button>
          )}
        </div>

        {/* Filter row */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative">
            <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-neutral-500 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder={t.searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 bg-white dark:bg-neutral-800 text-gray-900 dark:text-white border border-gray-200 dark:border-neutral-700 rounded-xl text-sm focus:ring-2 focus:ring-gray-900 dark:focus:ring-white outline-none transition-all placeholder-gray-400 dark:placeholder-neutral-500 w-52"
            />
          </div>

          {/* Level dropdown */}
          <div className="relative">
            <select
              value={selectedLevelKey}
              onChange={(e) => setSelectedLevelKey(e.target.value)}
              className="appearance-none bg-white dark:bg-neutral-800 text-gray-700 dark:text-neutral-200 border border-gray-200 dark:border-neutral-700 rounded-xl pl-3 pr-7 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white cursor-pointer transition-colors"
            >
              <option value="all">{tl.allLevels || 'All Levels'}</option>
              <option value="junior">{t.levels.junior}</option>
              <option value="middle">{t.levels.middle}</option>
              <option value="senior">{t.levels.senior}</option>
              <option value="lead">{t.levels.lead}</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
              <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </div>
          </div>

          {/* Type dropdown */}
          <div className="relative">
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="appearance-none bg-white dark:bg-neutral-800 text-gray-700 dark:text-neutral-200 border border-gray-200 dark:border-neutral-700 rounded-xl pl-3 pr-7 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white cursor-pointer transition-colors"
            >
              <option value="all">{tl.allTypes || 'All Types'}</option>
              <option value="full-time">{tl.types?.fullTime || 'Full-time'}</option>
              <option value="part-time">{tl.types?.partTime || 'Part-time'}</option>
              <option value="contract">{tl.types?.contract || 'Contract'}</option>
              <option value="remote">{tl.types?.remote || 'Remote'}</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
              <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </div>
          </div>

          {/* Location combobox */}
          <LocationCombobox
            selectedLocation={selectedLocation}
            setSelectedLocation={setSelectedLocation}
            jobLocations={availableLocations}
            allLabel={tl.allLocations || 'All Locations'}
          />

          {/* Smart filter — always visible as a permanent filter tab */}
          <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-all ${
            smartTags.length > 0
              ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800/50'
              : 'bg-white dark:bg-neutral-800 border-gray-200 dark:border-neutral-700'
          }`}>
            <svg className={`w-3.5 h-3.5 shrink-0 ${smartTags.length > 0 ? 'text-indigo-500 dark:text-indigo-400' : 'text-gray-400 dark:text-neutral-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3l1.5 1.5M12 2v2m7-1l-1.5 1.5M3 12H1m22 0h-2M5.5 18.5L4 20M19 4l-1 1M18.5 18.5L20 20M12 22v-2M7 12a5 5 0 1110 0 5 5 0 01-10 0z" />
            </svg>
            {smartTags.length > 0 ? (
              <div className="flex items-center gap-1.5 flex-wrap">
                {smartTags.map(tag => (
                  <span key={tag} className="inline-flex items-center px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 rounded-full text-xs font-semibold">
                    {tag}
                  </span>
                ))}
                <button
                  onClick={clearSmartFilters}
                  className="text-xs text-gray-400 dark:text-neutral-500 hover:text-red-500 dark:hover:text-red-400 font-medium transition-colors ml-1"
                >
                  {tl.smartClear || 'Clear'}
                </button>
              </div>
            ) : (
              <span className="text-xs text-gray-400 dark:text-neutral-500">{tl.smartLabel || 'Smart Filter'}</span>
            )}
          </div>
        </div>
      </div>

      {/* ── External Job Market ── */}
      {searchMode === 'external' && (
        <div className="space-y-4">
          {/* Header row */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                Job Market
                {externalTotal > 0 && <span className="ml-2 text-xs text-gray-400 dark:text-neutral-500 font-normal">{externalTotal.toLocaleString()} results</span>}
              </h3>
              {externalSource && (
                <p className="text-[10px] text-gray-400 dark:text-neutral-500 mt-0.5">
                  {externalSource === 'adzuna' ? 'via Adzuna' : externalSource === 'arbeitnow' ? 'via Arbeitnow (EU & Remote)' : ''}
                </p>
              )}
            </div>
            {externalLoading && (
              <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-neutral-500">
                <div className="w-3.5 h-3.5 border-2 border-gray-300 dark:border-neutral-600 border-t-gray-600 dark:border-t-neutral-300 rounded-full animate-spin" />
                Searching…
              </div>
            )}
          </div>

          {externalError && (
            <div className="rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 px-4 py-3 text-sm text-red-600 dark:text-red-400">
              {externalError}
            </div>
          )}

          {!externalLoading && externalJobs.length === 0 && !externalError && (
            <div className="text-center py-12 bg-gray-50 dark:bg-neutral-900 rounded-2xl border border-gray-100 dark:border-neutral-800 transition-colors">
              {searchQuery.trim() || selectedLocation !== 'all' || selectedType !== 'all' || selectedLevelKey !== 'all'
                ? <p className="text-gray-500 dark:text-neutral-400 font-medium">No jobs found. Try adjusting your filters or search terms.</p>
                : <>
                    <p className="text-gray-700 dark:text-white font-semibold mb-1">Search the job market</p>
                    <p className="text-sm text-gray-400 dark:text-neutral-500">Use the prompt above or set a filter to find jobs worldwide.</p>
                  </>
              }
            </div>
          )}

          <div className="grid grid-cols-1 gap-4">
            {externalJobs.map((job) => {
              const salaryText = job.salary_min && job.salary_max
                ? `$${Math.round(job.salary_min / 1000)}k – $${Math.round(job.salary_max / 1000)}k`
                : job.salary_min ? `from $${Math.round(job.salary_min / 1000)}k` : null;
              return (
                <div key={job.job_id} className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-2xl p-5 md:p-6 hover:shadow-md transition-all group">
                  <div className="flex flex-col md:flex-row md:items-start gap-4">
                    {/* Company initial */}
                    <div className="shrink-0 w-11 h-11 rounded-xl bg-gray-100 dark:bg-neutral-800 flex items-center justify-center text-base font-bold text-gray-600 dark:text-neutral-300 border border-gray-200 dark:border-neutral-700">
                      {(job.company || '?').charAt(0).toUpperCase()}
                    </div>

                    <div className="flex-1 min-w-0 space-y-2">
                      <div>
                        <h3 className="text-base font-bold text-gray-900 dark:text-white leading-tight">{job.title}</h3>
                        <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-gray-500 dark:text-neutral-400">
                          {job.company && <span className="font-medium text-gray-700 dark:text-neutral-300">{job.company}</span>}
                          {job.company && job.location && <span>·</span>}
                          {job.location && (
                            <span className="flex items-center gap-1">
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                              {job.location}
                            </span>
                          )}
                          {job.remote && (
                            <span className="px-1.5 py-0.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50 rounded-md text-[10px] font-bold uppercase tracking-wide">Remote</span>
                          )}
                          {salaryText && (
                            <span className="px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/40 rounded-md text-[10px] font-semibold">{salaryText}</span>
                          )}
                        </div>
                      </div>

                      {job.description && (
                        <p className="text-sm text-gray-600 dark:text-neutral-300 leading-relaxed line-clamp-2">{job.description}</p>
                      )}

                      {job.tags && job.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {job.tags.slice(0, 6).map((tag: string) => (
                            <span key={tag} className="px-2 py-0.5 bg-gray-100 dark:bg-neutral-800 text-gray-600 dark:text-neutral-400 text-[10px] font-medium rounded-md border border-gray-200 dark:border-neutral-700">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="shrink-0 self-start flex flex-col items-end gap-3">
                      {/* Date + Company badges in one row */}
                      {(job.created_at || job.company) && (
                        <div className="flex items-center gap-1.5 flex-wrap justify-end">
                          {job.created_at && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 dark:bg-neutral-800 text-gray-500 dark:text-neutral-500 border border-gray-200 dark:border-neutral-700 rounded-lg text-xs font-medium whitespace-nowrap">
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                              {new Date(job.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                          )}
                          {job.company && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 dark:bg-neutral-800 text-gray-600 dark:text-neutral-400 border border-gray-200 dark:border-neutral-700 rounded-lg text-xs font-medium whitespace-nowrap">
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                              {job.company}
                            </span>
                          )}
                        </div>
                      )}
                      <a
                        href={job.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-5 py-2 bg-gray-900 dark:bg-white hover:bg-gray-800 dark:hover:bg-neutral-200 text-white dark:text-black text-sm font-semibold rounded-xl shadow-sm transition-all active:scale-[0.98] whitespace-nowrap"
                      >
                        Apply →
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {externalTotal > 20 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={() => fetchExternalJobs(externalPage - 1)}
                disabled={externalPage <= 1 || externalLoading}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-neutral-300 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-xl hover:bg-gray-50 dark:hover:bg-neutral-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                ← Previous
              </button>
              <span className="text-sm text-gray-500 dark:text-neutral-400 px-2">Page {externalPage}</span>
              <button
                onClick={() => fetchExternalJobs(externalPage + 1)}
                disabled={externalPage * 20 >= externalTotal || externalLoading}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-neutral-300 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-xl hover:bg-gray-50 dark:hover:bg-neutral-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Next →
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Internal Company Jobs ── */}
      {searchMode === 'internal' && <div className="grid grid-cols-1 gap-6">
        {displayedJobs.length === 0 ? (
           <div className="text-center py-12 bg-gray-50 dark:bg-neutral-900 rounded-2xl border border-gray-100 dark:border-neutral-800 transition-colors">
             <p className="text-gray-500 dark:text-neutral-400 font-medium">{t.noJobsFound}</p>
           </div>
        ) : (
          displayedJobs.map((job) => {
            const jid = job.id || job.job_id;
            const userApp = applications.find(a => a.job_id === jid);
            const isExpanded = expandedJobId === jid;

            const displayStages = [t.stages.applied, t.stages.inProgress, t.stages.decision];
            const normalizedStatus = userApp ? getStatusNormalized(userApp.status) : '';

            let currentStageIdx = 0;
            if (normalizedStatus.includes('OFFER') || normalizedStatus.includes('HIRE') || normalizedStatus.includes('REJECT') || normalizedStatus.includes('FAIL') || normalizedStatus.includes('ACCEPT')) {
              currentStageIdx = 2; // Decision
            } else if (normalizedStatus !== '' && !normalizedStatus.includes('APPLIED')) {
              currentStageIdx = 1; // In Progress
            }

            const isRejected = normalizedStatus.includes('REJECT') || normalizedStatus.includes('FAIL');
            const isOffer = normalizedStatus.includes('OFFER') || normalizedStatus.includes('HIRE') || normalizedStatus.includes('ACCEPT');

            return (
              <div key={jid} className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-2xl shadow-sm hover:shadow-md transition-all overflow-hidden group">
                <div className="p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                  <div className="space-y-4 flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white">{job.title}</h3>
                      {userApp && (
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border transition-colors ${getStatusStyles(userApp.status)}`}>
                          {userApp.status.replace(/_/g, ' ')}
                        </span>
                      )}
                    </div>

                    <div className="flex gap-4 text-xs font-medium text-gray-500 dark:text-neutral-400">
                      <span className="flex items-center gap-1.5">
                        <svg className="w-4 h-4 text-gray-400 dark:text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        {job.region || t.remote}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <svg className="w-4 h-4 text-gray-400 dark:text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        {t.fullTime}
                      </span>
                      {job.level && (
                        <span className="flex items-center px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800/50 rounded-md font-bold uppercase tracking-widest text-[9px] transition-colors">
                          {job.level}
                        </span>
                      )}
                    </div>

                    <p className={`text-sm text-gray-600 dark:text-neutral-300 leading-relaxed max-w-3xl whitespace-pre-wrap ${isExpanded ? '' : 'line-clamp-2'}`}>
                      {job.description}
                    </p>

                    <button onClick={() => setExpandedJobId(isExpanded ? null : jid)} className="text-xs font-bold text-indigo-600 dark:text-white hover:text-indigo-700 dark:hover:text-neutral-300 transition-colors">
                      {isExpanded ? t.showLess : t.viewDetails}
                    </button>
                  </div>

                  <div className="shrink-0 w-full md:w-auto mt-4 md:mt-0 flex flex-col items-end gap-3">
                    {/* Date + Company in one row */}
                    {(job.created_at || job.organization_name) && (
                      <div className="flex items-center gap-1.5 flex-wrap justify-end">
                        {job.created_at && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 dark:bg-neutral-800 text-gray-500 dark:text-neutral-500 border border-gray-200 dark:border-neutral-700 rounded-lg text-xs font-medium whitespace-nowrap">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                            {new Date(job.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        )}
                        {job.organization_name && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 dark:bg-neutral-800 text-gray-600 dark:text-neutral-400 border border-gray-200 dark:border-neutral-700 rounded-lg text-xs font-medium whitespace-nowrap">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                            {job.organization_name}
                          </span>
                        )}
                      </div>
                    )}
                    {/* Apply button */}
                    {userApp ? (
                      <div className="w-full text-center bg-gray-50 dark:bg-neutral-800 text-gray-700 dark:text-neutral-300 px-6 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 dark:border-neutral-700 transition-colors">
                        {t.appSubmittedBtn}
                      </div>
                    ) : (
                      <button
                        onClick={() => handleApplyClick(job)}
                        className="w-full md:w-auto px-6 py-2.5 bg-gray-900 dark:bg-white hover:bg-gray-800 dark:hover:bg-neutral-200 text-white dark:text-black text-sm font-semibold rounded-xl shadow-sm transition-all active:scale-[0.98]"
                      >
                        {t.quickApplyBtn}
                      </button>
                    )}
                  </div>
                </div>

                {userApp && (
                  <div className="px-6 md:px-12 py-8 border-t border-gray-100 dark:border-neutral-800 bg-gray-50/50 dark:bg-neutral-900/50 relative overflow-x-auto custom-scrollbar transition-colors">
                    <div className="flex justify-between items-center relative min-w-[500px] max-w-3xl mx-auto">
                      <div className="absolute top-1/2 left-0 w-full h-1 bg-gray-200 dark:bg-neutral-800 -translate-y-1/2 z-0 rounded-full"></div>
                      <div
                        className={`absolute top-1/2 left-0 h-1 ${isRejected ? 'bg-red-500 dark:bg-red-600' : isOffer ? 'bg-emerald-500 dark:bg-emerald-600' : 'bg-indigo-500 dark:bg-white'} -translate-y-1/2 z-0 transition-all duration-1000 rounded-full`}
                        style={{ width: `${Math.min(100, Math.max(0, (currentStageIdx / (displayStages.length - 1)) * 100))}%` }}
                      ></div>

                      {displayStages.map((stage: string, idx: number) => {
                        const isActive = idx <= currentStageIdx;
                        const isCurrent = idx === currentStageIdx;

                        let dotClass = 'bg-white dark:bg-black border-gray-300 dark:border-neutral-700';
                        let textClass = 'text-gray-400 dark:text-neutral-500';

                        if (isCurrent) {
                          dotClass = isRejected ? 'bg-white dark:bg-black border-red-500 dark:border-red-600 shadow-sm' : isOffer ? 'bg-white dark:bg-black border-emerald-500 dark:border-emerald-600 shadow-sm' : 'bg-white dark:bg-black border-indigo-500 dark:border-white shadow-sm';
                          textClass = isRejected ? 'text-red-600 dark:text-red-400' : isOffer ? 'text-emerald-600 dark:text-emerald-400' : 'text-indigo-600 dark:text-white';
                        } else if (isActive) {
                          dotClass = isRejected ? 'bg-red-500 dark:bg-red-600 border-red-500 dark:border-red-600' : isOffer ? 'bg-emerald-500 dark:bg-emerald-600 border-emerald-500 dark:border-emerald-600' : 'bg-indigo-500 dark:bg-white border-indigo-500 dark:border-white';
                          textClass = isRejected || isOffer ? 'text-white' : 'text-white dark:text-black';
                        }

                        return (
                          <div key={stage} className="relative z-10 flex flex-col items-center">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-500 border-2 ${dotClass}`}>
                              {isActive && !isCurrent ? (
                                <svg className={`w-4 h-4 ${textClass}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                              ) : <span className={`text-xs font-bold ${textClass}`}>{idx + 1}</span>}
                            </div>
                            <span className={`absolute -bottom-6 text-[9px] font-bold uppercase whitespace-nowrap tracking-wider ${isCurrent ? (isRejected ? 'text-red-700 dark:text-red-400' : isOffer ? 'text-emerald-700 dark:text-emerald-400' : 'text-gray-900 dark:text-white') : 'text-gray-400 dark:text-neutral-500'}`}>
                              {stage}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {isRejected && (
                      <div className="absolute inset-0 bg-red-50/80 dark:bg-red-950/80 backdrop-blur-sm flex items-center justify-center z-20 transition-colors">
                        <div className="bg-white dark:bg-neutral-900 text-red-600 dark:text-red-400 border border-red-500 dark:border-red-500/50 px-6 py-2.5 rounded-full font-bold text-xs uppercase tracking-wider shadow-lg flex items-center gap-2">
                           <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                           {t.rejectedStamp}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>}

      {showQuestionnaire && applyingJob && (
        <div className="fixed inset-0 bg-gray-900/40 dark:bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 w-full max-w-lg rounded-3xl shadow-2xl border border-gray-100 dark:border-neutral-800 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 transition-colors">
            <div className="px-6 py-5 border-b border-gray-100 dark:border-neutral-800 bg-gray-50 dark:bg-neutral-800/50 flex justify-between items-center transition-colors">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">{t.formTitle}</h3>
                <p className="text-xs text-gray-500 dark:text-neutral-400 font-medium mt-1">
                  {t.formSubtitle.replace('{jobTitle}', applyingJob.title)}
                </p>
              </div>
              <button onClick={() => {setShowQuestionnaire(false); setApplyingJob(null);}} className="p-2 text-gray-400 dark:text-neutral-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-neutral-700 rounded-full transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh] space-y-4 bg-white dark:bg-neutral-900 transition-colors">
              {applyingJob.questions_to_render?.map((q: any, idx: number) => (
                <div key={q.id} className="bg-gray-50 dark:bg-neutral-800/30 border border-gray-100 dark:border-neutral-800 rounded-2xl p-4 transition-colors hover:border-gray-200 dark:hover:border-neutral-700 focus-within:border-gray-300 dark:focus-within:border-neutral-600 focus-within:bg-white dark:focus-within:bg-neutral-800 focus-within:shadow-sm">
                  <label className="flex items-center gap-2 mb-3">
                     <span className="w-5 h-5 rounded-md bg-gray-200 dark:bg-neutral-700 text-gray-600 dark:text-neutral-300 flex items-center justify-center text-[10px] font-bold shrink-0 transition-colors">{idx + 1}</span>
                     <span className="text-sm font-semibold text-gray-700 dark:text-white transition-colors">{q.label}</span>
                  </label>
                  <input
                    type="text"
                    placeholder={t.answerPlaceholder}
                    onChange={(e) => setAnswers(prev => ({...prev, [q.id]: e.target.value}))}
                    className="w-full px-3 py-2.5 text-sm bg-white dark:bg-black text-gray-900 dark:text-white border border-gray-300 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-gray-900 dark:focus:ring-white focus:outline-none transition-all placeholder-gray-400 dark:placeholder-neutral-600"
                  />
                </div>
              ))}
            </div>
            <div className="px-6 py-4 border-t border-gray-100 dark:border-neutral-800 bg-gray-50 dark:bg-neutral-800/50 shrink-0 flex gap-3 transition-colors">
              <button onClick={() => {setShowQuestionnaire(false); setApplyingJob(null);}} className="flex-1 py-2.5 bg-white dark:bg-neutral-800 border border-gray-300 dark:border-neutral-700 text-gray-700 dark:text-neutral-300 text-sm font-semibold rounded-xl hover:bg-gray-50 dark:hover:bg-neutral-700 transition-colors">
                {t.cancel}
              </button>
              <button onClick={handleQuestionnaireSubmit} className="flex-[2] py-2.5 bg-gray-900 dark:bg-white text-white dark:text-black text-sm font-semibold rounded-xl hover:bg-gray-800 dark:hover:bg-neutral-200 shadow-sm transition-all active:scale-[0.98]">
                {t.submitAnswers}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}