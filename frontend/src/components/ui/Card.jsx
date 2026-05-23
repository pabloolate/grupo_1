export default function Card({ title, value, subtitle, children, tone = 'blue' }) {
  return (
    <article className={`card metric-card tone-${tone}`}>
      <div className="card-accent" />
      {title && <p className="card-title">{title}</p>}
      {value !== undefined && <h3 className="card-value">{value}</h3>}
      {subtitle && <p className="card-subtitle">{subtitle}</p>}
      {children}
    </article>
  );
}
