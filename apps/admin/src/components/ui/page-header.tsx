type Props = {
  title: string;
  count?: number;
  description?: string;
  action?: React.ReactNode;
};

export function PageHeader({ title, count, description, action }: Props) {
  return (
    <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">
          {title}
          {typeof count === "number" ? (
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              {count}
            </span>
          ) : null}
        </h1>
        {description ? (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action}
    </header>
  );
}
