import { useEffect, useState } from "react";

export function NightToggle() {
  const [on, setOn] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("night") === "1";
    setOn(saved);
    document.documentElement.classList.toggle("dark", saved);
  }, []);

  function toggle() {
    const next = !on;
    setOn(next);
    localStorage.setItem("night", next ? "1" : "0");
    document.documentElement.classList.toggle("dark", next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="fixed right-4 top-4 z-40 rounded-full border border-white/40 bg-white/50 px-3 py-2 text-xs font-semibold text-gray-900 shadow backdrop-blur-xl dark:bg-white/10 dark:text-white"
    >
      {on ? "Modo dia" : "Modo noche"}
    </button>
  );
}
