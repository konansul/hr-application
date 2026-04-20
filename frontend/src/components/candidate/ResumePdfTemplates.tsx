import { Document, Page, Text, View, StyleSheet, pdf, Image, Svg, Circle, Path, Font } from '@react-pdf/renderer';

const CDN = 'https://cdn.jsdelivr.net/npm/dejavu-fonts-ttf@2.37.3/ttf';

Font.register({
  family: 'DejaVu Sans',
  fonts: [
    { src: `${CDN}/DejaVuSans.ttf` },
    { src: `${CDN}/DejaVuSans-Bold.ttf`,       fontWeight: 'bold' },
    { src: `${CDN}/DejaVuSans-Oblique.ttf`,     fontStyle: 'italic' },
    { src: `${CDN}/DejaVuSans-BoldOblique.ttf`, fontWeight: 'bold', fontStyle: 'italic' },
  ],
});

Font.registerHyphenationCallback(word => [word]);

const skillName = (s: any) => typeof s === 'string' ? s : s?.name || '';
const langName  = (l: any) => typeof l === 'string' ? l : l?.name || l?.language || '';
const certName  = (c: any) => typeof c === 'string' ? c : c?.name || c?.title || '';

function fullName(info: any, fallback?: string | null) {
  return [info?.first_name, info?.last_name].filter(Boolean).join(' ') || fallback || 'Resume';
}

function contactParts(info: any): string[] {
  return [
    info?.email,
    info?.phone,
    info?.city && info?.country ? `${info.city}, ${info.country}` : info?.city || info?.country,
    info?.linkedin_url,
    info?.github_url,
  ].filter(Boolean) as string[];
}

function dateRange(e: any) {
  if (!e.start_date && !e.end_date) return '';
  return `${e.start_date || ''}${e.end_date ? ` – ${e.end_date}` : e.start_date ? ' – Present' : ''}`;
}

function hasList(arr: any[]) { return arr && arr.length > 0; }

function skillLevel(s: any): number | null {
  const raw = s?.level ?? s?.proficiency;
  if (!raw) return null;
  if (typeof raw === 'number') return Math.min(100, Math.max(0, raw <= 5 ? raw * 20 : raw));
  const map: Record<string, number> = {
    beginner: 20, elementary: 35, intermediate: 55,
    'upper-intermediate': 70, advanced: 80, expert: 95, native: 100,
  };
  return map[String(raw).toLowerCase()] ?? null;
}

