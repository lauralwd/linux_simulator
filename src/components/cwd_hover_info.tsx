import React from "react";

interface CwdHoverInfoProps {
  cwd: string;
  hovered: string | null;
  cdInfo: { abs: string; rel: string; valid: boolean } | null;
}

const CwdHoverInfo: React.FC<CwdHoverInfoProps> = ({ cwd, hovered, cdInfo }) => (
  <div className="info-block">
    <div className="section">
      <div className="label">Current working directory (<code>pwd</code>):</div>
      <pre className="code-block">{cwd}</pre>
    </div>
    <div className="section">
      <div className="label">Hover target:</div>
      {hovered ? (
        <>
          <pre className="code-block">{hovered}</pre>
          <div className="subsection">
            {cdInfo?.valid ? (
              <>
                <div><strong>Absolute:</strong> <code>{cdInfo.abs}</code></div>
                <div><strong>Relative:</strong> <code>{cdInfo.rel}</code></div>
              </>
            ) : (
              <>
                <div><strong>Note:</strong> target is a file, not a directory.</div>
                <div><strong>To go to its containing directory:</strong> <code>{cdInfo?.rel}</code></div>
              </>
            )}
          </div>
        </>
      ) : (
        <div className="muted">Hover over a node to see how to cd to it.</div>
      )}
      <p className="path-note">
        <strong>Note:</strong> Absolute paths start with <code>/</code> and specify the full location from the root. Relative paths are based on your current directory.
      </p>
    </div>
  </div>
);

export default CwdHoverInfo;