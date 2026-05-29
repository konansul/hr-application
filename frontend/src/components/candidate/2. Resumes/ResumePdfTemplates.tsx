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

// ── Description parser ────────────────────────────────────────────────────────
// PDF parsers insert \n at every visual line break. This normalises the text:
// • consecutive non-bullet lines after a bullet are merged into that bullet
// • single \n in prose are joined with a space; \n\n creates a paragraph break

function parsePdfText(raw: string): { bullet: boolean; text: string }[] {
  const lines = raw.split('\n');
  const hasBullets = lines.some(l => l.trimStart().startsWith('• '));
  if (hasBullets) {
    const groups: { bullet: boolean; text: string }[] = [];
    for (const line of lines.filter(l => l.trim() !== '')) {
      if (line.trimStart().startsWith('• ')) {
        groups.push({ bullet: true, text: line.trimStart().slice(2).trim() });
      } else if (groups.length > 0) {
        groups[groups.length - 1].text += ' ' + line.trim();
      } else {
        groups.push({ bullet: false, text: line.trim() });
      }
    }
    return groups;
  }
  const paras = raw.split(/\n{2,}/)
    .map(p => p.replace(/\n/g, ' ').replace(/  +/g, ' ').trim())
    .filter(Boolean);
  return paras.map(t => ({ bullet: false, text: t }));
}

function PdfDescription({ text, textStyle, dotColor = '#555', bulletGap = 2 }: {
  text: string; textStyle: object; dotColor?: string; bulletGap?: number;
}) {
  const items = parsePdfText(text);
  const hasBullets = items.some(it => it.bullet);
  if (!hasBullets) {
    return (
      <View>
        {items.map((it, i) => (
          <Text key={i} style={[textStyle, { textAlign: 'justify', marginTop: i > 0 ? 4 : 0 }]}>
            {it.text}
          </Text>
        ))}
      </View>
    );
  }
  return (
    <View>
      {items.map((it, i) => (
        it.bullet ? (
          <View key={i} style={{ flexDirection: 'row', marginBottom: bulletGap, marginTop: i === 0 ? 0 : bulletGap }}>
            <Text style={[textStyle, { width: 10, color: dotColor }]}>•</Text>
            <Text style={[textStyle, { flex: 1, textAlign: 'justify' }]}>{it.text}</Text>
          </View>
        ) : (
          <Text key={i} style={[textStyle, { textAlign: 'justify', marginBottom: 4 }]}>{it.text}</Text>
        )
      ))}
    </View>
  );
}

function clean(v: any): string {
  const s = typeof v === 'string' ? v.trim() : '';
  return (!s || s === 'UNKNOWN') ? '' : s;
}

function eduLabel(e: any): string {
  return [clean(e.degree), clean(e.field_of_study)].filter(Boolean).join(' in ');
}

const skillName = (s: any) => { const n = typeof s === 'string' ? s : (s?.name || ''); return clean(n); };
const langName  = (l: any) => { const n = typeof l === 'string' ? l : (l?.name || l?.language || ''); return clean(n); };
const certName  = (c: any) => { const n = typeof c === 'string' ? c : (c?.name || c?.title || ''); return clean(n); };

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

function dateRange(e: any, present = 'Present') {
  if (!e.start_date && !e.end_date) return '';
  return `${e.start_date || ''}${e.end_date ? ` – ${e.end_date}` : e.start_date ? ` – ${present}` : ''}`;
}

function hasList(arr: any[]) { return arr && arr.length > 0; }

// Each leading newline in a description = 5pt of extra gap before the text.
// This lets users press Enter at the start of a description in the live editor
// to push the text down, and have that space appear identically in the PDF.
function leadingGap(raw: string): { gap: number; text: string } {
  const m = raw.match(/^\n+/);
  if (!m) return { gap: 0, text: raw };
  return { gap: m[0].length * 5, text: raw.slice(m[0].length) };
}

function shortContact(s: string, max = 34): string {
  if (!s || s.length <= max) return s;
  if (s.startsWith('http')) {
    try {
      const url = new URL(s);
      const path = url.pathname.length > 16 ? url.pathname.slice(0, 14) + '…' : url.pathname;
      return url.hostname + path;
    } catch { /* fall through */ }
  }
  return s.slice(0, max - 1) + '…';
}

