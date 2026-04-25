export default function Card({ title, value, subtitle, children }) {
  return (
    <article className="card">
      {title && <p className="card-title">{title}</p>}
      {value !== undefined && <h3 className="card-value">{value}</h3>}
      {subtitle && <p className="card-subtitle">{subtitle}</p>}
      {children}
    </article>
  );
}
