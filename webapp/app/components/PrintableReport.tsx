"use client";

interface ReportSection {
  title: string;
  content: React.ReactNode;
}

interface Props {
  id: string;
  title: string;
  sections: ReportSection[];
}

export default function PrintableReport({ id, title, sections }: Props) {
  return (
    <div id={id} className="hidden">
      <h2>{title}</h2>
      {sections.map((section, i) => (
        <div key={i}>
          <h3>{section.title}</h3>
          {section.content}
        </div>
      ))}
    </div>
  );
}