const PDF_LABELS: Record<string, {
  profile: string; about: string; aboutMe: string; contact: string;
  experience: string; education: string; skills: string;
  languages: string; certifications: string; references: string;
  referencesNote: string; present: string;
}> = {
  en: { profile:'Profile', about:'About', aboutMe:'About Me', contact:'Contact', experience:'Experience', education:'Education', skills:'Skills', languages:'Languages', certifications:'Certifications', references:'References', referencesNote:'References available upon request', present:'Present' },
  ru: { profile:'Профиль', about:'О себе', aboutMe:'Обо мне', contact:'Контакты', experience:'Опыт работы', education:'Образование', skills:'Навыки', languages:'Языки', certifications:'Сертификаты', references:'Рекомендации', referencesNote:'Рекомендации предоставляются по запросу', present:'н.в.' },
  de: { profile:'Profil', about:'Über mich', aboutMe:'Über mich', contact:'Kontakt', experience:'Berufserfahrung', education:'Ausbildung', skills:'Fähigkeiten', languages:'Sprachen', certifications:'Zertifikate', references:'Referenzen', referencesNote:'Referenzen auf Anfrage erhältlich', present:'heute' },
  fr: { profile:'Profil', about:'À propos', aboutMe:'À propos de moi', contact:'Contact', experience:'Expérience', education:'Formation', skills:'Compétences', languages:'Langues', certifications:'Certifications', references:'Références', referencesNote:'Références disponibles sur demande', present:'présent' },
  es: { profile:'Perfil', about:'Sobre mí', aboutMe:'Sobre mí', contact:'Contacto', experience:'Experiencia', education:'Educación', skills:'Habilidades', languages:'Idiomas', certifications:'Certificaciones', references:'Referencias', referencesNote:'Referencias disponibles a solicitud', present:'actualidad' },
  tr: { profile:'Profil', about:'Hakkımda', aboutMe:'Hakkımda', contact:'İletişim', experience:'Deneyim', education:'Eğitim', skills:'Beceriler', languages:'Diller', certifications:'Sertifikalar', references:'Referanslar', referencesNote:'Referanslar talep üzerine sunulur', present:'Günümüz' },
  pl: { profile:'Profil', about:'O mnie', aboutMe:'O mnie', contact:'Kontakt', experience:'Doświadczenie', education:'Wykształcenie', skills:'Umiejętności', languages:'Języki', certifications:'Certyfikaty', references:'Referencje', referencesNote:'Referencje dostępne na żądanie', present:'obecnie' },
  pt: { profile:'Perfil', about:'Sobre mim', aboutMe:'Sobre mim', contact:'Contato', experience:'Experiência', education:'Educação', skills:'Habilidades', languages:'Idiomas', certifications:'Certificações', references:'Referências', referencesNote:'Referências disponíveis mediante solicitação', present:'presente' },
  it: { profile:'Profilo', about:'Chi sono', aboutMe:'Chi sono', contact:'Contatto', experience:'Esperienza', education:'Istruzione', skills:'Competenze', languages:'Lingue', certifications:'Certificazioni', references:'Referenze', referencesNote:'Referenze disponibili su richiesta', present:'presente' },
  ar: { profile:'الملف الشخصي', about:'عني', aboutMe:'عني', contact:'التواصل', experience:'الخبرة', education:'التعليم', skills:'المهارات', languages:'اللغات', certifications:'الشهادات', references:'المراجع', referencesNote:'المراجع متاحة عند الطلب', present:'الحاضر' },
  zh: { profile:'个人简介', about:'关于我', aboutMe:'关于我', contact:'联系方式', experience:'工作经历', education:'教育背景', skills:'技能', languages:'语言', certifications:'证书', references:'推荐人', referencesNote:'推荐信可应要求提供', present:'至今' },
  ja: { profile:'プロフィール', about:'自己紹介', aboutMe:'自己紹介', contact:'連絡先', experience:'職歴', education:'学歴', skills:'スキル', languages:'語学', certifications:'資格・認定', references:'参照', referencesNote:'推薦状は要請に応じて提供可能', present:'現在' },
  ko: { profile:'프로필', about:'소개', aboutMe:'자기소개', contact:'연락처', experience:'경력', education:'학력', skills:'기술', languages:'언어', certifications:'자격증', references:'추천인', referencesNote:'추천서는 요청 시 제공 가능', present:'현재' },
  nl: { profile:'Profiel', about:'Over mij', aboutMe:'Over mij', contact:'Contact', experience:'Ervaring', education:'Opleiding', skills:'Vaardigheden', languages:'Talen', certifications:'Certificaten', references:'Referenties', referencesNote:'Referenties beschikbaar op verzoek', present:'heden' },
  sv: { profile:'Profil', about:'Om mig', aboutMe:'Om mig', contact:'Kontakt', experience:'Erfarenhet', education:'Utbildning', skills:'Färdigheter', languages:'Språk', certifications:'Certifieringar', references:'Referenser', referencesNote:'Referenser tillgängliga på begäran', present:'nuvarande' },
};

export function getPdfLabels(lang?: string) {
  return PDF_LABELS[lang ?? 'en'] ?? PDF_LABELS['en'];
}

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

function SkillBars({ skills, barColor = '#111', chipStyle, defaultLevel, itemMb = 6, labelFs = 8, textColor = '#333', trackColor = '#e5e7eb' }: {
  skills: any[]; barColor?: string; chipStyle?: object; defaultLevel?: number; itemMb?: number; labelFs?: number; textColor?: string; trackColor?: string;
}) {
  const withLevel = skills.filter(s => skillLevel(s) !== null);
  // Always render as chips. If levels are present, show a progress bar per skill.
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
              <Text style={{ fontSize: labelFs, color: textColor }}>{skillName(s)}</Text>
            </View>
            <View style={{ height: 3, backgroundColor: trackColor, borderRadius: 2 }}>
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
  entry:     { marginBottom: 18, paddingBottom: 6 },
  row:       { flexDirection: 'row', justifyContent: 'space-between' },
  bold:      { fontFamily: 'DejaVu Sans', fontWeight: 'bold', fontSize: 9.5, color: '#111', flex: 1, paddingRight: 8 },
  sub:       { fontSize: 8.5, color: '#555', marginTop: 1 },
  dates:     { fontSize: 8, color: '#888', textAlign: 'right', flexShrink: 0 },
  desc:      { fontSize: 8.5, color: '#333', lineHeight: 1.65, marginTop: 4 },
  summary:   { fontSize: 9.5, color: '#333', lineHeight: 1.7, textAlign: 'justify' },
  skills:    { flexDirection: 'row', flexWrap: 'wrap' },
  skill:     { fontSize: 8.5, backgroundColor: '#f0f0f0', paddingHorizontal: 7,
               paddingVertical: 3, marginRight: 5, marginBottom: 4 },
  misc:      { fontSize: 9, color: '#333', lineHeight: 1.6 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  photo:     { width: 68, height: 68, borderRadius: 4, marginLeft: 14 },
});

