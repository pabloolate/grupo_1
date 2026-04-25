export default function ErrorBox({ error }) {
  if (!error) return null;
  const mensaje = error?.response?.data?.message || error?.message || String(error);
  return <div className="error-box">{mensaje}</div>;
}