function SkillBars({ skills, barColor = '#111', chipStyle, defaultLevel, itemMb = 6, labelFs = 8 }: {
  skills: any[]; barColor?: string; chipStyle?: object; defaultLevel?: number; itemMb?: number; labelFs?: number;
}) {
  const withLevel = skills.filter(s => skillLevel(s) !== null);
  if (withLevel.length === 0 && !defaultLevel) {
    return (
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {skills.map((s, i) => (
          <Text key={i} style={{ fontSize: 8.5, paddingHorizontal: 7, paddingVertical: 3,
            marginRight: 5, marginBottom: 4, backgroundColor: '#f0f0f0', ...chipStyle }}>
            {skillName(s)}
          </Text>
        ))}
      </View>
    );
  }
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
      {skills.map((s, i) => {
        const pct = skillLevel(s) ?? defaultLevel ?? null;
        return (
          <View key={i} style={{ width: '48%', marginBottom: itemMb, marginRight: '2%' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
              <Text style={{ fontSize: labelFs, color: '#333' }}>{skillName(s)}</Text>
              {pct !== null && skillLevel(s) !== null && <Text style={{ fontSize: labelFs - 1, color: '#999' }}>{pct}%</Text>}
            </View>
            <View style={{ height: 3, backgroundColor: '#e5e7eb', borderRadius: 2 }}>
              {pct !== null && (
                <View style={{ height: 3, width: `${pct}%`, backgroundColor: barColor, borderRadius: 2 }} />
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

function PhotoCircle({ src, size }: { src: string; size: number }) {
  return <Image src={src} style={{ width: size, height: size, borderRadius: size / 2, objectFit: 'cover' }} />;
}
function PhotoRect({ src, w, h, radius = 4 }: { src: string; w: number; h: number; radius?: number }) {
  return <Image src={src} style={{ width: w, height: h, borderRadius: radius, objectFit: 'cover' }} />;
}


const CL = StyleSheet.create({
  page:      { padding: '40 48 40 48', fontFamily: 'DejaVu Sans', backgroundColor: '#fff', fontSize: 9 },
  header:    { marginBottom: 14 },
  name:      { fontSize: 22, fontFamily: 'DejaVu Sans', fontWeight: 'bold', color: '#111', marginBottom: 4 },
  contacts:  { flexDirection: 'row', flexWrap: 'wrap', gap: 0 },
  contact:   { fontSize: 8.5, color: '#555', marginRight: 14, marginBottom: 2 },
  rule:      { borderBottomWidth: 1.5, borderBottomColor: '#111', marginBottom: 11 },
  section:   { marginBottom: 13 },
  secTitle:  { fontSize: 7.5, fontFamily: 'DejaVu Sans', fontWeight: 'bold', textTransform: 'uppercase',
               letterSpacing: 1.8, marginBottom: 6, color: '#111' },
  thinRule:  { borderBottomWidth: 0.5, borderBottomColor: '#bbb', marginBottom: 7 },
  entry:     { marginBottom: 7 },
  row:       { flexDirection: 'row', justifyContent: 'space-between' },
  bold:      { fontFamily: 'DejaVu Sans', fontWeight: 'bold', fontSize: 9.5, color: '#111' },
  sub:       { fontSize: 8.5, color: '#555', marginTop: 1 },
  dates:     { fontSize: 8, color: '#888', textAlign: 'right' },
  desc:      { fontSize: 8.5, color: '#333', lineHeight: 1.55, marginTop: 3 },
  summary:   { fontSize: 9.5, color: '#333', lineHeight: 1.6 },
  skills:    { flexDirection: 'row', flexWrap: 'wrap' },
  skill:     { fontSize: 8.5, backgroundColor: '#f0f0f0', paddingHorizontal: 7,
               paddingVertical: 3, marginRight: 5, marginBottom: 4 },
  misc:      { fontSize: 9, color: '#333', lineHeight: 1.6 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  photo:     { width: 68, height: 68, borderRadius: 4, marginLeft: 14 },
});

function ClassicPdf({ data, title, photo }: { data: any; title?: string | null; photo?: string }) {
  const info  = data.personal_info ?? {};
  const exp   = data.experience    ?? [];
  const edu   = data.education     ?? [];
  const sk    = data.skills        ?? [];
  const la    = data.languages     ?? [];
  const ce    = data.certifications ?? [];

  return (
    <Document>
      <Page size="A4" style={CL.page}>
        <View style={CL.header}>
          <View style={CL.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={CL.name}>{fullName(info, title)}</Text>
              <View style={CL.contacts}>
                {contactParts(info).map((c, i) => <Text key={i} style={CL.contact}>{c}</Text>)}
              </View>
            </View>
            {photo ? <PhotoRect src={photo} w={68} h={68} radius={4} /> : null}
          </View>
        </View>
        <View style={CL.rule} />

        {info.summary ? (
          <View style={CL.section}>
            <Text style={CL.secTitle}>Profile</Text>
            <View style={CL.thinRule} />
            <Text style={CL.summary}>{info.summary}</Text>
          </View>
        ) : null}

        {hasList(exp) ? (
          <View style={CL.section}>
            <Text style={CL.secTitle}>Experience</Text>
            <View style={CL.thinRule} />
            {exp.map((e: any, i: number) => (
              <View key={i} style={CL.entry}>
                <View style={CL.row}>
                  <Text style={CL.bold}>{e.title || 'Role'}{e.company ? ` — ${e.company}` : ''}</Text>
                  <Text style={CL.dates}>{dateRange(e)}</Text>
                </View>
                {e.description ? <Text style={CL.desc}>{e.description}</Text> : null}
              </View>
            ))}
          </View>
        ) : null}

        {hasList(edu) ? (
          <View style={CL.section}>
            <Text style={CL.secTitle}>Education</Text>
            <View style={CL.thinRule} />
            {edu.map((e: any, i: number) => (
              <View key={i} style={CL.entry}>
                <Text style={CL.bold}>{e.degree || 'Degree'}</Text>
                {e.institution ? <Text style={CL.sub}>{e.institution}</Text> : null}
              </View>
            ))}
          </View>
        ) : null}

        {hasList(sk) ? (
          <View style={CL.section}>
            <Text style={CL.secTitle}>Skills</Text>
            <View style={CL.thinRule} />
            <SkillBars skills={sk} barColor="#111" />
          </View>
        ) : null}

        {(hasList(la) || hasList(ce)) ? (
          <View style={{ flexDirection: 'row' }}>
            {hasList(la) ? (
              <View style={[CL.section, { flex: 1, marginRight: 20 }]}>
                <Text style={CL.secTitle}>Languages</Text>
                <View style={CL.thinRule} />
                <Text style={CL.misc}>{la.map(langName).filter(Boolean).join('  ·  ')}</Text>
              </View>
            ) : null}
            {hasList(ce) ? (
              <View style={[CL.section, { flex: 1 }]}>
                <Text style={CL.secTitle}>Certifications</Text>
                <View style={CL.thinRule} />
                <Text style={CL.misc}>{ce.map(certName).filter(Boolean).join('  ·  ')}</Text>
              </View>
            ) : null}
          </View>
        ) : null}
      </Page>
    </Document>
  );
}


const MO = StyleSheet.create({
  page:    { fontFamily: 'DejaVu Sans', flexDirection: 'row', backgroundColor: '#fff' },
  sidebar: { width: '33%', backgroundColor: '#1e293b', padding: 26 },
  main:    { width: '67%', padding: 28 },
  sName:   { fontSize: 16, fontFamily: 'DejaVu Sans', fontWeight: 'bold', color: '#fff', marginBottom: 3 },
  sRole:   { fontSize: 8.5, color: '#94a3b8', marginBottom: 20, lineHeight: 1.4 },
  sSecT:   { fontSize: 7, fontFamily: 'DejaVu Sans', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase',
             letterSpacing: 1.5, marginBottom: 6 },
  sSec:    { marginBottom: 16 },
  sCon:    { fontSize: 8.5, color: '#cbd5e1', marginBottom: 4, lineHeight: 1.4 },
  sSumm:   { fontSize: 8.5, color: '#94a3b8', lineHeight: 1.55 },
  sWrap:   { flexDirection: 'row', flexWrap: 'wrap' },
  sSkill:  { fontSize: 7.5, color: '#e2e8f0', backgroundColor: '#334155',
             paddingHorizontal: 5, paddingVertical: 2, marginRight: 4, marginBottom: 4 },
  photo:   { width: 72, height: 72, borderRadius: 36, marginBottom: 16, alignSelf: 'center' },
  mSecT:   { fontSize: 7.5, fontFamily: 'DejaVu Sans', fontWeight: 'bold', color: '#4f46e5', textTransform: 'uppercase',
             letterSpacing: 1.5, marginBottom: 7, borderBottomWidth: 0.5,
             borderBottomColor: '#e0e7ff', paddingBottom: 4 },
  mSec:    { marginBottom: 14 },
  mEntry:  { marginBottom: 8 },
  mRow:    { flexDirection: 'row', justifyContent: 'space-between' },
  mBold:   { fontSize: 9.5, fontFamily: 'DejaVu Sans', fontWeight: 'bold', color: '#111827' },
  mSub:    { fontSize: 8.5, color: '#6b7280', marginTop: 1 },
  mDates:  { fontSize: 8, color: '#9ca3af' },
  mDesc:   { fontSize: 8.5, color: '#374151', lineHeight: 1.55, marginTop: 3 },
});

function ModernPdf({ data, title, photo }: { data: any; title?: string | null; photo?: string }) {
  const info = data.personal_info ?? {};
  const exp  = data.experience    ?? [];
  const edu  = data.education     ?? [];
  const sk   = data.skills        ?? [];
  const la   = data.languages     ?? [];
  const ce   = data.certifications ?? [];

  const photoExtra  = photo ? 88 : 0;
  const effectiveN  = sk.length + Math.round(photoExtra / 17);
  const useChips    = effectiveN > 10;
  const usePlainText = sk.length > 22;
  const itemMb  = sk.length > 9 ? 3 : 6;
  const labelFs = sk.length > 9 ? 7 : 8;
  const secMb   = effectiveN > 14 ? 8 : effectiveN > 10 ? 10 : 16;

  return (
    <Document>
      <Page size="A4" style={MO.page}>
        <View style={MO.sidebar}>
          {photo ? <View style={{ alignSelf: 'center', marginBottom: 16 }}><PhotoCircle src={photo} size={72} /></View> : null}
          <Text style={MO.sName}>{fullName(info, title)}</Text>
          {title ? <Text style={MO.sRole}>{title}</Text> : null}

          <View style={[MO.sSec, { marginBottom: secMb }]}>
            <Text style={MO.sSecT}>Contact</Text>
            {contactParts(info).map((c, i) => <Text key={i} style={MO.sCon}>{c}</Text>)}
          </View>

          {info.summary ? (
            <View style={[MO.sSec, { marginBottom: secMb }]}>
              <Text style={MO.sSecT}>Profile</Text>
              <Text style={MO.sSumm}>{info.summary}</Text>
            </View>
          ) : null}

          {hasList(sk) ? (
            <View style={[MO.sSec, { marginBottom: secMb }]}>
              <Text style={MO.sSecT}>Skills</Text>
              {usePlainText ? (
                <Text style={{ fontSize: 7.5, color: '#e2e8f0', lineHeight: 1.5 }}>
                  {sk.map(skillName).filter(Boolean).join('  ·  ')}
                </Text>
              ) : useChips ? (
                <View style={MO.sWrap}>
                  {sk.map((s: any, i: number) => (
                    <Text key={i} style={MO.sSkill}>{skillName(s)}</Text>
                  ))}
                </View>
              ) : (
                <SkillBars skills={sk} barColor="#e2e8f0" itemMb={itemMb} labelFs={labelFs} />
              )}
            </View>
          ) : null}

          {hasList(la) ? (
            <View style={[MO.sSec, { marginBottom: secMb }]}>
              <Text style={MO.sSecT}>Languages</Text>
              <Text style={MO.sSumm}>{la.map(langName).filter(Boolean).join('\n')}</Text>
            </View>
          ) : null}
        </View>

        <View style={MO.main}>
          {hasList(exp) ? (
            <View style={MO.mSec}>
              <Text style={MO.mSecT}>Experience</Text>
              {exp.map((e: any, i: number) => (
                <View key={i} style={MO.mEntry}>
                  <View style={MO.mRow}>
                    <Text style={MO.mBold}>{e.title || 'Role'}</Text>
                    <Text style={MO.mDates}>{dateRange(e)}</Text>
                  </View>
                  {e.company ? <Text style={MO.mSub}>{e.company}</Text> : null}
                  {e.description ? <Text style={MO.mDesc}>{e.description}</Text> : null}
                </View>
              ))}
            </View>
          ) : null}

          {hasList(edu) ? (
            <View style={MO.mSec}>
              <Text style={MO.mSecT}>Education</Text>
              {edu.map((e: any, i: number) => (
                <View key={i} style={MO.mEntry}>
                  <Text style={MO.mBold}>{e.degree || 'Degree'}</Text>
                  {e.institution ? <Text style={MO.mSub}>{e.institution}</Text> : null}
                </View>
              ))}
            </View>
          ) : null}

          {hasList(ce) ? (
            <View style={MO.mSec}>
              <Text style={MO.mSecT}>Certifications</Text>
              {ce.map((c: any, i: number) => (
                <View key={i} style={MO.mEntry}>
                  <Text style={MO.mBold}>{certName(c)}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      </Page>
    </Document>
  );
}


const MI = StyleSheet.create({
  page:    { padding: '48 52 48 52', fontFamily: 'DejaVu Sans', backgroundColor: '#fff' },
  header:  { alignItems: 'center', marginBottom: 22 },
  name:    { fontSize: 26, fontFamily: 'DejaVu Sans', fontWeight: 'bold', color: '#111', marginBottom: 5 },
  cons:    { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
  con:     { fontSize: 8.5, color: '#777', marginHorizontal: 7 },
  rule:    { borderBottomWidth: 0.5, borderBottomColor: '#ddd', marginBottom: 18 },
  sec:     { marginBottom: 16 },
  secT:    { fontSize: 7.5, fontFamily: 'DejaVu Sans', fontWeight: 'bold', textTransform: 'uppercase',
             letterSpacing: 2.5, color: '#999', marginBottom: 9 },
  entry:   { marginBottom: 9 },
  row:     { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  bold:    { fontSize: 10, fontFamily: 'DejaVu Sans', fontWeight: 'bold', color: '#111' },
  sub:     { fontSize: 9, color: '#666' },
  dates:   { fontSize: 8.5, color: '#aaa' },
  desc:    { fontSize: 9, color: '#444', lineHeight: 1.65, marginTop: 3 },
  summary: { fontSize: 10, color: '#444', lineHeight: 1.7, textAlign: 'center' },
  skills:  { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
  skill:   { fontSize: 8.5, color: '#555', marginHorizontal: 6, marginBottom: 4 },
  misc:    { fontSize: 9, color: '#555', lineHeight: 1.7 },
  photo:   { width: 72, height: 72, borderRadius: 36, marginBottom: 12 },
});

function MinimalPdf({ data, title }: { data: any; title?: string | null; photo?: string }) {
  const info = data.personal_info ?? {};
  const exp  = data.experience    ?? [];
  const edu  = data.education     ?? [];
  const sk   = data.skills        ?? [];
  const la   = data.languages     ?? [];
  const ce   = data.certifications ?? [];

  return (
    <Document>
      <Page size="A4" style={MI.page}>
        <View style={MI.header}>
          <Text style={MI.name}>{fullName(info, title)}</Text>
          <View style={MI.cons}>
            {contactParts(info).map((c, i) => <Text key={i} style={MI.con}>{c}</Text>)}
          </View>
        </View>
        <View style={MI.rule} />

        {info.summary ? (
          <View style={MI.sec}>
            <Text style={MI.secT}>About</Text>
            <Text style={MI.summary}>{info.summary}</Text>
          </View>
        ) : null}

        {hasList(exp) ? (
          <View style={MI.sec}>
            <Text style={MI.secT}>Experience</Text>
            {exp.map((e: any, i: number) => (
              <View key={i} style={MI.entry}>
                <View style={MI.row}>
                  <Text style={MI.bold}>{e.title || 'Role'}{e.company ? `, ${e.company}` : ''}</Text>
                  <Text style={MI.dates}>{dateRange(e)}</Text>
                </View>
                {e.description ? <Text style={MI.desc}>{e.description}</Text> : null}
              </View>
            ))}
          </View>
        ) : null}

        {hasList(edu) ? (
          <View style={MI.sec}>
            <Text style={MI.secT}>Education</Text>
            {edu.map((e: any, i: number) => (
              <View key={i} style={MI.entry}>
                <Text style={MI.bold}>{e.degree || 'Degree'}</Text>
                {e.institution ? <Text style={MI.sub}>{e.institution}</Text> : null}
              </View>
            ))}
          </View>
        ) : null}

        {hasList(sk) ? (
          <View style={MI.sec}>
            <Text style={MI.secT}>Skills</Text>
            <SkillBars skills={sk} barColor="#555" />
          </View>
        ) : null}

        {(hasList(la) || hasList(ce)) ? (
          <View style={{ flexDirection: 'row' }}>
            {hasList(la) ? (
              <View style={[MI.sec, { flex: 1, marginRight: 24 }]}>
                <Text style={MI.secT}>Languages</Text>
                <Text style={MI.misc}>{la.map(langName).filter(Boolean).join('  ·  ')}</Text>
              </View>
            ) : null}
            {hasList(ce) ? (
              <View style={[MI.sec, { flex: 1 }]}>
                <Text style={MI.secT}>Certifications</Text>
                <Text style={MI.misc}>{ce.map(certName).filter(Boolean).join('  ·  ')}</Text>
              </View>
            ) : null}
          </View>
        ) : null}
      </Page>
    </Document>
  );
}


const RE = StyleSheet.create({
  page:    { padding: '36 40 36 40', fontFamily: 'DejaVu Sans', backgroundColor: '#fff' },
  topBand: { backgroundColor: '#1a3a5c', padding: '18 20 14 20', marginBottom: 14 },
  name:    { fontSize: 20, fontFamily: 'DejaVu Sans', fontWeight: 'bold', color: '#fff', marginBottom: 3 },
  cons:    { flexDirection: 'row', flexWrap: 'wrap' },
  con:     { fontSize: 8, color: '#93c5fd', marginRight: 14, marginBottom: 2 },
  body:    { flexDirection: 'row' },
  left:    { width: '36%', paddingRight: 16 },
  right:   { width: '64%', paddingLeft: 16, borderLeftWidth: 0.5, borderLeftColor: '#e5e7eb' },
  secT:    { fontSize: 7.5, fontFamily: 'DejaVu Sans', fontWeight: 'bold', textTransform: 'uppercase',
             letterSpacing: 1.6, color: '#1a3a5c', marginBottom: 6, borderBottomWidth: 1,
             borderBottomColor: '#1a3a5c', paddingBottom: 3 },
  sec:     { marginBottom: 14 },
  entry:   { marginBottom: 7 },
  row:     { flexDirection: 'row', justifyContent: 'space-between' },
  bold:    { fontSize: 9, fontFamily: 'DejaVu Sans', fontWeight: 'bold', color: '#111' },
  sub:     { fontSize: 8, color: '#6b7280', marginTop: 1 },
  dates:   { fontSize: 7.5, color: '#9ca3af' },
  desc:    { fontSize: 8, color: '#374151', lineHeight: 1.55, marginTop: 3 },
  summ:    { fontSize: 8.5, color: '#374151', lineHeight: 1.6 },
  skills:  { flexDirection: 'row', flexWrap: 'wrap' },
  skill:   { fontSize: 7.5, color: '#1a3a5c', borderWidth: 0.5, borderColor: '#93c5fd',
             paddingHorizontal: 5, paddingVertical: 2, marginRight: 4, marginBottom: 4 },
  misc:    { fontSize: 8, color: '#374151', lineHeight: 1.65 },
  photo:   { width: 72, height: 72, borderRadius: 4, marginBottom: 10, alignSelf: 'center' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
});

function ResearcherPdf({ data, title, photo }: { data: any; title?: string | null; photo?: string }) {
  const info = data.personal_info ?? {};
  const exp  = data.experience    ?? [];
  const edu  = data.education     ?? [];
  const sk   = data.skills        ?? [];
  const la   = data.languages     ?? [];
  const ce   = data.certifications ?? [];

  return (
    <Document>
      <Page size="A4" style={RE.page}>
        <View style={RE.topBand}>
          <View style={RE.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={RE.name}>{fullName(info, title)}</Text>
              <View style={RE.cons}>
                {contactParts(info).map((c, i) => <Text key={i} style={RE.con}>{c}</Text>)}
              </View>
            </View>
            {photo ? <View style={{ marginLeft: 14 }}><PhotoRect src={photo} w={72} h={72} radius={4} /></View> : null}
          </View>
        </View>

        <View style={RE.body}>
          <View style={RE.left}>
            {info.summary ? (
              <View style={RE.sec}>
                <Text style={RE.secT}>Profile</Text>
                <Text style={RE.summ}>{info.summary}</Text>
              </View>
            ) : null}

            {hasList(edu) ? (
              <View style={RE.sec}>
                <Text style={RE.secT}>Education</Text>
                {edu.map((e: any, i: number) => (
                  <View key={i} style={RE.entry}>
                    <Text style={RE.bold}>{e.degree || 'Degree'}</Text>
                    {e.institution ? <Text style={RE.sub}>{e.institution}</Text> : null}
                  </View>
                ))}
              </View>
            ) : null}

            {hasList(sk) ? (
              <View style={RE.sec}>
                <Text style={RE.secT}>Skills</Text>
                <SkillBars skills={sk} barColor="#1a3a5c" />
              </View>
            ) : null}

            {hasList(la) ? (
              <View style={RE.sec}>
                <Text style={RE.secT}>Languages</Text>
                <Text style={RE.misc}>{la.map(langName).filter(Boolean).join('\n')}</Text>
              </View>
            ) : null}

            {hasList(ce) ? (
              <View style={RE.sec}>
                <Text style={RE.secT}>Certifications</Text>
                <Text style={RE.misc}>{ce.map(certName).filter(Boolean).join('\n')}</Text>
              </View>
            ) : null}
          </View>

          <View style={RE.right}>
            {hasList(exp) ? (
              <View style={RE.sec}>
                <Text style={RE.secT}>Experience</Text>
                {exp.map((e: any, i: number) => (
                  <View key={i} style={RE.entry}>
                    <View style={RE.row}>
                      <Text style={RE.bold}>{e.title || 'Role'}{e.company ? ` — ${e.company}` : ''}</Text>
                      <Text style={RE.dates}>{dateRange(e)}</Text>
                    </View>
                    {e.description ? <Text style={RE.desc}>{e.description}</Text> : null}
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        </View>
      </Page>
    </Document>
  );
}


const FR = StyleSheet.create({
  page:     { fontFamily: 'DejaVu Sans', flexDirection: 'row', backgroundColor: '#fff' },
  strip:    { width: '30%', backgroundColor: '#2d2d2d', padding: 24 },
  body:     { width: '70%', padding: '28 28 28 24' },
  sName:    { fontSize: 17, fontFamily: 'DejaVu Sans', fontWeight: 'bold', color: '#fff', lineHeight: 1.3 },
  sRole:    { fontSize: 8.5, color: '#aaa', marginTop: 3, marginBottom: 18, lineHeight: 1.4 },
  sSecT:    { fontSize: 7, fontFamily: 'DejaVu Sans', fontWeight: 'bold', color: '#888', textTransform: 'uppercase',
              letterSpacing: 1.5, marginBottom: 6 },
  sSec:     { marginBottom: 16 },
  sCon:     { fontSize: 8, color: '#ccc', marginBottom: 4, lineHeight: 1.4 },
  sSumm:    { fontSize: 8, color: '#bbb', lineHeight: 1.55 },
  sSkillW:  { flexDirection: 'row', flexWrap: 'wrap' },
  sSkill:   { fontSize: 7.5, color: '#ddd', marginRight: 6, marginBottom: 3 },
  photo:    { width: 70, height: 70, borderRadius: 35, marginBottom: 16, alignSelf: 'center' },
  bSecT:    { fontSize: 9, fontFamily: 'DejaVu Sans', fontWeight: 'bold', color: '#e07b39',
              textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 },
  bRule:    { borderBottomWidth: 1, borderBottomColor: '#e07b39', marginBottom: 8 },
  bSec:     { marginBottom: 14 },
  bEntry:   { marginBottom: 8 },
  bRow:     { flexDirection: 'row', justifyContent: 'space-between' },
  bBold:    { fontSize: 9.5, fontFamily: 'DejaVu Sans', fontWeight: 'bold', color: '#111' },
  bSub:     { fontSize: 8.5, color: '#666', marginTop: 1 },
  bDates:   { fontSize: 8, color: '#aaa' },
  bDesc:    { fontSize: 8.5, color: '#333', lineHeight: 1.55, marginTop: 3 },
  bSumm:    { fontSize: 9, color: '#444', lineHeight: 1.6 },
});

function FriggeriFdf({ data, title, photo }: { data: any; title?: string | null; photo?: string }) {
  const info = data.personal_info ?? {};
  const exp  = data.experience    ?? [];
  const edu  = data.education     ?? [];
  const sk   = data.skills        ?? [];
  const la   = data.languages     ?? [];
  const ce   = data.certifications ?? [];

  return (
    <Document>
      <Page size="A4" style={FR.page}>
        <View style={FR.strip}>
          {photo ? <View style={{ alignSelf: 'center', marginBottom: 16 }}><PhotoCircle src={photo} size={70} /></View> : null}
          <Text style={FR.sName}>{fullName(info, title)}</Text>
          {title ? <Text style={FR.sRole}>{title}</Text> : null}

          <View style={FR.sSec}>
            <Text style={FR.sSecT}>Contact</Text>
            {contactParts(info).map((c, i) => <Text key={i} style={FR.sCon}>{c}</Text>)}
          </View>

          {hasList(sk) ? (
            <View style={FR.sSec}>
              <Text style={FR.sSecT}>Skills</Text>
              <SkillBars skills={sk} barColor="#ddd" />
            </View>
          ) : null}

          {hasList(la) ? (
            <View style={FR.sSec}>
              <Text style={FR.sSecT}>Languages</Text>
              <Text style={FR.sSumm}>{la.map(langName).filter(Boolean).join('\n')}</Text>
            </View>
          ) : null}
        </View>

        <View style={FR.body}>
          {info.summary ? (
            <View style={FR.bSec}>
              <Text style={FR.bSecT}>About Me</Text>
              <View style={FR.bRule} />
              <Text style={FR.bSumm}>{info.summary}</Text>
            </View>
          ) : null}

          {hasList(exp) ? (
            <View style={FR.bSec}>
              <Text style={FR.bSecT}>Experience</Text>
              <View style={FR.bRule} />
              {exp.map((e: any, i: number) => (
                <View key={i} style={FR.bEntry}>
                  <View style={FR.bRow}>
                    <Text style={FR.bBold}>{e.title || 'Role'}</Text>
                    <Text style={FR.bDates}>{dateRange(e)}</Text>
                  </View>
                  {e.company ? <Text style={FR.bSub}>{e.company}</Text> : null}
                  {e.description ? <Text style={FR.bDesc}>{e.description}</Text> : null}
                </View>
              ))}
            </View>
          ) : null}

          {hasList(edu) ? (
            <View style={FR.bSec}>
              <Text style={FR.bSecT}>Education</Text>
              <View style={FR.bRule} />
              {edu.map((e: any, i: number) => (
                <View key={i} style={FR.bEntry}>
                  <Text style={FR.bBold}>{e.degree || 'Degree'}</Text>
                  {e.institution ? <Text style={FR.bSub}>{e.institution}</Text> : null}
                </View>
              ))}
            </View>
          ) : null}

          {hasList(ce) ? (
            <View style={FR.bSec}>
              <Text style={FR.bSecT}>Certifications</Text>
              <View style={FR.bRule} />
              {ce.map((c: any, i: number) => (
                <View key={i} style={FR.bEntry}>
                  <Text style={FR.bBold}>{certName(c)}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      </Page>
    </Document>
  );
}



const HI = StyleSheet.create({
  page:    { padding: 0, fontFamily: 'DejaVu Sans', backgroundColor: '#fff' },
  accent:  { backgroundColor: '#0f766e', padding: '20 36 16 36' },
  name:    { fontSize: 22, fontFamily: 'DejaVu Sans', fontWeight: 'bold', color: '#fff', marginBottom: 3 },
  tagline: { fontSize: 9, color: '#99f6e4', marginBottom: 10 },
  cons:    { flexDirection: 'row', flexWrap: 'wrap' },
  con:     { fontSize: 8, color: '#ccfbf1', marginRight: 14, marginBottom: 2 },
  content: { padding: '20 36 36 36' },
  colRow:  { flexDirection: 'row' },
  left:    { width: '38%', paddingRight: 18 },
  right:   { width: '62%', paddingLeft: 18, borderLeftWidth: 0.5, borderLeftColor: '#d1fae5' },
  secT:    { fontSize: 8, fontFamily: 'DejaVu Sans', fontWeight: 'bold', color: '#0f766e', textTransform: 'uppercase',
             letterSpacing: 1.5, marginBottom: 6, marginTop: 12 },
  rule:    { borderBottomWidth: 0.5, borderBottomColor: '#d1fae5', marginBottom: 8 },
  entry:   { marginBottom: 8 },
  row:     { flexDirection: 'row', justifyContent: 'space-between' },
  bold:    { fontSize: 9.5, fontFamily: 'DejaVu Sans', fontWeight: 'bold', color: '#111' },
  sub:     { fontSize: 8.5, color: '#6b7280', marginTop: 1 },
  dates:   { fontSize: 8, color: '#9ca3af' },
  desc:    { fontSize: 8.5, color: '#374151', lineHeight: 1.55, marginTop: 3 },
  summ:    { fontSize: 9, color: '#374151', lineHeight: 1.6, marginTop: 4 },
  skills:  { flexDirection: 'row', flexWrap: 'wrap' },
  skill:   { fontSize: 7.5, backgroundColor: '#f0fdf4', color: '#065f46', borderWidth: 0.5,
             borderColor: '#a7f3d0', paddingHorizontal: 5, paddingVertical: 2,
             marginRight: 4, marginBottom: 4 },
  misc:    { fontSize: 8.5, color: '#374151', lineHeight: 1.65 },
  photo:   { width: 70, height: 70, borderRadius: 35, marginBottom: 0, marginLeft: 16 },
  accentRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
});

function HipsterPdf({ data, title, photo }: { data: any; title?: string | null; photo?: string }) {
  const info = data.personal_info ?? {};
  const exp  = data.experience    ?? [];
  const edu  = data.education     ?? [];
  const sk   = data.skills        ?? [];
  const la   = data.languages     ?? [];
  const ce   = data.certifications ?? [];

  return (
    <Document>
      <Page size="A4" style={HI.page}>
        <View style={HI.accent}>
          <View style={HI.accentRow}>
            <View style={{ flex: 1 }}>
              <Text style={HI.name}>{fullName(info, title)}</Text>
              {title ? <Text style={HI.tagline}>{title}</Text> : null}
              <View style={HI.cons}>
                {contactParts(info).map((c, i) => <Text key={i} style={HI.con}>{c}</Text>)}
              </View>
            </View>
            {photo ? <View style={{ marginLeft: 16 }}><PhotoCircle src={photo} size={70} /></View> : null}
          </View>
        </View>

        <View style={HI.content}>
          {info.summary ? (
            <Text style={HI.summ}>{info.summary}</Text>
          ) : null}

          <View style={HI.colRow}>
            <View style={HI.left}>
              {hasList(edu) ? (
                <>
                  <Text style={HI.secT}>Education</Text>
                  <View style={HI.rule} />
                  {edu.map((e: any, i: number) => (
                    <View key={i} style={HI.entry}>
                      <Text style={HI.bold}>{e.degree || 'Degree'}</Text>
                      {e.institution ? <Text style={HI.sub}>{e.institution}</Text> : null}
                    </View>
                  ))}
                </>
              ) : null}

              {hasList(sk) ? (
                <>
                  <Text style={HI.secT}>Skills</Text>
                  <View style={HI.rule} />
                  <SkillBars skills={sk} barColor="#0f766e" />
                </>
              ) : null}

              {hasList(la) ? (
                <>
                  <Text style={HI.secT}>Languages</Text>
                  <View style={HI.rule} />
                  <Text style={HI.misc}>{la.map(langName).filter(Boolean).join('\n')}</Text>
                </>
              ) : null}

              {hasList(ce) ? (
                <>
                  <Text style={HI.secT}>Certifications</Text>
                  <View style={HI.rule} />
                  <Text style={HI.misc}>{ce.map(certName).filter(Boolean).join('\n')}</Text>
                </>
              ) : null}
            </View>

            <View style={HI.right}>
              {hasList(exp) ? (
                <>
                  <Text style={HI.secT}>Experience</Text>
                  <View style={HI.rule} />
                  {exp.map((e: any, i: number) => (
                    <View key={i} style={HI.entry}>
                      <View style={HI.row}>
                        <Text style={HI.bold}>{e.title || 'Role'}</Text>
                        <Text style={HI.dates}>{dateRange(e)}</Text>
                      </View>
                      {e.company ? <Text style={HI.sub}>{e.company}</Text> : null}
                      {e.description ? <Text style={HI.desc}>{e.description}</Text> : null}
                    </View>
                  ))}
                </>
              ) : null}
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
}


function PieSkill({ pct, size = 10, fg = '#E96D1F', bg = '#4a4e68' }:
  { pct: number; size?: number; fg?: string; bg?: string }) {
  const R  = size / 2;
  const cx = R, cy = R;
  if (pct >= 100) {
    return <Svg width={size} height={size}><Circle cx={cx} cy={cy} r={R} fill={fg} /></Svg>;
  }
  if (pct <= 0) {
    return <Svg width={size} height={size}><Circle cx={cx} cy={cy} r={R} fill={bg} /></Svg>;
  }
  const angle = (pct / 100) * 360;
  const rad   = ((angle - 90) * Math.PI) / 180;
  const x     = (cx + R * Math.cos(rad)).toFixed(3);
  const y     = (cy + R * Math.sin(rad)).toFixed(3);
  const large = angle > 180 ? 1 : 0;
  return (
    <Svg width={size} height={size}>
      <Circle cx={cx} cy={cy} r={R} fill={bg} />
      <Path d={`M ${cx} 0 A ${R} ${R} 0 ${large} 1 ${x} ${y} L ${cx} ${cy} Z`} fill={fg} />
    </Svg>
  );
}

const AC = StyleSheet.create({
  page:      { fontFamily: 'DejaVu Sans', flexDirection: 'row', backgroundColor: '#fff' },
  sidebar:   { width: '32%', backgroundColor: '#2B2D42', padding: '28 16 28 18' },
  main:      { width: '68%', padding: '28 24 28 20' },

  photoWrap: { alignItems: 'center', marginBottom: 12 },
  sName:     { fontSize: 13, fontFamily: 'DejaVu Sans', fontWeight: 'bold', color: '#fff', textAlign: 'center', marginBottom: 2 },
  sTagline:  { fontSize: 7.5, color: '#94a3b8', textAlign: 'center', marginBottom: 12, lineHeight: 1.4 },
  sDivider:  { borderBottomWidth: 0.5, borderBottomColor: '#4a4e68', marginBottom: 10 },
  sSecT:     { fontSize: 7, fontFamily: 'DejaVu Sans', fontWeight: 'bold', color: '#E96D1F', textTransform: 'uppercase',
               letterSpacing: 1.5, marginBottom: 8 },
  sSec:      { marginBottom: 14 },
  sCon:      { fontSize: 7.5, color: '#cbd5e1', lineHeight: 1.5, marginBottom: 4 },
  sSkillRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  sSkillName:{ fontSize: 8, color: '#e2e8f0', flex: 1, marginLeft: 7 },
  sSumm:     { fontSize: 7.5, color: '#94a3b8', lineHeight: 1.55 },

  mName:     { fontSize: 22, fontFamily: 'DejaVu Sans', fontWeight: 'bold', color: '#2B2D42', marginBottom: 2 },
  mTagline:  { fontSize: 9.5, color: '#E96D1F', marginBottom: 16, fontFamily: 'DejaVu Sans', fontStyle: 'italic' },
  mSecT:     { fontSize: 7.5, fontFamily: 'DejaVu Sans', fontWeight: 'bold', color: '#E96D1F', textTransform: 'uppercase',
               letterSpacing: 1.5, paddingBottom: 3, borderBottomWidth: 0.75, borderBottomColor: '#E96D1F',
               marginBottom: 8 },
  mSec:      { marginBottom: 14 },
  mEntry:    { flexDirection: 'row', marginBottom: 9 },
  mDot:      { width: 8, paddingTop: 2, marginRight: 8, alignItems: 'center' },
  mContent:  { flex: 1 },
  mBold:     { fontSize: 9.5, fontFamily: 'DejaVu Sans', fontWeight: 'bold', color: '#2B2D42' },
  mSub:      { fontSize: 8.5, color: '#E96D1F', marginTop: 1 },
  mDates:    { fontSize: 7.5, color: '#94a3b8', marginTop: 1 },
  mDesc:     { fontSize: 8, color: '#475569', lineHeight: 1.55, marginTop: 3 },
  mMisc:     { fontSize: 8.5, color: '#475569', lineHeight: 1.65 },
});

function AltaCVPdf({ data, title, photo }: { data: any; title?: string | null; photo?: string }) {
  const info = data.personal_info ?? {};
  const exp  = data.experience     ?? [];
  const edu  = data.education      ?? [];
  const sk   = data.skills         ?? [];
  const la   = data.languages      ?? [];
  const ce   = data.certifications ?? [];

  const totalSkillRows = sk.length + la.length;
  const rowMb   = totalSkillRows > 18 ? 2 : totalSkillRows > 13 ? 3 : totalSkillRows > 9 ? 4 : 6;
  const rowFs   = totalSkillRows > 18 ? 6 : totalSkillRows > 13 ? 6.5 : totalSkillRows > 9 ? 7 : 8;
  const pie     = totalSkillRows > 18 ? 7 : totalSkillRows > 13 ? 8 : totalSkillRows > 9 ? 9 : 10;
  const secMb   = totalSkillRows > 13 ? 8 : totalSkillRows > 9 ? 10 : 14;

  return (
    <Document>
      <Page size="A4" style={AC.page}>

        <View style={AC.sidebar}>
          {photo ? <View style={AC.photoWrap}><PhotoCircle src={photo} size={72} /></View> : null}
          <Text style={AC.sName}>{fullName(info, title)}</Text>
          {title ? <Text style={AC.sTagline}>{title}</Text> : null}
          <View style={AC.sDivider} />

          <View style={[AC.sSec, { marginBottom: secMb }]}>
            <Text style={AC.sSecT}>Contact</Text>
            {contactParts(info).map((c, i) => <Text key={i} style={AC.sCon}>{c}</Text>)}
          </View>

          {info.summary ? (
            <View style={[AC.sSec, { marginBottom: secMb }]}>
              <Text style={AC.sSecT}>Profile</Text>
              <View style={AC.sDivider} />
              <Text style={AC.sSumm}>{info.summary}</Text>
            </View>
          ) : null}

          {hasList(sk) ? (
            <View style={[AC.sSec, { marginBottom: secMb }]}>
              <Text style={AC.sSecT}>Skills</Text>
              <View style={AC.sDivider} />
              {sk.map((s: any, i: number) => (
                <View key={i} style={[AC.sSkillRow, { marginBottom: rowMb }]}>
                  <PieSkill pct={skillLevel(s) ?? 70} size={pie} />
                  <Text style={[AC.sSkillName, { fontSize: rowFs }]}>{skillName(s)}</Text>
                </View>
              ))}
            </View>
          ) : null}

          {hasList(la) ? (
            <View style={[AC.sSec, { marginBottom: secMb }]}>
              <Text style={AC.sSecT}>Languages</Text>
              <View style={AC.sDivider} />
              {la.map((l: any, i: number) => (
                <View key={i} style={[AC.sSkillRow, { marginBottom: rowMb }]}>
                  <PieSkill pct={skillLevel(l) ?? 80} size={pie} />
                  <Text style={[AC.sSkillName, { fontSize: rowFs }]}>{langName(l)}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>

        <View style={AC.main}>
          <Text style={AC.mName}>{fullName(info, title)}</Text>
          {title ? <Text style={AC.mTagline}>{title}</Text> : null}

          {hasList(exp) ? (
            <View style={AC.mSec}>
              <Text style={AC.mSecT}>Experience</Text>
              {exp.map((e: any, i: number) => (
                <View key={i} style={AC.mEntry}>
                  <View style={AC.mDot}>
                    <Svg width={7} height={7}><Circle cx={3.5} cy={3.5} r={3} fill="#E96D1F" /></Svg>
                  </View>
                  <View style={AC.mContent}>
                    <Text style={AC.mBold}>{e.title || 'Role'}</Text>
                    {e.company ? <Text style={AC.mSub}>{e.company}</Text> : null}
                    {(e.start_date || e.end_date) ? <Text style={AC.mDates}>{dateRange(e)}</Text> : null}
                    {e.description ? <Text style={AC.mDesc}>{e.description}</Text> : null}
                  </View>
                </View>
              ))}
            </View>
          ) : null}

          {hasList(edu) ? (
            <View style={AC.mSec}>
              <Text style={AC.mSecT}>Education</Text>
              {edu.map((e: any, i: number) => (
                <View key={i} style={AC.mEntry}>
                  <View style={AC.mDot}>
                    <Svg width={7} height={7}><Circle cx={3.5} cy={3.5} r={3} fill="#E96D1F" /></Svg>
                  </View>
                  <View style={AC.mContent}>
                    <Text style={AC.mBold}>{e.degree || 'Degree'}</Text>
                    {e.institution ? <Text style={AC.mSub}>{e.institution}</Text> : null}
                    {(e.start_date || e.end_date) ? <Text style={AC.mDates}>{dateRange(e)}</Text> : null}
                  </View>
                </View>
              ))}
            </View>
          ) : null}

          {hasList(ce) ? (
            <View style={AC.mSec}>
              <Text style={AC.mSecT}>Certifications</Text>
              {ce.map((c: any, i: number) => (
                <View key={i} style={AC.mEntry}>
                  <View style={AC.mDot}>
                    <Svg width={7} height={7}><Circle cx={3.5} cy={3.5} r={3} fill="#E96D1F" /></Svg>
                  </View>
                  <View style={AC.mContent}>
                    <Text style={AC.mBold}>{certName(c)}</Text>
                  </View>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      </Page>
    </Document>
  );
}


export type TemplateId = 'classic' | 'modern' | 'minimal' | 'researcher' | 'friggeri' | 'hipster' | 'altacv';

export const TEMPLATES: {
  id: TemplateId;
  label: string;
  description: string;
  supportsPhoto: boolean;
}[] = [
  { id: 'classic',    label: 'Classic',       supportsPhoto: true, description: 'Traditional single-column with name top-left, section rules, tags for skills.' },
  { id: 'modern',     label: 'Modern Sidebar', supportsPhoto: true, description: 'Dark sidebar for contact & skills; indigo-accented main column for experience.' },
  { id: 'minimal',    label: 'Minimal',        supportsPhoto: false, description: 'Centered header with generous whitespace — content-first, zero decoration.' },
  { id: 'researcher', label: 'Researcher',     supportsPhoto: true, description: 'Navy banner header, two-column body: meta/education left, experience right.' },
  { id: 'friggeri',   label: 'Friggeri',       supportsPhoto: true, description: 'Charcoal sidebar, orange section accents — bold creative professional style.' },
  { id: 'hipster',    label: 'Hipster',        supportsPhoto: true, description: 'Teal accent band, two-column body with skill chips — modern and approachable.' },
  { id: 'altacv',     label: 'AltaCV',         supportsPhoto: true, description: 'Dark sidebar with pie-chart skill indicators, orange accents and timeline dots.' },
];


export async function generateResumePdfBlob(
  templateId: TemplateId,
  resumeData: any,
  title?: string | null,
  photo?: string,
): Promise<Blob> {
  const props = { data: resumeData, title, photo };
  const doc =
    templateId === 'classic'    ? <ClassicPdf    {...props} /> :
    templateId === 'modern'     ? <ModernPdf     {...props} /> :
    templateId === 'researcher' ? <ResearcherPdf {...props} /> :
    templateId === 'friggeri'   ? <FriggeriFdf   {...props} /> :
    templateId === 'hipster'    ? <HipsterPdf    {...props} /> :
    templateId === 'altacv'     ? <AltaCVPdf     {...props} /> :
                                  <MinimalPdf    {...props} />;
  return pdf(doc).toBlob();
}

export async function downloadResumePdf(
  templateId: TemplateId,
  resumeData: any,
  title?: string | null,
  photo?: string,
) {
  const props = { data: resumeData, title, photo };
  const doc =
    templateId === 'classic'    ? <ClassicPdf    {...props} /> :
    templateId === 'modern'     ? <ModernPdf     {...props} /> :
    templateId === 'researcher' ? <ResearcherPdf {...props} /> :
    templateId === 'friggeri'   ? <FriggeriFdf   {...props} /> :
    templateId === 'hipster'    ? <HipsterPdf    {...props} /> :
    templateId === 'altacv'     ? <AltaCVPdf     {...props} /> :
                                  <MinimalPdf    {...props} />;

  const blob = await pdf(doc).toBlob();
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `${title || 'resume'}.pdf`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
