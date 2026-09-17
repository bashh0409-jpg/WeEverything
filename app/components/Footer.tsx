import React, { useEffect, useState } from 'react'

const endOfProfilesEmojis = ["🙈", "👀", "🥶", "🤦🏻‍♂️"];

const Footer = () => {
  const [endOfProfilesEmoji, setEndOfProfilesEmoji] = useState(
      endOfProfilesEmojis[0],
  );
    useEffect(() => {
      let emojiIndex = 0;
      const interval = window.setInterval(() => {
        emojiIndex = (emojiIndex + 1) % endOfProfilesEmojis.length;
        setEndOfProfilesEmoji(endOfProfilesEmojis[emojiIndex]);
      }, 1_500);
  
      return () => window.clearInterval(interval);
    }, []);
  
  return (
    <div className="flex w-full flex-col items-center justify-center gap-2 py-10">
      <footer className="flex w-full flex-col items-center justify-center ">
        <span aria-label="Rotating profile ending" role="img">
          {endOfProfilesEmoji}
        </span>
        <p className="blue mono tracking-tight">©WeEverything.xyz 2026</p>
        <p className="text-xs mono font-medium uppercase tracking-tight">
          All rights reserved.
        </p>
      </footer>
    </div>
  );
}

export default Footer