import { STIX_Two_Text } from 'next/font/google';
import type { ResumeDocument } from '@joboard/db';

// Computer Modern (LaTeX's default) isn't on Google Fonts; STIX Two Text is
// the closest widely-available serif match for reproducing a LaTeX-style
// resume's proportions and small-caps rendering.
const resumeFont = STIX_Two_Text({ subsets: ['latin'], weight: ['400', '500', '700'] });

// Reproduces the visual style of the user's original LaTeX-style resume
// (serif type, small-caps section headers with a rule, two-column skills
// table, en-dash bullets) so tailored variants look like the same document.
// No source .tex/.docx exists for the original — this is a from-scratch
// equivalent template, built to be filled with a ResumeDocument and printed
// via the browser's own "Print to PDF" (no server-side PDF rendering).
export function ResumeTemplate({ resume }: { resume: ResumeDocument }) {
  return (
    <div className={`resume-page ${resumeFont.className}`}>
      <style>{`
        .resume-page {
          color: #111;
          max-width: 7.5in;
          margin: 0 auto;
          padding: 0.6in 0.15in;
          line-height: 1.35;
          font-size: 10.6pt;
        }
        .resume-page a { color: #1a4fa0; text-decoration: none; }
        .resume-name {
          text-align: center;
          font-size: 22pt;
          font-weight: 500;
          letter-spacing: 0.02em;
          margin: 0 0 4pt;
        }
        .resume-contact {
          text-align: center;
          font-size: 9.5pt;
          margin: 0 0 14pt;
        }
        .resume-contact span:not(:last-child)::after { content: " | "; color: #444; }
        .resume-section-title {
          font-variant-caps: small-caps;
          font-size: 13pt;
          font-weight: 700;
          letter-spacing: 0.02em;
          border-bottom: 0.75pt solid #111;
          padding-bottom: 1pt;
          margin: 12pt 0 6pt;
        }
        .resume-section-title:first-of-type { margin-top: 0; }
        .skills-row { display: flex; gap: 14pt; margin: 2pt 0; }
        .skills-row .skills-label { flex: 0 0 2.35in; font-weight: 400; }
        .skills-row .skills-values { flex: 1; }
        .exp-item, .project-item, .edu-item { margin: 0 0 8pt; }
        .exp-header, .edu-header { display: flex; justify-content: space-between; align-items: baseline; gap: 8pt; }
        .exp-title { font-weight: 700; }
        .exp-dates, .edu-dates { font-style: italic; white-space: nowrap; font-size: 9.8pt; }
        .exp-bullets { margin: 2pt 0 0; padding-left: 14pt; }
        .exp-bullets li { margin: 1pt 0; padding-left: 2pt; }
        .exp-bullets li::marker { content: "\\2013\\2002"; }
        .project-title { font-weight: 700; }
        .project-desc { margin: 1pt 0 0; text-align: justify; }
        .edu-institution { font-weight: 700; }
        @media print {
          .resume-page { padding: 0; max-width: none; }
        }
        @page { size: letter; margin: 0.5in; }
      `}</style>

      <div className="resume-name">{resume.name}</div>
      <div className="resume-contact">
        {resume.contact.map((c, i) =>
          c.href ? (
            <span key={i}>
              <a href={c.href}>{c.value}</a>
            </span>
          ) : (
            <span key={i}>{c.value}</span>
          )
        )}
      </div>

      <div className="resume-section-title">Skills</div>
      {resume.skills.map((s, i) => (
        <div className="skills-row" key={i}>
          <div className="skills-label">{s.category}</div>
          <div className="skills-values">{s.items.join(', ')}</div>
        </div>
      ))}

      <div className="resume-section-title">Work Experience</div>
      {resume.experience.map((e, i) => (
        <div className="exp-item" key={i}>
          <div className="exp-header">
            <div className="exp-title">
              {e.role} – {e.company}
            </div>
            <div className="exp-dates">{e.dates}</div>
          </div>
          <ul className="exp-bullets">
            {e.bullets.map((b, j) => (
              <li key={j}>{b}</li>
            ))}
          </ul>
        </div>
      ))}

      <div className="resume-section-title">Projects</div>
      {resume.projects.map((p, i) => (
        <div className="project-item" key={i}>
          <div className="exp-header">
            <div className="project-title">{p.title}</div>
            {p.link ? <a href={p.link}>website</a> : null}
          </div>
          <div className="project-desc">{p.description}</div>
        </div>
      ))}

      <div className="resume-section-title">Education</div>
      {resume.education.map((ed, i) => (
        <div className="edu-item" key={i}>
          <div className="edu-header">
            <div className="edu-institution">
              {ed.detail} at <strong>{ed.institution}</strong>
            </div>
            <div className="edu-dates">{ed.dates}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
