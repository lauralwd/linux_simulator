import React from "react";

interface HeaderProps {
  dark: boolean;
  setDark: (dark: boolean) => void;
}

const Header: React.FC<HeaderProps> = ({ dark, setDark }) => (
  <header>
    <h1>Linux Navigation Simulator</h1>
    <div className="controls">
      <button onClick={() => setDark((d) => !d)} aria-label="Toggle dark mode">
        {dark ? "🌞 Light" : "🌙 Dark"}
      </button>
    </div>
    <p className="app-description">
      This interactive tool helps beginners explore Linux command line navigation. The directory tree on the left visually represents the filesystem you explore using the terminal on the right. Practice fundamental commands like <code>cd</code>, <code>ls</code>, and <code>pwd</code> to navigate this simulated environment. Real-time feedback and guided exercises support your learning and build confidence for working in real Linux systems.
    </p>
  </header>
);

export default Header;