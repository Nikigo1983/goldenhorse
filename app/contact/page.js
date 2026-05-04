export default function ContactPage() {
  return (
    <section className="section page-section contact-page">
      <div className="contact-panel">
        <h1 className="contact-title">CONTACT</h1>
        <p className="contact-subtitle">GET IN TOUCH WITH THE GALLERY</p>

        <div className="contact-person-block">
          <p className="contact-label">CONTACT PERSON</p>
          <p className="contact-person-name">Daria Tretskova</p>
          <p className="contact-person-email">tretskova@goldenhorse.art</p>
          <p className="contact-person-note">
            Co-owner of the art gallery, Art manager, Art producer, horse rider.
          </p>
        </div>

        <div className="contact-grid">
          <article className="contact-item">
            <span className="contact-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" role="presentation">
                <path d="M12 2.6a7 7 0 0 0-7 7c0 5.3 7 11.8 7 11.8s7-6.5 7-11.8a7 7 0 0 0-7-7Zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5Z" />
              </svg>
            </span>
            <p className="contact-item-label">LOCATION</p>
            <p className="contact-item-value">Dubai, UAE</p>
          </article>

          <article className="contact-item">
            <span className="contact-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" role="presentation">
                <path d="M3 5h18v14H3V5Zm2.3 2L12 12l6.7-5H5.3Zm13.7 10V9.1l-7 5.2-7-5.2V17h14Z" />
              </svg>
            </span>
            <p className="contact-item-label">EMAIL</p>
            <p className="contact-item-value">
              <a href="mailto:info@goldenhorse.art">info@goldenhorse.art</a>
            </p>
          </article>

          <article className="contact-item">
            <span className="contact-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" role="presentation">
                <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm5.3 14.5c-.2.6-1 1-1.6 1.1-.4.1-.9.2-3-.7-2.5-1.1-4.2-3.9-4.4-4.1-.2-.3-1-1.3-1-2.5 0-1.2.6-1.8.9-2 .4-.4.8-.5 1-.5h.8c.2 0 .5 0 .8.6.2.5.8 1.9.8 2.1.1.2.1.4 0 .6-.1.2-.2.3-.4.5-.2.2-.3.3-.4.5-.2.2-.3.4-.1.7.2.3.9 1.5 2 2.4 1.4 1.2 2.6 1.5 3 1.6.3.1.5.1.7-.1.2-.2.8-.9 1-1.2.2-.3.5-.2.8-.1.3.1 1.8.8 2.1 1 .4.2.6.3.7.4.1.1.1.7-.1 1.3Z" />
              </svg>
            </span>
            <p className="contact-item-label">PHONE / WHATSAPP</p>
            <p className="contact-item-value">
              <a href="https://wa.me/971552308228" target="_blank" rel="noreferrer">
                +971 55 230 8228
              </a>
            </p>
          </article>

          <article className="contact-item">
            <span className="contact-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" role="presentation">
                <path d="M7.5 2h9A5.5 5.5 0 0 1 22 7.5v9A5.5 5.5 0 0 1 16.5 22h-9A5.5 5.5 0 0 1 2 16.5v-9A5.5 5.5 0 0 1 7.5 2Zm0 2A3.5 3.5 0 0 0 4 7.5v9A3.5 3.5 0 0 0 7.5 20h9a3.5 3.5 0 0 0 3.5-3.5v-9A3.5 3.5 0 0 0 16.5 4h-9Zm9.8 1.7a1.2 1.2 0 1 1 0 2.4 1.2 1.2 0 0 1 0-2.4ZM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z" />
              </svg>
            </span>
            <p className="contact-item-label">SOCIAL MEDIA</p>
            <p className="contact-item-value">
              <a
                href="https://www.instagram.com/the_golden_horse_dubai"
                target="_blank"
                rel="noreferrer"
              >
                Instagram
              </a>
            </p>
          </article>
        </div>

        <p className="contact-bottom-note">
          For collaborations, commissions or bespoke artworks, please contact us by email, phone
          or Instagram
        </p>
      </div>
    </section>
  );
}
