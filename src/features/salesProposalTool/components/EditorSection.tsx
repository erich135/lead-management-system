import type { ReactNode } from 'react';

interface EditorSectionProps {
  number: number;
  title: string;
  instruction: string;
  children: ReactNode;
}

export function EditorSection({
  number,
  title,
  instruction,
  children,
}: EditorSectionProps) {
  return (
    <section className="space-y-3 overflow-visible">
      <div>
        <h2 className="text-sm font-bold text-[#383838]">
          {number}. {title}
        </h2>
        <p className="mt-1 text-xs text-slate-600">{instruction}</p>
      </div>
      {children}
    </section>
  );
}

export function MissingHint({ children }: { children: ReactNode }) {
  return <p className="mt-1 text-xs font-medium text-amber-800">{children}</p>;
}
