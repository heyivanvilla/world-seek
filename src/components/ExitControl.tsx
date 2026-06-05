"use client";

import { useState } from "react";

interface Props {
  isGameMaster: boolean;
  onLeave: () => void;
  onClose: () => void;
}

/**
 * A small fixed corner button for exiting a game. The host closes the game for
 * everyone; everyone else just leaves. Either way a confirmation dialog guards
 * against accidental taps before anything happens.
 */
export default function ExitControl({ isGameMaster, onLeave, onClose }: Props) {
  const [confirming, setConfirming] = useState(false);

  return (
    <>
      <button
        className="secondary exit-control"
        onClick={() => setConfirming(true)}
      >
        {isGameMaster ? "Close game" : "Leave"}
      </button>

      {confirming && (
        <div className="modal-backdrop" onClick={() => setConfirming(false)}>
          <div
            className="modal stack"
            style={{ width: 400, gap: 18 }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="ghost modal-x"
              onClick={() => setConfirming(false)}
              aria-label="Cancel"
            >
              ✕
            </button>
            <h2 className="title" style={{ fontSize: 24 }}>
              {isGameMaster ? "Close game?" : "Leave game?"}
            </h2>
            <p className="muted" style={{ margin: 0 }}>
              {isGameMaster
                ? "This ends the game for everyone and sends all players back to the home page."
                : "You'll go back to the home page. The other players keep playing."}
            </p>
            <div className="row" style={{ gap: 10, justifyContent: "flex-end" }}>
              <button className="secondary" onClick={() => setConfirming(false)}>
                Cancel
              </button>
              <button onClick={isGameMaster ? onClose : onLeave}>
                {isGameMaster ? "Close game for everyone" : "Leave game"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
