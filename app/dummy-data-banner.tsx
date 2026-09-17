export default function DummyDataBanner() {
  return (
    <div className="banner">
      <span className="banner-text">
        <strong>Sample data, not live prices.</strong> Real-time pricing costs
        money per search — we&apos;re trying to run this free of charge, so
        the numbers below illustrate the product rather than today&apos;s
        actual fares.
      </span>
      <span className="banner-badge">$0 spent · sample mode</span>
    </div>
  );
}
