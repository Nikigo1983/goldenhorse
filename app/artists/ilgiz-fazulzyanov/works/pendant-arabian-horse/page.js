"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import fazulzyanov2Image from "../../../../../Fazulzyanov2.webp";

export default function IlgizPendantWorkPage() {
  const [openPreview, setOpenPreview] = useState(false);
  const [openEnquiry, setOpenEnquiry] = useState(false);
  const [openShare, setOpenShare] = useState(false);
  const shareRef = useRef(null);
  const shareUrl = typeof window !== "undefined" ? window.location.href : "";
  const shareTitle = encodeURIComponent("Pendant Arabian Horse from the Arabesques collection");
  const encodedUrl = encodeURIComponent(shareUrl);

  useEffect(() => {
    if (!openShare) return;

    const onPointerDown = (event) => {
      if (!shareRef.current?.contains(event.target)) {
        setOpenShare(false);
      }
    };

    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [openShare]);

  return (
    <>
      <section className="section page-section artist-work-detail-page">
        <div className="artist-work-detail-grid">
          <aside className="artist-work-detail-meta">
            <h1>ILGIZ FAZULZYANOV</h1>
            <h2>Pendant Arabian Horse from the Arabesques collection</h2>
            <p>Gold 18 carat</p>
            <p>Weight 53.21</p>
            <p>Diamonds round 260 pcs 1.62 ct</p>
            <p>Diamonds bagets 14 pcs 1.26 ct</p>
            <p>Sapphires 1.62 ct</p>
            <p>Sapphirin 57.8 ct</p>
            <p>Hot enamel</p>
            <p>Copyright The Artist</p>

            <button
              type="button"
              className="artist-work-enquire-btn"
              onClick={() => setOpenEnquiry(true)}
            >
              Enquire
            </button>

            <div className="artist-work-share-wrap" ref={shareRef}>
              <button type="button" className="artist-work-share-btn" onClick={() => setOpenShare((v) => !v)}>
                +Share
              </button>
              {openShare ? (
                <div className="artist-work-share-menu">
                  <a
                    href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => setOpenShare(false)}
                  >
                    <span>f</span> Facebook
                  </a>
                  <a
                    href={`https://twitter.com/intent/tweet?url=${encodedUrl}&text=${shareTitle}`}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => setOpenShare(false)}
                  >
                    <span>X</span> X
                  </a>
                  <a
                    href={`https://pinterest.com/pin/create/button/?url=${encodedUrl}&media=${encodeURIComponent(
                      fazulzyanov2Image.src
                    )}&description=${shareTitle}`}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => setOpenShare(false)}
                  >
                    <span>P</span> Pinterest
                  </a>
                  <a
                    href={`https://www.tumblr.com/widgets/share/tool?canonicalUrl=${encodedUrl}&title=${shareTitle}`}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => setOpenShare(false)}
                  >
                    <span>t</span> Tumblr
                  </a>
                  <a href={`mailto:?subject=${shareTitle}&body=${encodedUrl}`} onClick={() => setOpenShare(false)}>
                    <span>@</span> Email
                  </a>
                </div>
              ) : null}
            </div>
          </aside>

          <div className="artist-work-detail-image-wrap">
            <button
              type="button"
              className="artist-work-main-image-button"
              onClick={() => setOpenPreview(true)}
            >
              <img src={fazulzyanov2Image.src} alt="Pendant Arabian Horse from the Arabesques collection" />
            </button>
          </div>
        </div>
      </section>

      {openPreview ? (
        <div className="artist-lightbox-overlay" role="presentation" onClick={() => setOpenPreview(false)}>
          <div className="artist-lightbox" role="dialog" aria-modal="true" aria-label="Artwork preview" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="artist-lightbox-close"
              aria-label="Close large image view"
              onClick={() => setOpenPreview(false)}
            >
              <span />
              <span />
            </button>
            <img src={fazulzyanov2Image.src} alt="Pendant Arabian Horse from the Arabesques collection large view" />
          </div>
        </div>
      ) : null}

      {openEnquiry ? (
        <div className="enquiry-modal-overlay" role="presentation" onClick={() => setOpenEnquiry(false)}>
          <div
            className="enquiry-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Enquiry form"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="enquiry-modal-close"
              aria-label="Close enquiry form"
              onClick={() => setOpenEnquiry(false)}
            >
              <span />
              <span />
            </button>

            <div className="enquiry-modal-scroll">
              <h2>ENQUIRY FORM</h2>

              <div className="enquiry-art-preview">
                <img src={fazulzyanov2Image.src} alt="Pendant Arabian Horse from the Arabesques collection" />
                <p>Pendant Arabian Horse from the Arabesques collection</p>
              </div>

              <form className="enquiry-form">
                <label>
                  Name *
                  <input type="text" name="name" required />
                </label>
                <label>
                  Email *
                  <input type="email" name="email" required />
                </label>
                <label>
                  Phone
                  <input type="tel" name="phone" />
                </label>
                <label>
                  Message
                  <textarea name="message" rows={7} />
                </label>

                <fieldset>
                  <legend>Receive newsletters *</legend>
                  <label className="radio-inline">
                    <input type="radio" name="newsletter" value="yes" />
                    Yes
                  </label>
                  <label className="radio-inline">
                    <input type="radio" name="newsletter" value="no" />
                    No
                  </label>
                </fieldset>

                <button type="submit" className="enquiry-submit">
                  Send Enquiry
                </button>
              </form>

              <div className="enquiry-footer-note">
                <p>* denotes required fields</p>
                <p>
                  In order to respond to your enquiry, we will process the personal data you have
                  supplied to communicate with you in accordance with our{" "}
                  <Link href="/privacy">Privacy Policy</Link>.
                </p>
                <p>
                  You can unsubscribe or change your preferences at any time by clicking the link
                  in our emails.
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
