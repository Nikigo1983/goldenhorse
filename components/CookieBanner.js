"use client";

import { useEffect, useState } from "react";

const COOKIE_KEY = "goldenhorse-cookie-settings";

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);
  const [openManage, setOpenManage] = useState(false);
  const [prefs, setPrefs] = useState({
    functional: true,
    stats: true,
    marketing: true,
  });

  useEffect(() => {
    const saved = window.localStorage.getItem(COOKIE_KEY);
    if (!saved) setVisible(true);

    const openPreferences = () => {
      setVisible(true);
      setOpenManage(true);
    };

    window.addEventListener("open-cookie-preferences", openPreferences);
    return () => window.removeEventListener("open-cookie-preferences", openPreferences);
  }, []);

  const save = (value) => {
    window.localStorage.setItem(COOKIE_KEY, JSON.stringify(value));
    setVisible(false);
    setOpenManage(false);
  };

  if (!visible) return null;

  if (openManage) {
    return (
      <div className="cookie-modal-overlay" role="presentation">
        <div className="cookie-modal" role="dialog" aria-modal="true" aria-label="Cookie preferences">
          <button
            type="button"
            className="cookie-modal-close"
            aria-label="Close cookie preferences"
            onClick={() => {
              setOpenManage(false);
              setVisible(false);
            }}
          >
            <span />
            <span />
          </button>

          <p className="cookie-modal-title">Cookie preferences</p>
          <p className="cookie-modal-text">
            Check the boxes for the cookie categories you allow our site to use
          </p>
          <p className="cookie-modal-subtitle">Cookie options</p>

          <div className="cookie-modal-options">
            <label className="cookie-modal-option">
              <input type="checkbox" checked disabled />{" "}
              <span className="cookie-modal-option-title">Strictly necessary</span>
              <span className="cookie-modal-option-description">
                Required for the website to function and cannot be disabled.
              </span>
            </label>

            <label className="cookie-modal-option">
              <input
                type="checkbox"
                checked={prefs.functional}
                onChange={(e) => setPrefs((p) => ({ ...p, functional: e.target.checked }))}
              />{" "}
              <span className="cookie-modal-option-title">Preferences and functionality</span>
              <span className="cookie-modal-option-description">
                Improve your experience on the website by storing choices you make about how it
                should function.
              </span>
            </label>

            <label className="cookie-modal-option">
              <input
                type="checkbox"
                checked={prefs.stats}
                onChange={(e) => setPrefs((p) => ({ ...p, stats: e.target.checked }))}
              />{" "}
              <span className="cookie-modal-option-title">Statistics</span>
              <span className="cookie-modal-option-description">
                Allow us to collect anonymous usage data in order to improve the experience on our
                website.
              </span>
            </label>

            <label className="cookie-modal-option">
              <input
                type="checkbox"
                checked={prefs.marketing}
                onChange={(e) => setPrefs((p) => ({ ...p, marketing: e.target.checked }))}
              />{" "}
              <span className="cookie-modal-option-title">Marketing</span>
              <span className="cookie-modal-option-description">
                Allow us to identify our visitors so that we can offer personalised, targeted
                marketing.
              </span>
            </label>
          </div>

          <button type="button" className="cookie-modal-save" onClick={() => save(prefs)}>
            Save preferences
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="cookie-banner">
      <p className="cookie-title">Cookie Preferences</p>
      <p className="cookie-text">
        We use cookies for essential site functionality and optional analytics.
      </p>

      {openManage && (
        <div className="cookie-options">
          <label>
            <input type="checkbox" checked disabled /> Strictly necessary (always on)
          </label>
          <label>
            <input
              type="checkbox"
              checked={prefs.functional}
              onChange={(e) => setPrefs((p) => ({ ...p, functional: e.target.checked }))}
            />
            Preferences and functionality
          </label>
          <label>
            <input
              type="checkbox"
              checked={prefs.stats}
              onChange={(e) => setPrefs((p) => ({ ...p, stats: e.target.checked }))}
            />
            Statistics
          </label>
          <label>
            <input
              type="checkbox"
              checked={prefs.marketing}
              onChange={(e) => setPrefs((p) => ({ ...p, marketing: e.target.checked }))}
            />
            Marketing
          </label>
        </div>
      )}

      <div className="cookie-actions">
        <button onClick={() => save({ functional: true, stats: true, marketing: true })}>
          Accept
        </button>
        <button onClick={() => save({ functional: true, stats: false, marketing: false })}>
          Reject non essential
        </button>
        {!openManage ? (
          <button onClick={() => setOpenManage(true)}>Manage cookies</button>
        ) : (
          <button onClick={() => save(prefs)}>Save preferences</button>
        )}
      </div>
    </div>
  );
}
