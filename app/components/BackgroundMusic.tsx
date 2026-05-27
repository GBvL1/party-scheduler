"use client";

import { useEffect, useRef } from "react";

// Streams theme.mp3 via HTML5 Audio, routes through Web Audio gain for volume.
// Starts on the first user click anywhere (browser autoplay policy).
export function BackgroundMusic() {
  const startedRef = useRef(false);

  useEffect(() => {
    const audio = new Audio("/music/theme.mp3");
    audio.loop = true;
    audio.volume = 1; // volume controlled by gain node below
    audio.preload = "auto";

    const actx = new AudioContext();
    const source = actx.createMediaElementSource(audio);
    const gain = actx.createGain();
    gain.gain.value = 0.15;
    source.connect(gain);
    gain.connect(actx.destination);

    function start() {
      if (startedRef.current) return;
      startedRef.current = true;
      document.removeEventListener("click", start);
      actx.resume().then(() => audio.play().catch(() => {}));
    }

    document.addEventListener("click", start);

    return () => {
      document.removeEventListener("click", start);
      audio.pause();
      audio.src = "";
      actx.close();
    };
  }, []);

  return null;
}
