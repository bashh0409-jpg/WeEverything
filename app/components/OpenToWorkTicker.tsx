const tickerTexts = ["DEVELOPER", "DESIGNER", "PHOTOGRAPHER", "ILLUSTRATOR"];

const tickerItems = Array.from({ length: 16 }, (_, index) => (
  <span key={index}>{tickerTexts[index % tickerTexts.length]}</span>
));

const OpenToWorkTicker = () => {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-2 z-30 overflow-hidden whitespace-nowrap">
      <div className="ticker-track mono inline-flex w-max items-center  font-normal text-[#1c40f2]">
        <div aria-hidden="true" className="inline-flex items-center">
          {tickerItems}
        </div>
        <div aria-hidden="true" className="inline-flex items-center">
          {tickerItems}
        </div>
      </div>
    </div>
  );
};

export default OpenToWorkTicker;
