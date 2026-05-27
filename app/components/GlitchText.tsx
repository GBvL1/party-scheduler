"use client";

import { useState, useEffect } from "react";

const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#@!%?/\\|<>*^~";

export function GlitchText({
  text,
  delay = 0,
  speed = 28,
  className,
}: {
  text: string;
  delay?: number;
  speed?: number;
  className?: string;
}) {
  const [displayed, setDisplayed] = useState(() =>
    text.split("").map((c) =>
      c === " " ? " " : CHARS[Math.floor(Math.random() * CHARS.length)]
    ).join("")
  );

  useEffect(() => {
    let frame = 0;
    const totalFrames = text.length * 4;

    const start = setTimeout(() => {
      const interval = setInterval(() => {
        setDisplayed(
          text.split("").map((char, idx) => {
            if (char === " ") return " ";
            if (idx < frame / 4) return char;
            return CHARS[Math.floor(Math.random() * CHARS.length)];
          }).join("")
        );
        frame++;
        if (frame > totalFrames) {
          clearInterval(interval);
          setDisplayed(text);
        }
      }, speed);

      return () => clearInterval(interval);
    }, delay);

    return () => clearTimeout(start);
  }, [text, delay, speed]);

  return <span className={className}>{displayed}</span>;
}
