"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { worksData } from "./worksData";

export default function ArturBaboevWorksPage() {
  const pathname = usePathname();
  const [selectedWorkId, setSelectedWorkId] = useState(null);
  const selectedWork = useMemo(() => worksData.find((w) => w.id === selectedWorkId) ?? null, [selectedWorkId]);
  const worksBasePath = pathname?.includes("/artists/25-artur-baboev/works/2-photography")
    ? "/artists/25-artur-baboev/works/2-photography"
    : "/artists/artur-baboev/works";

  return (
    <>
      <section className="section page-section artist-works-page">
        <h1 className="artist-detail-name">ARTUR BABOEV</h1>

        <nav className="artist-detail-tabs">
          <Link href="/artists/artur-baboev">Biography</Link>
          <a href="#works" className="is-active">
            Works
          </a>
          <Link href="/artists">
            Browse Artists
          </Link>
        </nav>

        <div id="works" className="artist-works-header">
          <h2>PHOTOGRAPHY</h2>
          <p>View all categories</p>
        </div>

        <div className="artist-works-grid">
          {worksData.map((work) => (
            <article key={work.id} className={`artist-works-card ${work.cardClass}`}>
              <Link href={`${worksBasePath}/${work.slug}`}>
                <img src={work.images[0]} alt={work.title} />
              </Link>
              <h3>{work.title}</h3>
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
          <div className="enquiry-modal" role="dialog" aria-modal="true" aria-label="Enquiry form" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="enquiry-modal-close" aria-label="Close enquiry form" onClick={() => setSelectedWorkId(null)}>
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
