"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { luchanovWorksData } from "../../artists/dmitry-luchanov/works/luchanovWorksData";

const worksBasePath = "/artists/dmitry-luchanov/works";

export default function PaintingWorksPage() {
  const [selectedWorkId, setSelectedWorkId] = useState(null);
  const selectedWork = useMemo(
    () => luchanovWorksData.find((w) => w.id === selectedWorkId) ?? null,
    [selectedWorkId]
  );

  return (
    <>
      <section className="section page-section artist-works-page">
        <h1 className="category-landing-title">PAINTING</h1>

        <div className="artist-works-grid">
          {luchanovWorksData.map((work) => (
            <article key={work.id} className={`artist-works-card ${work.cardClass}`}>
              <Link href={`${worksBasePath}/${work.slug}`} className="artist-work-image-link">
                <img src={work.images[0]} alt={work.title} />
                {work.sold ? <span className="artist-work-sold-badge">Sold</span> : null}
              </Link>
              <h3>{`Dmitry Luchanov, ${work.title}`}</h3>
              <button
                type="button"
                className="artist-work-enquire-btn"
                onClick={() => setSelectedWorkId(work.id)}
              >
                Enquire
              </button>
            </article>
          ))}
        </div>
      </section>

      {selectedWork ? (
        <div className="enquiry-modal-overlay" role="presentation" onClick={() => setSelectedWorkId(null)}>
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
              onClick={() => setSelectedWorkId(null)}
            >
              <span />
              <span />
            </button>

            <div className="enquiry-modal-scroll">
              <h2>ENQUIRY FORM</h2>

              <div className="enquiry-art-preview">
                <img src={selectedWork.images[0]} alt={selectedWork.title} />
                <p>{selectedWork.title}</p>
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
                  In order to respond to your enquiry, we will process the personal data you have supplied to
                  communicate with you in accordance with our <Link href="/privacy">Privacy Policy</Link>.
                </p>
                <p>You can unsubscribe or change your preferences at any time by clicking the link in our emails.</p>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
