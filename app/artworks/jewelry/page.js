"use client";

import Link from "next/link";
import { useState } from "react";
import fazulzyanov2Image from "../../../Fazulzyanov2.webp";

const jewelryWork = {
  title: "Ilgiz Fazulzyanov, Pendant Arabian Horse from the Arabesques collection",
  image: fazulzyanov2Image.src,
  href: "/artists/ilgiz-fazulzyanov/works/pendant-arabian-horse",
};

export default function JewelryWorksPage() {
  const [openEnquiry, setOpenEnquiry] = useState(false);

  return (
    <>
      <section className="section page-section artist-works-page">
        <h1 className="category-landing-title">JEWELRY ART</h1>

        <div className="artist-works-grid">
          <article className="artist-works-card is-portrait">
            <Link href={jewelryWork.href}>
              <img src={jewelryWork.image} alt={jewelryWork.title} />
            </Link>
            <h3>{jewelryWork.title}</h3>
            <button type="button" onClick={() => setOpenEnquiry(true)}>
              Enquire
            </button>
          </article>
        </div>
      </section>

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
                <img src={jewelryWork.image} alt={jewelryWork.title} />
                <p>{jewelryWork.title}</p>
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
