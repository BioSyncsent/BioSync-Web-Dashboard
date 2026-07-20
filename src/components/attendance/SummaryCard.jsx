function SummaryCard({ icon: Icon, label, value, tone = "primary" }) {
  return (
    <div className={`bs-card bs-summary-card bs-tone-${tone}`}>
      <div className="bs-summary-icon">
        <Icon size={22} strokeWidth={2} />
      </div>
      <div className="bs-summary-text">
        <span className="bs-summary-label">{label}</span>
        <span className="bs-summary-value">{value}</span>
      </div>
    </div>
  );
}

export default SummaryCard;