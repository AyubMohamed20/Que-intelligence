import Link from "next/link";
import { PageHeading } from "@/components/page-heading";

export const metadata = { title: "Research guidelines" };

const requirements = [
  "A realistic commercial business in Ottawa or the practical surrounding market",
  "At least three specific observations and two direct evidence sources",
  "Every contact, observation, decision maker, and draft fact cites stored evidence",
  "Email provenance and verification are explicit; inferred email is never treated as confirmed",
  "Name, domain, social, phone, address, and email are checked for duplicates",
  "Uncertain dates and conflicting facts remain labelled",
  "The score factors are completed from evidence, not intuition alone",
  "An active cycle continues until 10 new qualified records are email-ready",
];

export default function ResearchGuidelinesPage() {
  return (
    <>
      <PageHeading
        eyebrow="Research standard · version 1.0"
        title={<>Evidence first, with a <em>real completion gate.</em></>}
        description="Every human researcher and approved AI agent follows the same source, contact, duplicate, scoring, and qualification rules."
      />
      <div className="guidelines-grid">
        <section className="surface guidelines-card">
          <div className="surface-header">
            <div>
              <h2>Minimum acceptance checklist</h2>
              <p>A lead cannot bypass these controls based on who submitted it.</p>
            </div>
          </div>
          <ol>
            {requirements.map((requirement, index) => (
              <li key={requirement}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <p>{requirement}</p>
              </li>
            ))}
          </ol>
        </section>
        <aside className="surface guidelines-card guidelines-card--rail">
          <h2>Canonical project documents</h2>
          <p>
            The detailed source hierarchy, email labels, evidence standard,
            scoring rubric, structured schema, and end-of-cycle checklist live
            in the repository.
          </p>
          <code>docs/RESEARCH_GUIDELINES.md</code>
          <code>docs/schemas/research-lead.schema.json</code>
          <Link className="button button--primary" href="/discover">
            Return to the research cycle
          </Link>
        </aside>
      </div>
    </>
  );
}
