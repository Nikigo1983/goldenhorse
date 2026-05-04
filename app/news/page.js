 "use client";

import { useState } from "react";
import servicesImageOne from "../../services1.webp";
import servicesImageTwo from "../../services2.webp";

export default function NewsPage() {
  const [activeImage, setActiveImage] = useState(servicesImageTwo.src);

  return (
    <section className="section page-section services-page">
      <div className="services-grid">
        <article className="services-copy">
          <h1 className="services-title">THE GOLDEN HORSE</h1>
          <h2 className="services-subtitle">Equine Art Photography by Artur Baboev</h2>
          <div className="services-divider" />

          <p className="services-lead">
            Are you a horse owner? Are you a horse breeder? Are you a horse rider?
          </p>

          <p>
            Book the professional photo shooting by renowned art photographer{" "}
            <strong>Artur Baboev @artur_baboev</strong>.
          </p>

          <p>
            For more than 18 years of his life spent with horses in expeditions all over the
            world, he has participated in more than 20 international contests and exhibitions and
            published three bestsellers in English, German and Chinese about legendary Akhal-Teke
            horses.
          </p>

          <h3 className="services-why-title">WHY SHOULD YOU?</h3>
          <div className="services-why-divider" />

          <p>
            Create your legacy, your status with professional portfolio, art photo for your
            content, personal photo session with beloved horses, personalized interior with bespoke
            art works made of photo with your horses.
          </p>

          <p className="services-contact-title">
            To book a photo shooting contact The Golden Horse Gallery:
          </p>
          <p>+ 971 55 230 8228 @the_golden_horse_dubai</p>

          <p className="services-direct-title">or directly the photographer:</p>
          <p>+7 925 117 76 01 @artur_baboev.</p>
        </article>

        <aside className="services-media" aria-label="Service photos">
          <img src={activeImage} alt="Horse photography service preview" />
          <div className="services-thumbs">
            <button
              type="button"
              className={`services-thumb-button ${
                activeImage === servicesImageOne.src ? "is-active" : ""
              }`}
              onClick={() => setActiveImage(servicesImageOne.src)}
              aria-label="Show first service photo"
            >
              <img src={servicesImageOne.src} alt="Horse photography thumbnail one" />
            </button>
            <button
              type="button"
              className={`services-thumb-button ${
                activeImage === servicesImageTwo.src ? "is-active" : ""
              }`}
              onClick={() => setActiveImage(servicesImageTwo.src)}
              aria-label="Show second service photo"
            >
              <img src={servicesImageTwo.src} alt="Horse photography thumbnail two" />
            </button>
          </div>
        </aside>
      </div>
    </section>
  );
}
