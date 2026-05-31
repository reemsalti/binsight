type Props = {
  id?: string;
  title: string;
  description: string;
};

export function DashboardSectionHeader({ id, title, description }: Props) {
  return (
    <div id={id} className="scroll-mt-4">
      <h2 className="type-heading">{title}</h2>
      <p className="type-muted mt-1">{description}</p>
    </div>
  );
}