function ClassicPdf({ data, title, photo, language, accentColor, entrySpacing }: { data: any; title?: string | null; photo?: string; language?: string; accentColor?: string; entrySpacing?: number }) {
  const info  = data.personal_info ?? {};
  const exp   = data.experience    ?? [];
  const edu   = data.education     ?? [];
  const sk    = data.skills        ?? [];
  const la    = data.languages     ?? [];
  const ce    = data.certifications ?? [];
  const L = getPdfLabels(language);
  const ac = accentColor ?? '#111';
  const extraSpacing = entrySpacing ?? data._formatting?.entrySpacing ?? 0;

  return (
    <Document>
      <Page size="A4" style={CL.page}>
        <View style={CL.header}>
          <View style={CL.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={[CL.name, { color: ac }]}>{fullName(info, title)}</Text>
              <View style={CL.contacts}>
                {contactParts(info).map((c, i) => <Text key={i} style={CL.contact}>{c}</Text>)}
              </View>
            </View>
            {photo ? <PhotoRect src={photo} w={68} h={68} radius={4} /> : null}
          </View>
        </View>
        <View style={[CL.rule, { borderBottomColor: ac }]} />

        {info.summary ? (
          <View style={CL.section}>
            <Text style={[CL.secTitle, { color: ac }]}>{L.profile}</Text>
            <View style={CL.thinRule} />
            <PdfDescription text={info.summary} textStyle={CL.summary} dotColor={ac} />
          </View>
        ) : null}

        {hasList(exp) ? (
          <View style={CL.section}>
            <Text style={[CL.secTitle, { color: ac }]}>{L.experience}</Text>
            <View style={CL.thinRule} />
            {exp.map((e: any, i: number) => (
              <View key={i} style={[CL.entry, extraSpacing > 0 ? { marginBottom: 18 + extraSpacing } : {}]}>
                <View style={CL.row}>
                  <Text style={[CL.bold, { color: ac }]}>{e.title || 'Role'}{e.company ? ` — ${e.company}` : ''}</Text>
                  <Text style={CL.dates}>{dateRange(e, L.present)}</Text>
                </View>
                {e.description ? (
                  <View style={{ marginTop: 4 + (e.descriptionGap ?? 0) * 12 }}>
                    <PdfDescription text={e.description} textStyle={{ ...CL.desc, marginTop: 0 }} dotColor="#555" bulletGap={3} />
                  </View>
                ) : null}
              </View>
            ))}
          </View>
        ) : null}

        {hasList(edu) ? (
          <View style={CL.section}>
            <Text style={[CL.secTitle, { color: ac }]}>{L.education}</Text>
            <View style={CL.thinRule} />
            {edu.map((e: any, i: number) => {
              const label = eduLabel(e); const inst = clean(e.institution); const grade = clean(e.grade); const desc = clean(e.description);
              if (!label && !inst) return null;
              return (
                <View key={i} style={[CL.entry, extraSpacing > 0 ? { marginBottom: 18 + extraSpacing } : {}]}>
                  <View style={CL.row}>
                    {label ? <Text style={[CL.bold, { color: ac }]}>{label}</Text> : null}
                    {(e.start_date || e.end_date) ? <Text style={CL.dates}>{dateRange(e, L.present)}</Text> : null}
                  </View>
                  {inst  ? <Text style={CL.sub}>{inst}</Text>  : null}
                  {grade ? <Text style={CL.sub}>{grade}</Text> : null}
                  {desc  ? <View style={{ marginTop: 4 + (e.descriptionGap ?? 0) * 12 }}><Text style={{ ...CL.desc, marginTop: 0 }}>{desc}</Text></View> : null}
                </View>
              );
            })}
          </View>
        ) : null}

        {hasList(sk) ? (
          <View style={CL.section}>
            <Text style={[CL.secTitle, { color: ac }]}>{L.skills}</Text>
            <View style={CL.thinRule} />
            <SkillBars skills={sk} barColor={ac} />
          </View>
        ) : null}

        {(hasList(la) || hasList(ce)) ? (
          <View style={{ flexDirection: 'row' }}>
            {hasList(la) ? (
              <View style={[CL.section, { flex: 1, marginRight: 20 }]}>
                <Text style={[CL.secTitle, { color: ac }]}>{L.languages}</Text>
                <View style={CL.thinRule} />
                <Text style={CL.misc}>{la.map(langName).filter(Boolean).join('  ·  ')}</Text>
              </View>
            ) : null}
            {hasList(ce) ? (
              <View style={[CL.section, { flex: 1 }]}>
                <Text style={[CL.secTitle, { color: ac }]}>{L.certifications}</Text>
                <View style={CL.thinRule} />
                <Text style={CL.misc}>{ce.map(certName).filter(Boolean).join('  ·  ')}</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        <View style={CL.section}>
          <Text style={[CL.secTitle, { color: ac }]}>{L.references}</Text>
          <View style={CL.thinRule} />
          <Text style={{ fontSize: 8.5, color: '#555', fontStyle: 'italic' }}>{L.referencesNote}</Text>
        </View>
      </Page>
    </Document>
  );
}


const MO = StyleSheet.create({
  page:    { fontFamily: 'DejaVu Sans', flexDirection: 'row', backgroundColor: '#fff' },
  sidebar: { flex: 1, backgroundColor: '#1e293b', padding: 22, overflow: 'hidden' },
  main:    { flex: 2, padding: 28 },
  sName:   { fontSize: 15, fontFamily: 'DejaVu Sans', fontWeight: 'bold', color: '#fff', marginBottom: 3, flexWrap: 'wrap' },
  sRole:   { fontSize: 8, color: '#94a3b8', marginBottom: 16, lineHeight: 1.4 },
  sSecT:   { fontSize: 7, fontFamily: 'DejaVu Sans', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase',
             letterSpacing: 1.5, marginBottom: 6 },
  sSec:    { marginBottom: 14 },
  sCon:    { fontSize: 7.5, color: '#cbd5e1', marginBottom: 3, lineHeight: 1.4 },
  sSumm:   { fontSize: 8, color: '#94a3b8', lineHeight: 1.65 },
  sWrap:   { flexDirection: 'row', flexWrap: 'wrap' },
  sSkill:  { fontSize: 7, color: '#e2e8f0', backgroundColor: '#334155',
             paddingHorizontal: 4, paddingVertical: 2, marginRight: 3, marginBottom: 3 },
  photo:   { width: 72, height: 72, borderRadius: 36, marginBottom: 16, alignSelf: 'center' },
  mSecT:   { fontSize: 7.5, fontFamily: 'DejaVu Sans', fontWeight: 'bold', color: '#4f46e5', textTransform: 'uppercase',
             letterSpacing: 1.5, marginBottom: 7, borderBottomWidth: 0.5,
             borderBottomColor: '#e0e7ff', paddingBottom: 4 },
  mSec:    { marginBottom: 14 },
  mEntry:  { marginBottom: 18 },
  mRow:    { flexDirection: 'row', justifyContent: 'space-between' },
  mBold:   { fontSize: 9.5, fontFamily: 'DejaVu Sans', fontWeight: 'bold', color: '#111827', flex: 1, paddingRight: 8 },
  mSub:    { fontSize: 8.5, color: '#6b7280', marginTop: 1 },
  mDates:  { fontSize: 8, color: '#9ca3af', flexShrink: 0 },
  mDesc:   { fontSize: 8.5, color: '#374151', lineHeight: 1.65, marginTop: 4 },
});

function ModernPdf({ data, title, photo, language }: { data: any; title?: string | null; photo?: string; language?: string }) {
  const info = data.personal_info ?? {};
  const exp  = data.experience    ?? [];
  const edu  = data.education     ?? [];
  const sk   = data.skills        ?? [];
  const la   = data.languages     ?? [];
  const ce   = data.certifications ?? [];
  const L = getPdfLabels(language);

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
            <Text style={MO.sSecT}>{L.contact}</Text>
            {contactParts(info).map((c, i) => <Text key={i} style={MO.sCon}>{shortContact(c)}</Text>)}
          </View>

          {info.summary ? (
            <View style={[MO.sSec, { marginBottom: secMb }]}>
              <Text style={MO.sSecT}>{L.profile}</Text>
              <PdfDescription text={info.summary} textStyle={MO.sSumm} dotColor="#94a3b8" bulletGap={2} />
            </View>
          ) : null}

          {hasList(sk) ? (
            <View style={[MO.sSec, { marginBottom: secMb }]}>
              <Text style={MO.sSecT}>{L.skills}</Text>
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
                <SkillBars skills={sk} barColor="#e2e8f0" textColor="#e2e8f0" trackColor="#334155" itemMb={itemMb} labelFs={labelFs} chipStyle={{ backgroundColor: '#334155', color: '#e2e8f0' }} />
              )}
            </View>
          ) : null}

          {hasList(la) ? (
            <View style={[MO.sSec, { marginBottom: secMb }]}>
              <Text style={MO.sSecT}>{L.languages}</Text>
              <Text style={MO.sSumm}>{la.map(langName).filter(Boolean).join('\n')}</Text>
            </View>
          ) : null}
        </View>

        <View style={MO.main}>
          {hasList(exp) ? (
            <View style={MO.mSec}>
              <Text style={MO.mSecT}>{L.experience}</Text>
              {exp.map((e: any, i: number) => (
                <View key={i} style={MO.mEntry}>
                  <View style={MO.mRow}>
                    <Text style={MO.mBold}>{e.title || 'Role'}</Text>
                    <Text style={MO.mDates}>{dateRange(e, L.present)}</Text>
                  </View>
                  {e.company ? <Text style={MO.mSub}>{e.company}</Text> : null}
                  {e.description ? <PdfDescription text={e.description} textStyle={MO.mDesc} dotColor="#6b7280" bulletGap={3} /> : null}
                </View>
              ))}
            </View>
          ) : null}

          {hasList(edu) ? (
            <View style={MO.mSec}>
              <Text style={MO.mSecT}>{L.education}</Text>
              {edu.map((e: any, i: number) => {
                const label = eduLabel(e); const inst = clean(e.institution); const grade = clean(e.grade); const desc = clean(e.description);
                if (!label && !inst) return null;
                return (
                  <View key={i} style={MO.mEntry}>
                    <View style={MO.mRow}>
                      {label ? <Text style={MO.mBold}>{label}</Text> : null}
                      {(e.start_date || e.end_date) ? <Text style={MO.mDates}>{dateRange(e, L.present)}</Text> : null}
                    </View>
                    {inst  ? <Text style={MO.mSub}>{inst}</Text>  : null}
                    {grade ? <Text style={MO.mSub}>{grade}</Text> : null}
                    {desc  ? <PdfDescription text={desc} textStyle={MO.mDesc} dotColor="#6b7280" bulletGap={3} /> : null}
                  </View>
                );
              })}
            </View>
          ) : null}

          {hasList(ce) ? (
            <View style={MO.mSec}>
              <Text style={MO.mSecT}>{L.certifications}</Text>
              {ce.map((c: any, i: number) => (
                <View key={i} style={MO.mEntry}>
                  <Text style={MO.mBold}>{certName(c)}</Text>
                </View>
              ))}
            </View>
          ) : null}

          <View style={MO.mSec}>
            <Text style={MO.mSecT}>{L.references}</Text>
            <Text style={{ fontSize: 8.5, color: '#6b7280', fontStyle: 'italic' }}>{L.referencesNote}</Text>
          </View>
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
  entry:   { marginBottom: 18, paddingBottom: 6 },
  row:     { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  bold:    { fontSize: 10, fontFamily: 'DejaVu Sans', fontWeight: 'bold', color: '#111', flex: 1, paddingRight: 8 },
  sub:     { fontSize: 9, color: '#666' },
  dates:   { fontSize: 8.5, color: '#aaa', flexShrink: 0, textAlign: 'right' },
  desc:    { fontSize: 9, color: '#444', lineHeight: 1.7, marginTop: 4 },
  summary: { fontSize: 10, color: '#444', lineHeight: 1.75, textAlign: 'justify' },
  skills:  { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
  skill:   { fontSize: 8.5, color: '#555', marginHorizontal: 6, marginBottom: 4 },
  misc:    { fontSize: 9, color: '#555', lineHeight: 1.7 },
  photo:   { width: 72, height: 72, borderRadius: 36, marginBottom: 12 },
});

function MinimalPdf({ data, title, language }: { data: any; title?: string | null; photo?: string; language?: string }) {
  const info = data.personal_info ?? {};
  const exp  = data.experience    ?? [];
  const edu  = data.education     ?? [];
  const sk   = data.skills        ?? [];
  const la   = data.languages     ?? [];
  const ce   = data.certifications ?? [];
  const L = getPdfLabels(language);

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
            <Text style={MI.secT}>{L.about}</Text>
            <PdfDescription text={info.summary} textStyle={MI.summary} dotColor="#555" bulletGap={3} />
          </View>
        ) : null}

        {hasList(exp) ? (
          <View style={MI.sec}>
            <Text style={MI.secT}>{L.experience}</Text>
            {exp.map((e: any, i: number) => (
              <View key={i} style={MI.entry}>
                <View style={MI.row}>
                  <Text style={MI.bold}>{e.title || 'Role'}{e.company ? `, ${e.company}` : ''}</Text>
                  <Text style={MI.dates}>{dateRange(e, L.present)}</Text>
                </View>
                {e.description ? <PdfDescription text={e.description} textStyle={MI.desc} dotColor="#555" bulletGap={3} /> : null}
              </View>
            ))}
          </View>
        ) : null}

        {hasList(edu) ? (
          <View style={MI.sec}>
            <Text style={MI.secT}>{L.education}</Text>
            {edu.map((e: any, i: number) => {
              const label = eduLabel(e); const inst = clean(e.institution); const grade = clean(e.grade); const desc = clean(e.description);
              if (!label && !inst) return null;
              return (
                <View key={i} style={MI.entry}>
                  <View style={MI.row}>
                    {label ? <Text style={MI.bold}>{label}</Text> : null}
                    {(e.start_date || e.end_date) ? <Text style={MI.dates}>{dateRange(e, L.present)}</Text> : null}
                  </View>
                  {inst  ? <Text style={MI.sub}>{inst}</Text>  : null}
                  {grade ? <Text style={MI.sub}>{grade}</Text> : null}
                  {desc  ? <PdfDescription text={desc} textStyle={MI.desc} dotColor="#555" bulletGap={3} /> : null}
                </View>
              );
            })}
          </View>
        ) : null}

        {hasList(sk) ? (
          <View style={MI.sec}>
            <Text style={MI.secT}>{L.skills}</Text>
            <SkillBars skills={sk} barColor="#555" />
          </View>
        ) : null}

        {(hasList(la) || hasList(ce)) ? (
          <View style={{ flexDirection: 'row' }}>
            {hasList(la) ? (
              <View style={[MI.sec, { flex: 1, marginRight: 24 }]}>
                <Text style={MI.secT}>{L.languages}</Text>
                <Text style={MI.misc}>{la.map(langName).filter(Boolean).join('  ·  ')}</Text>
              </View>
            ) : null}
            {hasList(ce) ? (
              <View style={[MI.sec, { flex: 1 }]}>
                <Text style={MI.secT}>{L.certifications}</Text>
                <Text style={MI.misc}>{ce.map(certName).filter(Boolean).join('  ·  ')}</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        <View style={MI.sec}>
          <Text style={MI.secT}>{L.references}</Text>
          <Text style={{ fontSize: 9, color: '#555', fontStyle: 'italic', textAlign: 'center' }}>{L.referencesNote}</Text>
        </View>
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
  entry:   { marginBottom: 18, paddingBottom: 6 },
  row:     { flexDirection: 'row', justifyContent: 'space-between' },
  bold:    { fontSize: 9, fontFamily: 'DejaVu Sans', fontWeight: 'bold', color: '#111', flex: 1, paddingRight: 8 },
  sub:     { fontSize: 8, color: '#6b7280', marginTop: 1 },
  dates:   { fontSize: 7.5, color: '#9ca3af', flexShrink: 0, textAlign: 'right' },
  desc:    { fontSize: 8, color: '#374151', lineHeight: 1.65, marginTop: 4 },
  summ:    { fontSize: 8.5, color: '#374151', lineHeight: 1.7 },
  skills:  { flexDirection: 'row', flexWrap: 'wrap' },
  skill:   { fontSize: 7.5, color: '#1a3a5c', borderWidth: 0.5, borderColor: '#93c5fd',
             paddingHorizontal: 5, paddingVertical: 2, marginRight: 4, marginBottom: 4 },
  misc:    { fontSize: 8, color: '#374151', lineHeight: 1.65 },
  photo:   { width: 72, height: 72, borderRadius: 4, marginBottom: 10, alignSelf: 'center' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
});

function ResearcherPdf({ data, title, photo, language }: { data: any; title?: string | null; photo?: string; language?: string }) {
  const info = data.personal_info ?? {};
  const exp  = data.experience    ?? [];
  const edu  = data.education     ?? [];
  const sk   = data.skills        ?? [];
  const la   = data.languages     ?? [];
  const ce   = data.certifications ?? [];
  const L = getPdfLabels(language);

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
                <Text style={RE.secT}>{L.profile}</Text>
                <PdfDescription text={info.summary} textStyle={RE.summ} dotColor="#374151" bulletGap={3} />
              </View>
            ) : null}

            {hasList(edu) ? (
              <View style={RE.sec}>
                <Text style={RE.secT}>{L.education}</Text>
                {edu.map((e: any, i: number) => {
                  const label = eduLabel(e); const inst = clean(e.institution); const grade = clean(e.grade); const desc = clean(e.description);
                  if (!label && !inst) return null;
                  return (
                    <View key={i} style={RE.entry}>
                      <View style={RE.row}>
                        {label ? <Text style={RE.bold}>{label}</Text> : null}
                        {(e.start_date || e.end_date) ? <Text style={RE.dates}>{dateRange(e, L.present)}</Text> : null}
                      </View>
                      {inst  ? <Text style={RE.sub}>{inst}</Text>  : null}
                      {grade ? <Text style={RE.sub}>{grade}</Text> : null}
                      {desc  ? <PdfDescription text={desc} textStyle={RE.desc} dotColor="#1a3a5c" bulletGap={3} /> : null}
                    </View>
                  );
                })}
              </View>
            ) : null}

            {hasList(sk) ? (
              <View style={RE.sec}>
                <Text style={RE.secT}>{L.skills}</Text>
                <SkillBars skills={sk} barColor="#1a3a5c" />
              </View>
            ) : null}

            {hasList(la) ? (
              <View style={RE.sec}>
                <Text style={RE.secT}>{L.languages}</Text>
                <Text style={RE.misc}>{la.map(langName).filter(Boolean).join('\n')}</Text>
              </View>
            ) : null}

            {hasList(ce) ? (
              <View style={RE.sec}>
                <Text style={RE.secT}>{L.certifications}</Text>
                <Text style={RE.misc}>{ce.map(certName).filter(Boolean).join('\n')}</Text>
              </View>
            ) : null}
          </View>

          <View style={RE.right}>
            {hasList(exp) ? (
              <View style={RE.sec}>
                <Text style={RE.secT}>{L.experience}</Text>
                {exp.map((e: any, i: number) => (
                  <View key={i} style={RE.entry}>
                    <View style={RE.row}>
                      <Text style={RE.bold}>{e.title || 'Role'}{e.company ? ` — ${e.company}` : ''}</Text>
                      <Text style={RE.dates}>{dateRange(e, L.present)}</Text>
                    </View>
                    {e.description ? <PdfDescription text={e.description} textStyle={RE.desc} dotColor="#1a3a5c" bulletGap={3} /> : null}
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        </View>

        <View style={RE.sec}>
          <Text style={RE.secT}>{L.references}</Text>
          <Text style={{ fontSize: 8, color: '#6b7280', fontStyle: 'italic' }}>{L.referencesNote}</Text>
        </View>
      </Page>
    </Document>
  );
}


const FR = StyleSheet.create({
  page:     { fontFamily: 'DejaVu Sans', flexDirection: 'row', backgroundColor: '#fff' },
  strip:    { flex: 3, backgroundColor: '#2d2d2d', padding: 20, overflow: 'hidden' },
  body:     { flex: 7, padding: '26 26 26 22' },
  sName:    { fontSize: 17, fontFamily: 'DejaVu Sans', fontWeight: 'bold', color: '#fff', lineHeight: 1.3 },
  sRole:    { fontSize: 8.5, color: '#aaa', marginTop: 3, marginBottom: 18, lineHeight: 1.4 },
  sSecT:    { fontSize: 7, fontFamily: 'DejaVu Sans', fontWeight: 'bold', color: '#888', textTransform: 'uppercase',
              letterSpacing: 1.5, marginBottom: 6 },
  sSec:     { marginBottom: 16 },
  sCon:     { fontSize: 7.5, color: '#ccc', marginBottom: 3, lineHeight: 1.4 },
  sSumm:    { fontSize: 8, color: '#bbb', lineHeight: 1.65 },
  sSkillW:  { flexDirection: 'row', flexWrap: 'wrap', maxWidth: '100%' },
  sSkill:   { fontSize: 7.5, color: '#ddd', marginRight: 6, marginBottom: 3 },
  photo:    { width: 70, height: 70, borderRadius: 35, marginBottom: 16, alignSelf: 'center' },
  bSecT:    { fontSize: 9, fontFamily: 'DejaVu Sans', fontWeight: 'bold', color: '#e07b39',
              textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 },
  bRule:    { borderBottomWidth: 1, borderBottomColor: '#e07b39', marginBottom: 8 },
  bSec:     { marginBottom: 14 },
  bEntry:   { marginBottom: 18 },
  bRow:     { flexDirection: 'row', justifyContent: 'space-between' },
  bBold:    { fontSize: 9.5, fontFamily: 'DejaVu Sans', fontWeight: 'bold', color: '#111', flex: 1, paddingRight: 8 },
  bSub:     { fontSize: 8.5, color: '#666', marginTop: 1 },
  bDates:   { fontSize: 8, color: '#aaa', flexShrink: 0, textAlign: 'right' },
  bDesc:    { fontSize: 8.5, color: '#333', lineHeight: 1.65, marginTop: 4 },
  bSumm:    { fontSize: 9, color: '#444', lineHeight: 1.7 },
});

function FriggeriFdf({ data, title, photo, language }: { data: any; title?: string | null; photo?: string; language?: string }) {
  const info = data.personal_info ?? {};
  const exp  = data.experience    ?? [];
  const edu  = data.education     ?? [];
  const sk   = data.skills        ?? [];
  const la   = data.languages     ?? [];
  const ce   = data.certifications ?? [];
  const L = getPdfLabels(language);

  return (
    <Document>
      <Page size="A4" style={FR.page}>
        <View style={FR.strip}>
          {photo ? <View style={{ alignSelf: 'center', marginBottom: 16 }}><PhotoCircle src={photo} size={70} /></View> : null}
          <Text style={FR.sName}>{fullName(info, title)}</Text>
          {title ? <Text style={FR.sRole}>{title}</Text> : null}

          <View style={FR.sSec}>
            <Text style={FR.sSecT}>{L.contact}</Text>
            {contactParts(info).map((c, i) => <Text key={i} style={FR.sCon}>{shortContact(c)}</Text>)}
          </View>

          {hasList(sk) ? (
            <View style={FR.sSec}>
              <Text style={FR.sSecT}>{L.skills}</Text>
              <SkillBars skills={sk} barColor="#ddd" textColor="#ddd" trackColor="#4a4a4a" chipStyle={{ backgroundColor: '#3d3d3d', color: '#ddd' }} />
            </View>
          ) : null}

          {hasList(la) ? (
            <View style={FR.sSec}>
              <Text style={FR.sSecT}>{L.languages}</Text>
              <Text style={FR.sSumm}>{la.map(langName).filter(Boolean).join('\n')}</Text>
            </View>
          ) : null}
        </View>

        <View style={FR.body}>
          {info.summary ? (
            <View style={FR.bSec}>
              <Text style={FR.bSecT}>{L.aboutMe}</Text>
              <View style={FR.bRule} />
              <PdfDescription text={info.summary} textStyle={FR.bSumm} dotColor="#555" bulletGap={3} />
            </View>
          ) : null}

          {hasList(exp) ? (
            <View style={FR.bSec}>
              <Text style={FR.bSecT}>{L.experience}</Text>
              <View style={FR.bRule} />
              {exp.map((e: any, i: number) => (
                <View key={i} style={FR.bEntry}>
                  <View style={FR.bRow}>
                    <Text style={FR.bBold}>{e.title || 'Role'}</Text>
                    <Text style={FR.bDates}>{dateRange(e, L.present)}</Text>
                  </View>
                  {e.company ? <Text style={FR.bSub}>{e.company}</Text> : null}
                  {e.description ? <PdfDescription text={e.description} textStyle={FR.bDesc} dotColor="#e07b39" bulletGap={3} /> : null}
                </View>
              ))}
            </View>
          ) : null}

          {hasList(edu) ? (
            <View style={FR.bSec}>
              <Text style={FR.bSecT}>{L.education}</Text>
              <View style={FR.bRule} />
              {edu.map((e: any, i: number) => {
                const label = eduLabel(e); const inst = clean(e.institution); const grade = clean(e.grade); const desc = clean(e.description);
                if (!label && !inst) return null;
                return (
                  <View key={i} style={FR.bEntry}>
                    <View style={FR.bRow}>
                      {label ? <Text style={FR.bBold}>{label}</Text> : null}
                      {(e.start_date || e.end_date) ? <Text style={FR.bDates}>{dateRange(e, L.present)}</Text> : null}
                    </View>
                    {inst  ? <Text style={FR.bSub}>{inst}</Text>  : null}
                    {grade ? <Text style={FR.bSub}>{grade}</Text> : null}
                    {desc  ? <PdfDescription text={desc} textStyle={FR.bDesc} dotColor="#e07b39" bulletGap={3} /> : null}
                  </View>
                );
              })}
            </View>
          ) : null}

          {hasList(ce) ? (
            <View style={FR.bSec}>
              <Text style={FR.bSecT}>{L.certifications}</Text>
              <View style={FR.bRule} />
              {ce.map((c: any, i: number) => (
                <View key={i} style={FR.bEntry}>
                  <Text style={FR.bBold}>{certName(c)}</Text>
                </View>
              ))}
            </View>
          ) : null}

          <View style={FR.bSec}>
            <Text style={FR.bSecT}>{L.references}</Text>
            <View style={FR.bRule} />
            <Text style={{ fontSize: 8.5, color: '#666', fontStyle: 'italic' }}>{L.referencesNote}</Text>
          </View>
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
  entry:   { marginBottom: 18, paddingBottom: 6 },
  row:     { flexDirection: 'row', justifyContent: 'space-between' },
  bold:    { fontSize: 9.5, fontFamily: 'DejaVu Sans', fontWeight: 'bold', color: '#111', flex: 1, paddingRight: 8 },
  sub:     { fontSize: 8.5, color: '#6b7280', marginTop: 1 },
  dates:   { fontSize: 8, color: '#9ca3af', flexShrink: 0, textAlign: 'right' },
  desc:    { fontSize: 8.5, color: '#374151', lineHeight: 1.65, marginTop: 4 },
  summ:    { fontSize: 9, color: '#374151', lineHeight: 1.7, marginTop: 4 },
  skills:  { flexDirection: 'row', flexWrap: 'wrap' },
  skill:   { fontSize: 7.5, backgroundColor: '#f0fdf4', color: '#065f46', borderWidth: 0.5,
             borderColor: '#a7f3d0', paddingHorizontal: 5, paddingVertical: 2,
             marginRight: 4, marginBottom: 4 },
  misc:    { fontSize: 8.5, color: '#374151', lineHeight: 1.65 },
  photo:   { width: 70, height: 70, borderRadius: 35, marginBottom: 0, marginLeft: 16 },
  accentRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
});

function HipsterPdf({ data, title, photo, language }: { data: any; title?: string | null; photo?: string; language?: string }) {
  const info = data.personal_info ?? {};
  const exp  = data.experience    ?? [];
  const edu  = data.education     ?? [];
  const sk   = data.skills        ?? [];
  const la   = data.languages     ?? [];
  const ce   = data.certifications ?? [];
  const L = getPdfLabels(language);

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
            <PdfDescription text={info.summary} textStyle={HI.summ} dotColor="#0f766e" bulletGap={3} />
          ) : null}

          <View style={HI.colRow}>
            <View style={HI.left}>
              {hasList(edu) ? (
                <>
                  <Text style={HI.secT}>{L.education}</Text>
                  <View style={HI.rule} />
                  {edu.map((e: any, i: number) => {
                    const label = eduLabel(e); const inst = clean(e.institution); const grade = clean(e.grade); const desc = clean(e.description);
                    if (!label && !inst) return null;
                    return (
                      <View key={i} style={HI.entry}>
                        <View style={HI.row}>
                          {label ? <Text style={HI.bold}>{label}</Text> : null}
                          {(e.start_date || e.end_date) ? <Text style={HI.dates}>{dateRange(e, L.present)}</Text> : null}
                        </View>
                        {inst  ? <Text style={HI.sub}>{inst}</Text>  : null}
                        {grade ? <Text style={HI.sub}>{grade}</Text> : null}
                        {desc  ? <PdfDescription text={desc} textStyle={HI.desc} dotColor="#0f766e" bulletGap={3} /> : null}
                      </View>
                    );
                  })}
                </>
              ) : null}

              {hasList(sk) ? (
                <>
                  <Text style={HI.secT}>{L.skills}</Text>
                  <View style={HI.rule} />
                  <SkillBars skills={sk} barColor="#0f766e" />
                </>
              ) : null}

              {hasList(la) ? (
                <>
                  <Text style={HI.secT}>{L.languages}</Text>
                  <View style={HI.rule} />
                  <Text style={HI.misc}>{la.map(langName).filter(Boolean).join('\n')}</Text>
                </>
              ) : null}

              {hasList(ce) ? (
                <>
                  <Text style={HI.secT}>{L.certifications}</Text>
                  <View style={HI.rule} />
                  <Text style={HI.misc}>{ce.map(certName).filter(Boolean).join('\n')}</Text>
                </>
              ) : null}
            </View>

            <View style={HI.right}>
              {hasList(exp) ? (
                <>
                  <Text style={HI.secT}>{L.experience}</Text>
                  <View style={HI.rule} />
                  {exp.map((e: any, i: number) => (
                    <View key={i} style={HI.entry}>
                      <View style={HI.row}>
                        <Text style={HI.bold}>{e.title || 'Role'}</Text>
                        <Text style={HI.dates}>{dateRange(e, L.present)}</Text>
                      </View>
                      {e.company ? <Text style={HI.sub}>{e.company}</Text> : null}
                      {e.description ? <PdfDescription text={e.description} textStyle={HI.desc} dotColor="#0f766e" bulletGap={3} /> : null}
                    </View>
                  ))}
                </>
              ) : null}
            </View>
          </View>

          <View>
            <Text style={HI.secT}>{L.references}</Text>
            <View style={HI.rule} />
            <Text style={{ fontSize: 8.5, color: '#374151', fontStyle: 'italic' }}>{L.referencesNote}</Text>
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
  sidebar:   { flex: 1, backgroundColor: '#2B2D42', padding: '26 14 26 16', overflow: 'hidden' },
  main:      { flex: 2, padding: '28 24 28 20' },

  photoWrap: { alignItems: 'center', marginBottom: 12 },
  sName:     { fontSize: 13, fontFamily: 'DejaVu Sans', fontWeight: 'bold', color: '#fff', textAlign: 'center', marginBottom: 2 },
  sTagline:  { fontSize: 7.5, color: '#94a3b8', textAlign: 'center', marginBottom: 12, lineHeight: 1.4 },
  sDivider:  { borderBottomWidth: 0.5, borderBottomColor: '#4a4e68', marginBottom: 10 },
  sSecT:     { fontSize: 7, fontFamily: 'DejaVu Sans', fontWeight: 'bold', color: '#E96D1F', textTransform: 'uppercase',
               letterSpacing: 1.5, marginBottom: 8 },
  sSec:      { marginBottom: 14 },
  sCon:      { fontSize: 7.5, color: '#cbd5e1', lineHeight: 1.5, marginBottom: 3 },
  sSkillRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  sSkillName:{ fontSize: 8, color: '#e2e8f0', flex: 1, marginLeft: 7 },
  sSumm:     { fontSize: 7.5, color: '#94a3b8', lineHeight: 1.65 },

  mName:     { fontSize: 22, fontFamily: 'DejaVu Sans', fontWeight: 'bold', color: '#2B2D42', marginBottom: 2 },
  mTagline:  { fontSize: 9.5, color: '#E96D1F', marginBottom: 16, fontFamily: 'DejaVu Sans', fontStyle: 'italic' },
  mSecT:     { fontSize: 7.5, fontFamily: 'DejaVu Sans', fontWeight: 'bold', color: '#E96D1F', textTransform: 'uppercase',
               letterSpacing: 1.5, paddingBottom: 3, borderBottomWidth: 0.75, borderBottomColor: '#E96D1F',
               marginBottom: 8 },
  mSec:      { marginBottom: 14 },
  mEntry:    { flexDirection: 'row', marginBottom: 18 },
  mDot:      { width: 8, paddingTop: 2, marginRight: 8, alignItems: 'center' },
  mContent:  { flex: 1 },
  mBold:     { fontSize: 9.5, fontFamily: 'DejaVu Sans', fontWeight: 'bold', color: '#2B2D42' },
  mSub:      { fontSize: 8.5, color: '#E96D1F', marginTop: 1 },
  mDates:    { fontSize: 7.5, color: '#94a3b8', marginTop: 1, flexShrink: 0 },
  mDesc:     { fontSize: 8, color: '#475569', lineHeight: 1.65, marginTop: 4 },
  mMisc:     { fontSize: 8.5, color: '#475569', lineHeight: 1.65 },
});

function AltaCVPdf({ data, title, photo, language }: { data: any; title?: string | null; photo?: string; language?: string }) {
  const info = data.personal_info ?? {};
  const exp  = data.experience     ?? [];
  const edu  = data.education      ?? [];
  const sk   = data.skills         ?? [];
  const la   = data.languages      ?? [];
  const ce   = data.certifications ?? [];
  const L = getPdfLabels(language);

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
            <Text style={AC.sSecT}>{L.contact}</Text>
            {contactParts(info).map((c, i) => <Text key={i} style={AC.sCon}>{shortContact(c)}</Text>)}
          </View>

          {info.summary ? (
            <View style={[AC.sSec, { marginBottom: secMb }]}>
              <Text style={AC.sSecT}>{L.profile}</Text>
              <View style={AC.sDivider} />
              <PdfDescription text={info.summary} textStyle={AC.sSumm} dotColor="#94a3b8" bulletGap={2} />
            </View>
          ) : null}

          {hasList(sk) ? (
            <View style={[AC.sSec, { marginBottom: secMb }]}>
              <Text style={AC.sSecT}>{L.skills}</Text>
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
              <Text style={AC.sSecT}>{L.languages}</Text>
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
              <Text style={AC.mSecT}>{L.experience}</Text>
              {exp.map((e: any, i: number) => (
                <View key={i} style={AC.mEntry}>
                  <View style={AC.mDot}>
                    <Svg width={7} height={7}><Circle cx={3.5} cy={3.5} r={3} fill="#E96D1F" /></Svg>
                  </View>
                  <View style={AC.mContent}>
                    <Text style={AC.mBold}>{e.title || 'Role'}</Text>
                    {e.company ? <Text style={AC.mSub}>{e.company}</Text> : null}
                    {(e.start_date || e.end_date) ? <Text style={AC.mDates}>{dateRange(e, L.present)}</Text> : null}
                    {e.description ? <PdfDescription text={e.description} textStyle={AC.mDesc} dotColor="#E96D1F" bulletGap={3} /> : null}
                  </View>
                </View>
              ))}
            </View>
          ) : null}

          {hasList(edu) ? (
            <View style={AC.mSec}>
              <Text style={AC.mSecT}>{L.education}</Text>
              {edu.map((e: any, i: number) => {
                const label = eduLabel(e); const inst = clean(e.institution); const grade = clean(e.grade); const desc = clean(e.description);
                if (!label && !inst) return null;
                return (
                  <View key={i} style={AC.mEntry}>
                    <View style={AC.mDot}>
                      <Svg width={7} height={7}><Circle cx={3.5} cy={3.5} r={3} fill="#E96D1F" /></Svg>
                    </View>
                    <View style={AC.mContent}>
                      {label ? <Text style={AC.mBold}>{label}</Text> : null}
                      {inst  ? <Text style={AC.mSub}>{inst}</Text>   : null}
                      {(e.start_date || e.end_date) ? <Text style={AC.mDates}>{dateRange(e, L.present)}</Text> : null}
                      {grade ? <Text style={AC.mSub}>{grade}</Text>  : null}
                      {desc  ? <PdfDescription text={desc} textStyle={{ fontSize: 8.5, color: '#475569', lineHeight: 1.65 }} dotColor="#E96D1F" bulletGap={3} /> : null}
                    </View>
                  </View>
                );
              })}
            </View>
          ) : null}

          {hasList(ce) ? (
            <View style={AC.mSec}>
              <Text style={AC.mSecT}>{L.certifications}</Text>
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

          <View style={AC.mSec}>
            <Text style={AC.mSecT}>{L.references}</Text>
            <Text style={{ fontSize: 8.5, color: '#475569', fontStyle: 'italic' }}>{L.referencesNote}</Text>
          </View>
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
  language?: string,
  options?: { classicAccentColor?: string; classicEntrySpacing?: number },
): Promise<Blob> {
  const props = { data: resumeData, title, photo, language };
  const doc =
    templateId === 'classic'    ? <ClassicPdf    {...props} accentColor={options?.classicAccentColor} entrySpacing={options?.classicEntrySpacing} /> :
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
  resumeId: string,
  title?: string | null,
  photo?: string,
  language?: string,
  options?: { classicAccentColor?: string; classicEntrySpacing?: number },
) {
  const props = { data: resumeData, title, photo, language };

  const doc =
    templateId === 'classic'    ? <ClassicPdf    {...props} accentColor={options?.classicAccentColor} entrySpacing={options?.classicEntrySpacing} /> :
    templateId === 'modern'     ? <ModernPdf     {...props} /> :
    templateId === 'researcher' ? <ResearcherPdf {...props} /> :
    templateId === 'friggeri'   ? <FriggeriFdf   {...props} /> :
    templateId === 'hipster'    ? <HipsterPdf    {...props} /> :
    templateId === 'altacv'     ? <AltaCVPdf     {...props} /> :
                                  <MinimalPdf    {...props} />;

  try {
    const blob = await pdf(doc).toBlob();
    const fileName = `${title || 'resume'}.pdf`;

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10000);

    const token = localStorage.getItem('auth_token');
    if (token) {
      const formData = new FormData();
      formData.append('file', blob, fileName);
      formData.append('resume_id', resumeId);

      const apiUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

      fetch(`${apiUrl}/v1/documents/save-generated`, {
        method: 'POST',
        body: formData,
        headers: { 'Authorization': `Bearer ${token}` }
      });
    }
  } catch (err) {
    console.error("Error generating or saving PDF:", err);
  }
}