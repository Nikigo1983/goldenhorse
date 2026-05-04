"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import hemrayev2Image from "../../../../../HEMRAYEV2.webp";
import hemrayev3Image from "../../../../../HEMRAYEV3.webp";
import hemrayev4Image from "../../../../../HEMRAYEV4.webp";
import hemrayev5Image from "../../../../../HEMRAYEV5.webp";
import hemrayev6Image from "../../../../../HEMRAYEV6.webp";
import hemrayev7Image from "../../../../../HEMRAYEV7.webp";

const works = [
  {
    slug: "arabian-stallion-111x111cm-2025",
    title: "Arabian stallion, 111x111cm, 2025",
    images: [hemrayev2Image.src],
    details: [
      "Wooden base, threads, wooden frame",
      "43 3/4 x 43 3/4 in",
      "111 x 111 cm",
      "$ 3,500.00",
    ],
  },
  {
    slug: "stallion-111x111cm-2025",
    title: "Stallion, 111x111cm, 2025",
    images: [
      hemrayev3Image.src,
      hemrayev4Image.src,
      hemrayev5Image.src,
      hemrayev6Image.src,
      hemrayev7Image.src,
    ],
    details: ["Copyright The Artist", "$ 3,000.00"],
  },
];

export default function HemrayevWorkDetailPage() {
  const router = useRouter();
  const params = useParams();
  const slug = typeof params?.slug === "string" ? params.slug : "";
  const workIndex = useMemo(() => works.findIndex((item) => item.slug === slug), [slug]);
  const work = useMemo(() => works.find((item) => item.slug === slug) ?? null, [slug]);

  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [openEnquiry, setOpenEnquiry] = useState(false);
  const [openShare, setOpenShare] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImageIdx, setLightboxImageIdx] = useState(0);
  const shareRef = useRef(null);

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

  useEffect(() => {
    setActiveImageIdx(0);
  }, [slug]);

  if (!work) {
    return (
      <section className="section page-section artist-work-detail-page">
        <p>Work not found.</p>
      </section>
    );
  }

  const activeImage = work.images[activeImageIdx] ?? work.images[0];
  const shareUrl = typeof window !== "undefined" ? window.location.href : "";
  const shareTitle = encodeURIComponent(work.title);
  const encodedUrl = encodeURIComponent(shareUrl);

  const goToWorkByOffset = (offset) => {
    const total = works.length;
    const nextIndex = (workIndex + offset + total) % total;
    const nextWork = works[nextIndex];
    if (nextWork) {
      router.push(`/artists/atajan-hemrayev/works/${nextWork.slug}`);
    }
  };

  const moveLightbox = (offset) => {
    const total = work.images.length;
    const next = (lightboxImageIdx + offset + total) % total;
    setLightboxImageIdx(next);
  };

  return (
    <>
      <section className="section page-section artist-work-detail-page">
        <button type="button" className="artist-work-detail-close" onClick={() => window.history.back()}>
          <span />
          <span />
        </button>

        <div className="artist-work-detail-grid">
          <aside className="artist-work-detail-meta">
            <h1>ATAJAN HEMRAYEV</h1>
            <h2>{work.title}</h2>
            {work.details.map((line) => (
              <p key={line}>{line}</p>
            ))}

            <button type="button" className="artist-work-enquire-btn" onClick={() => setOpenEnquiry(true)}>
              Enquire
            </button>

            {work.images.length > 1 ? (
              <div className="artist-work-further">
                <h3>Further images</h3>
                <div className="artist-work-thumbs">
                  {work.images.map((image, idx) => (
                    <button
                      key={`${work.slug}-${idx + 1}`}
                      type="button"
                      onClick={() => setActiveImageIdx(idx)}
                      className={idx === activeImageIdx ? "is-active" : ""}
                      aria-label={`View a larger image of thumbnail ${idx + 1}${idx === activeImageIdx ? ", currently selected." : "."}`}
                    >
                      <img src={image} alt={`${work.title} angle ${idx + 1}`} />
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="artist-work-share-wrap" ref={shareRef}>
              <button type="button" className="artist-work-share-btn" onClick={() => setOpenShare((v) => !v)}>
                +Share
              </button>
              {openShare ? (
                <div className="artist-work-share-menu">
                  <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`} target="_blank" rel="noreferrer">
                    <span>f</span> Facebook
                  </a>
                  <a href={`https://twitter.com/intent/tweet?url=${encodedUrl}&text=${shareTitle}`} target="_blank" rel="noreferrer">
                    <span>X</span> X
                  </a>
                  <a
                    href={`https://pinterest.com/pin/create/button/?url=${encodedUrl}&media=${encodeURIComponent(
                      activeImage
                    )}&description=${shareTitle}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <span>P</span> Pinterest
                  </a>
                  <a href={`https://www.tumblr.com/widgets/share/tool?canonicalUrl=${encodedUrl}&title=${shareTitle}`} target="_blank" rel="noreferrer">
                    <span>t</span> Tumblr
                  </a>
                  <a href={`mailto:?subject=${shareTitle}&body=${encodedUrl}`}>
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
              onClick={() => {
                setLightboxImageIdx(activeImageIdx);
                setLightboxOpen(true);
              }}
            >
              <img src={activeImage} alt={work.title} />
            </button>
            <button
              type="button"
              className="artist-work-nav artist-work-nav-prev"
              aria-label="Previous artwork"
              onClick={() => goToWorkByOffset(-1)}
            >
              <span />
            </button>
            <button
              type="button"
              className="artist-work-nav artist-work-nav-next"
              aria-label="Next artwork"
              onClick={() => goToWorkByOffset(1)}
            >
              <span />
            </button>
          </div>
        </div>
      </section>

      {openEnquiry ? (
        <div className="enquiry-modal-overlay" role="presentation" onClick={() => setOpenEnquiry(false)}>
          <div className="enquiry-modal" role="dialog" aria-modal="true" aria-label="Enquiry form" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="enquiry-modal-close" aria-label="Close enquiry form" onClick={() => setOpenEnquiry(false)}>
              <span />
              <span />
            </button>
            <div className="enquiry-modal-scroll">
              <h2>ENQUIRY FORM</h2>
              <div className="enquiry-art-preview">
                <img src={work.images[0]} alt={work.title} />
                <p>{work.title}</p>
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

      {lightboxOpen ? (
        <div className="artist-lightbox-overlay" role="presentation" onClick={() => setLightboxOpen(false)}>
          <div className="artist-lightbox" role="dialog" aria-modal="true" aria-label="Artwork gallery" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="artist-lightbox-close" aria-label="Close large image view" onClick={() => setLightboxOpen(false)}>
              <span />
              <span />
            </button>
            {work.images.length > 1 ? (
              <button type="button" className="artist-lightbox-nav artist-lightbox-nav-prev" onClick={() => moveLightbox(-1)}>
                <span />
              </button>
            ) : null}
            <img src={work.images[lightboxImageIdx]} alt={`${work.title} large view`} />
            {work.images.length > 1 ? (
              <button type="button" className="artist-lightbox-nav artist-lightbox-nav-next" onClick={() => moveLightbox(1)}>
                <span />
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
